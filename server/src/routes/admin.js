import { createHash } from "node:crypto";

const normalizeEmail=value=>String(value||"").trim().toLowerCase();
const hashValue=value=>createHash("sha256").update(String(value)).digest("hex");
const genericRecoveryMessage="If the administrator email is registered, a password reset link will be sent shortly.";

export function registerAdminRoutes(app,{db,adminAuth,adminTokenFor,adminEmail,adminPasswordHash,bcrypt,randomBytes,sendAdminPasswordResetEmail,frontendUrl}) {
  const configuredEmail=normalizeEmail(adminEmail);

  app.post("/api/admin/auth/login",async(req,res)=>{
    try {
      const email=normalizeEmail(req.body?.email);
      const password=String(req.body?.password||"");
      if(!configuredEmail||!process.env.ADMIN_JWT_SECRET)return res.status(503).json({error:"Administrator sign-in has not been configured yet.",code:"ADMIN_AUTH_NOT_CONFIGURED"});
      if(!email||!password||password.length>128)return res.status(400).json({error:"Enter your administrator email and password."});
      const database=await db();
      const credential=await database.collection("admin_credentials").findOne({id:"primary-admin"});
      const activePasswordHash=credential?.passwordHash||adminPasswordHash;
      if(!activePasswordHash)return res.status(503).json({error:"Administrator sign-in has not been configured yet.",code:"ADMIN_AUTH_NOT_CONFIGURED"});
      const passwordMatches=await bcrypt.compare(password,activePasswordHash).catch(()=>false);
      if(email!==configuredEmail||!passwordMatches)return res.status(401).json({error:"The administrator email or password is incorrect.",code:"ADMIN_CREDENTIALS_INVALID"});
      const admin={id:"primary-admin",email:configuredEmail,name:"QuickCart Admin"};
      res.setHeader("Cache-Control","no-store");
      res.json({token:adminTokenFor(admin),admin:{email:admin.email,name:admin.name}});
    } catch(error) {
      console.error("Admin sign-in failed:",error?.message||error);
      res.status(500).json({error:"Unable to sign in to administration."});
    }
  });

  app.post("/api/admin/auth/forgot-password",async(req,res)=>{
    const generic=()=>res.status(200).json({message:genericRecoveryMessage});
    try {
      const email=normalizeEmail(req.body?.email);
      if(!email||email!==configuredEmail||!process.env.ADMIN_JWT_SECRET||!sendAdminPasswordResetEmail)return generic();
      const database=await db();
      const activeCredential=await database.collection("admin_credentials").findOne({id:"primary-admin"});
      if(!activeCredential?.passwordHash&&!adminPasswordHash)return generic();
      const now=new Date();
      const ipHash=hashValue(req.ip||req.headers["x-forwarded-for"]||"unknown");
      const emailHash=hashValue(email);
      const attempts=database.collection("admin_password_reset_attempts");
      const recent=await attempts.countDocuments({createdAt:{$gt:new Date(now.getTime()-60*60*1000)},$or:[{emailHash},{ipHash}]});
      if(recent>=3)return generic();
      await attempts.insertOne({emailHash,ipHash,createdAt:now});
      const rawToken=randomBytes(32).toString("hex");
      const tokenHash=hashValue(rawToken);
      const expiresAt=new Date(now.getTime()+15*60*1000);
      await database.collection("admin_password_resets").deleteMany({expiresAt:{$lte:now}});
      await database.collection("admin_password_resets").insertOne({id:"primary-admin",tokenHash,createdAt:now,expiresAt});
      const base=String(frontendUrl||"https://quick-cart-three-chi.vercel.app").replace(/\/$/,"");
      const resetUrl=base+"/admin/reset-password?token="+encodeURIComponent(rawToken);
      await sendAdminPasswordResetEmail(email,resetUrl);
      return generic();
    } catch(error) {
      console.error("Admin password recovery request failed:",error?.message||error);
      return generic();
    }
  });

  app.post("/api/admin/auth/reset-password",async(req,res)=>{
    try {
      const token=String(req.body?.token||"");
      const password=String(req.body?.password||"");
      if(!/^[a-f0-9]{64}$/i.test(token))return res.status(400).json({error:"This reset link is invalid or has expired.",code:"ADMIN_RESET_INVALID"});
      if(password.length<14||password.length>128)return res.status(400).json({error:"Choose a password between 14 and 128 characters.",code:"ADMIN_PASSWORD_POLICY"});
      const database=await db();
      const now=new Date();
      const tokenHash=hashValue(token);
      const reset=await database.collection("admin_password_resets").findOneAndDelete({id:"primary-admin",tokenHash,expiresAt:{$gt:now}});
      if(!reset)return res.status(400).json({error:"This reset link is invalid, expired, or has already been used.",code:"ADMIN_RESET_INVALID"});
      const passwordHash=await bcrypt.hash(password,12);
      await database.collection("admin_credentials").updateOne(
        {id:"primary-admin"},
        {$set:{id:"primary-admin",email:configuredEmail,passwordHash,passwordChangedAt:now}},
        {upsert:true}
      );
      await database.collection("admin_password_resets").deleteMany({id:"primary-admin"});
      res.setHeader("Cache-Control","no-store");
      return res.json({message:"Your administrator password has been updated. You can now sign in with your new password."});
    } catch(error) {
      console.error("Admin password reset failed:",error?.message||error);
      return res.status(500).json({error:"Unable to reset the administrator password. Request a new link and try again."});
    }
  });

  app.get("/api/admin/auth/me",adminAuth,(req,res)=>{
    res.setHeader("Cache-Control","no-store");
    res.json({admin:{email:req.admin.email,name:req.admin.name||"QuickCart Admin"}});
  });

  app.get("/api/admin/overview",adminAuth,async(req,res)=>{
    try {
      const database=await db();
      const [buyers,sellers,stores,products,orders,recentStores,recentOrders]=await Promise.all([
        database.collection("customer_users").countDocuments({}),
        database.collection("users").countDocuments({}),
        database.collection("stores").countDocuments({}),
        database.collection("products").countDocuments({}),
        database.collection("orders").countDocuments({}),
        database.collection("stores").find({}).sort({createdAt:-1}).limit(8).project({id:1,storeName:1,slug:1,userId:1,createdAt:1}).toArray(),
        database.collection("orders").find({}).sort({createdAt:-1}).limit(10).project({id:1,storeId:1,status:1,total:1,createdAt:1,fulfillment:1}).toArray()
      ]);
      const ownerIds=[...new Set(recentStores.map(store=>store.userId).filter(Boolean))];
      const owners=await database.collection("users").find({id:{$in:ownerIds}}).project({id:1,name:1,email:1}).toArray();
      const ownerById=new Map(owners.map(owner=>[owner.id,{name:owner.name||"Seller",email:owner.email||""}]));
      res.setHeader("Cache-Control","no-store");
      res.json({admin:{name:req.admin.name||"QuickCart Admin",email:req.admin.email},metrics:{buyers,sellers,stores,products,orders},recentStores:recentStores.map(store=>({id:store.id,name:store.storeName||"Untitled store",slug:store.slug||"",createdAt:store.createdAt||null,owner:ownerById.get(store.userId)||{name:"Unknown seller",email:""}})),recentOrders:recentOrders.map(order=>({id:order.id,status:order.status||"unknown",total:Number(order.total||0),createdAt:order.createdAt||null,fulfillment:order.fulfillment||"unknown"}))});
    } catch(error) {
      console.error("Admin overview failed:",error?.message||error);
      res.status(500).json({error:"Unable to load platform overview.",code:"ADMIN_OVERVIEW_FAILED"});
    }
  });
}
