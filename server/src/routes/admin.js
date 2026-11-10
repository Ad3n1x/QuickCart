export function registerAdminRoutes(app,{db,auth,adminEmails}) {
  const allowed=new Set(String(adminEmails||"").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean));
  app.get("/api/admin/overview",auth,async(req,res)=>{
    try {
      const email=String(req.user?.email||"").trim().toLowerCase();
      if(!email||!allowed.has(email))return res.status(403).json({error:"Admin access is not enabled for this account.",code:"ADMIN_FORBIDDEN"});
      const database=await db();
      const account=await database.collection("users").findOne({id:req.user.sub,email,emailVerified:true},{projection:{id:1,email:1,name:1}});
      if(!account)return res.status(403).json({error:"A verified seller account is required for admin access.",code:"ADMIN_ACCOUNT_REQUIRED"});
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
      res.json({
        admin:{name:account.name,email:account.email},
        metrics:{buyers,sellers,stores,products,orders},
        recentStores:recentStores.map(store=>({id:store.id,name:store.storeName||"Untitled store",slug:store.slug||"",createdAt:store.createdAt||null,owner:ownerById.get(store.userId)||{name:"Unknown seller",email:""}})),
        recentOrders:recentOrders.map(order=>({id:order.id,status:order.status||"unknown",total:Number(order.total||0),createdAt:order.createdAt||null,fulfillment:order.fulfillment||"unknown"}))
      });
    } catch(error) {
      console.error("Admin overview failed:",error?.message||error);
      res.status(500).json({error:"Unable to load platform overview.",code:"ADMIN_OVERVIEW_FAILED"});
    }
  });
}
