const BOOTSTRAP_ADMIN_EMAIL = "adenix271@gmail.com";

export function registerAdminRoutes(app,{db,auth}) {
  const normalizeEmail=value=>String(value||"").trim().toLowerCase();
  async function getAdminContext(req) {
    const email=normalizeEmail(req.user?.email);
    if(!email||!req.user?.sub)return null;
    const database=await db();
    const account=await database.collection("users").findOne({id:req.user.sub,email,emailVerified:true},{projection:{id:1,email:1,name:1}});
    if(!account)return null;
    const isRoot=email===BOOTSTRAP_ADMIN_EMAIL;
    const delegated=!isRoot?await database.collection("admin_access").findOne({userId:account.id}):null;
    if(!isRoot&&!delegated)return null;
    return {database,account,isRoot};
  }
  const denied=(res)=>res.status(403).json({error:"Admin access is not enabled for this account.",code:"ADMIN_FORBIDDEN"});
  app.get("/api/admin/overview",auth,async(req,res)=>{
    try {
      const context=await getAdminContext(req);
      if(!context)return denied(res);
      const {database,account,isRoot}=context;
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
      res.json({admin:{name:account.name,email:account.email,isRoot},metrics:{buyers,sellers,stores,products,orders},recentStores:recentStores.map(store=>({id:store.id,name:store.storeName||"Untitled store",slug:store.slug||"",createdAt:store.createdAt||null,owner:ownerById.get(store.userId)||{name:"Unknown seller",email:""}})),recentOrders:recentOrders.map(order=>({id:order.id,status:order.status||"unknown",total:Number(order.total||0),createdAt:order.createdAt||null,fulfillment:order.fulfillment||"unknown"}))});
    } catch(error) {
      console.error("Admin overview failed:",error?.message||error);
      res.status(500).json({error:"Unable to load platform overview.",code:"ADMIN_OVERVIEW_FAILED"});
    }
  });
  app.get("/api/admin/admins",auth,async(req,res)=>{
    try {
      const context=await getAdminContext(req);
      if(!context)return denied(res);
      if(!context.isRoot)return res.status(403).json({error:"Only the primary admin can manage admin access.",code:"ADMIN_MANAGEMENT_FORBIDDEN"});
      const records=await context.database.collection("admin_access").find({}).sort({grantedAt:-1}).project({userId:1,grantedAt:1,grantedBy:1}).toArray();
      const ids=records.map(item=>item.userId).filter(Boolean);
      const accounts=ids.length?await context.database.collection("users").find({id:{$in:ids},emailVerified:true}).project({id:1,email:1}).toArray():[];
      const accountById=new Map(accounts.map(item=>[item.id,item]));
      const delegated=records.flatMap(item=>{const account=accountById.get(item.userId);return account?[{userId:account.id,email:account.email,isRoot:false,grantedAt:item.grantedAt||null}]:[]});
      res.setHeader("Cache-Control","no-store");
      res.json({admins:[{userId:null,email:BOOTSTRAP_ADMIN_EMAIL,isRoot:true},...delegated]});
    } catch(error) {
      console.error("Admin list failed:",error?.message||error);
      res.status(500).json({error:"Unable to load admin access list."});
    }
  });
  app.post("/api/admin/admins",auth,async(req,res)=>{
    try {
      const context=await getAdminContext(req);
      if(!context)return denied(res);
      if(!context.isRoot)return res.status(403).json({error:"Only the primary admin can grant admin access.",code:"ADMIN_MANAGEMENT_FORBIDDEN"});
      const email=normalizeEmail(req.body?.email);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Enter a valid email address."});
      if(email===BOOTSTRAP_ADMIN_EMAIL)return res.status(409).json({error:"This account is already the primary admin."});
      const target=await context.database.collection("users").findOne({email,emailVerified:true},{projection:{id:1,email:1,name:1}});
      if(!target)return res.status(404).json({error:"No verified seller account was found for that email. The person must register and verify their seller account first."});
      await context.database.collection("admin_access").updateOne({userId:target.id},{$set:{userId:target.id,email:target.email,grantedBy:context.account.email,grantedAt:new Date().toISOString()}},{upsert:true});
      res.status(201).json({admin:{email:target.email,name:target.name||"Seller",isRoot:false}});
    } catch(error) {
      console.error("Grant admin failed:",error?.message||error);
      res.status(500).json({error:"Unable to grant admin access."});
    }
  });
  app.delete("/api/admin/admins/:userId",auth,async(req,res)=>{
    try {
      const context=await getAdminContext(req);
      if(!context)return denied(res);
      if(!context.isRoot)return res.status(403).json({error:"Only the primary admin can revoke admin access.",code:"ADMIN_MANAGEMENT_FORBIDDEN"});
      const userId=String(req.params.userId||"").trim();
      if(!userId||userId.length>128)return res.status(400).json({error:"Invalid administrator account."});
      const target=await context.database.collection("users").findOne({id:userId},{projection:{id:1,email:1}});
      if(!target)return res.status(404).json({error:"That seller account was not found."});
      const result=await context.database.collection("admin_access").deleteOne({userId:target.id});
      if(!result.deletedCount)return res.status(404).json({error:"That admin access record was not found."});
      res.json({ok:true,email:target.email});
    } catch(error) {
      console.error("Revoke admin failed:",error?.message||error);
      res.status(500).json({error:"Unable to revoke admin access."});
    }
  });
}
