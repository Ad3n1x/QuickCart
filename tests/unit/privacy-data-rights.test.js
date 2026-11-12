import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerPrivacyRoutes } from "../../server/src/routes/privacy.js";

function rightsHarness() {
  const state = {
    privacy_requests: [{ id:"request-1", email:"buyer@example.com", emailHash:"hash-buyer", type:"erasure", status:"in_progress", verificationStatus:"verified", internalNote:"Identity checked using account verification.", history:[] }],
    users: [],
    customer_users: [{ id:"buyer-1", email:"buyer@example.com", name:"Buyer", passwordHash:"must-not-export" }],
    orders: [{ id:"order-1", customerEmail:"buyer@example.com", customerId:"buyer-1", customerName:"Buyer", customerPhone:"08000000000", address:"Private address", total:1200, status:"delivered", paymentStatus:"paid", customerConfirmationTokenHash:"must-not-export", paymentApiKey:"must-not-export" }],
    customers: [{ id:"crm-1", customerEmail:"buyer@example.com", name:"Buyer" }],
    stores: [], products: [], discounts: [], deliveries: []
  };
  const matches = (row, query={}) => Object.entries(query).every(([key,value]) => {
    if (key === "$or") return value.some(part => matches(row,part));
    if (value && typeof value === "object" && "$in" in value) return value.$in.includes(row[key]);
    return row[key] === value;
  });
  const db = async () => ({ withTransaction: async work => work({}), collection(name) {
    const rows = state[name] || (state[name]=[]);
    return {
      async findOne(query, options={}) { const row=rows.find(item=>matches(item,query)); if(!row)return null; const copy=structuredClone(row); for(const [key,value] of Object.entries(options.projection||{}))if(value===0)delete copy[key]; return copy; },
      find(query={}, options={}) {
        let items=rows.filter(row=>matches(row,query)).map(row=>structuredClone(row));
        return { sort(){return this;}, limit(){return this;}, async toArray(){return items;} };
      },
      async updateOne(query,update) {
        const row=rows.find(item=>matches(item,query)); if(!row)return {matchedCount:0,modifiedCount:0};
        Object.assign(row,update.$set||{});
        if(update.$push?.history)row.history=[...(row.history||[]),update.$push.history];
        return {matchedCount:1,modifiedCount:1};
      },
      async updateMany(query,update) {
        const found=rows.filter(item=>matches(item,query));
        for(const row of found){Object.assign(row,update.$set||{});for(const key of Object.keys(update.$unset||{}))delete row[key];}
        return {matchedCount:found.length,modifiedCount:found.length};
      },
      async deleteOne(query) {
        const index=rows.findIndex(item=>matches(item,query));
        if(index<0)return {deletedCount:0};
        rows.splice(index,1);return {deletedCount:1};
      },
      async deleteMany(query) {
        const before=rows.length;
        state[name]=rows.filter(item=>!matches(item,query));
        return {deletedCount:before-state[name].length};
      },
      async countDocuments(query={}) { return rows.filter(row=>matches(row,query)).length; },
      async insertOne(row) { rows.push(structuredClone(row)); return {insertedId:row.id}; }
    };
  }});
  const app=express();app.use(express.json());
  registerPrivacyRoutes(app,{db,adminAuth:(req,_res,next)=>{req.admin={email:"admin@example.com"};next();},randomUUID:()=> "new-id",now:()=>new Date().toISOString()});
  const server=app.listen(0);
  const url=new Promise(resolve=>server.once("listening",()=>resolve("http://127.0.0.1:"+server.address().port)));
  return {state,server,url};
}

test("verified data export includes buyer records but excludes password hashes",async()=>{
  const h=rightsHarness();
  try{
    const response=await fetch((await h.url)+"/api/admin/privacy/requests/request-1/export");
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.accountProfiles.buyer.email,"buyer@example.com");
    assert.equal("passwordHash" in data.accountProfiles.buyer,false);
    assert.equal(data.buyerActivity.orders.length,1);
    assert.equal("customerConfirmationTokenHash" in data.buyerActivity.orders[0],false);
    assert.equal("paymentApiKey" in data.buyerActivity.orders[0],false);
    assert.equal(data.buyerActivity.customerRecords.length,1);
  }finally{h.server.close();}
});

test("buyer erasure requires explicit confirmation and preserves anonymised order evidence",async()=>{
  const h=rightsHarness();
  try{
    const endpoint=(await h.url)+"/api/admin/privacy/requests/request-1/execute-erasure";
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirmEmail:"buyer@example.com",confirmation:"ERASE",confirmNoLegalHold:true})});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.buyerProfileDeleted,true);
    assert.equal(data.crmRecordsDeleted,1);
    assert.equal(data.ordersAnonymised,1);
    assert.equal(h.state.customer_users.length,0);
    assert.equal(h.state.customers.length,0);
    assert.equal(h.state.orders[0].customerEmail,"");
    assert.equal(h.state.orders[0].total,1200);
    assert.equal("customerConfirmationTokenHash" in h.state.orders[0],false);
  }finally{h.server.close();}
});
