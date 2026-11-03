import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {randomUUID} from "node:crypto";
import {registerBusinessOsRoutes} from "../../server/src/routes/business-os.js";

function harness(store={id:"store-a",userId:"seller-a"}){
 const records={businessExpenses:[],businessInvoices:[],businessSuppliers:[],stockMovements:[],purchaseOrders:[],deliveries:[],referralCodes:[],recommendationAudit:[],products:[],orders:[]};
 const db={collection(name){const rows=records[name]||(records[name]=[]);return {
  async insertOne(doc){rows.push(structuredClone(doc));return {insertedId:doc.id}},
  async findOne(filter){return rows.find(x=>Object.entries(filter).every(([k,v])=>x[k]===v))||null},
  find(filter={}){let selected=rows.filter(x=>Object.entries(filter).every(([k,v])=>x[k]===v));return {sort(){return this},limit(){return this},project(){return this},async toArray(){return selected}}},
  async updateOne(filter,update){const row=rows.find(x=>Object.entries(filter).every(([k,v])=>x[k]===v));if(!row)return {matchedCount:0,modifiedCount:0};Object.assign(row,update.$set||{});for(const [key,value] of Object.entries(update.$inc||{}))row[key]=(Number(row[key])||0)+Number(value);return {matchedCount:1,modifiedCount:1}}
 }}};
 const app=express();app.use(express.json());
 registerBusinessOsRoutes(app,{db:async()=>db,auth:(req,_res,next)=>{req.user={sub:"seller-a"};next()},getUserStore:async()=>store,randomUUID,now:()=> "2026-11-03T12:00:00.000Z"});
 const server=app.listen(0),url=new Promise(resolve=>server.once("listening",()=>resolve("http://127.0.0.1:"+server.address().port)));
 return {server,url,records};
}

test("expense creation is scoped to the authenticated seller store",async()=>{
 const h=harness();
 try{
  const response=await fetch((await h.url)+"/api/business/expenses",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amount:1250,category:"Transport",description:"Supplier delivery"})});
  const data=await response.json();
  assert.equal(response.status,201);
  assert.equal(data.expense.storeId,"store-a");
  assert.equal(data.expense.amount,1250);
  assert.equal(h.records.businessExpenses.length,1);
 }finally{h.server.close()}
});

test("expense creation rejects invalid amounts",async()=>{
 const h=harness();
 try{
  const response=await fetch((await h.url)+"/api/business/expenses",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amount:-5,category:"Transport"})});
  assert.equal(response.status,400);
  assert.equal(h.records.businessExpenses.length,0);
 }finally{h.server.close()}
});

test("business APIs do not operate without an owned store",async()=>{
 const h=harness(null);
 try{
  const response=await fetch((await h.url)+"/api/business/expenses",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({amount:500,category:"Transport"})});
  assert.equal(response.status,404);
  assert.equal(h.records.businessExpenses.length,0);
 }finally{h.server.close()}
});

test("supplier listing excludes records belonging to another store",async()=>{
 const h=harness();
 h.records.businessSuppliers.push(
  {id:"own",storeId:"store-a",name:"Own supplier"},
  {id:"other",storeId:"store-b",name:"Other tenant supplier"}
 );
 try{
  const response=await fetch((await h.url)+"/api/business/suppliers");
  const data=await response.json();
  assert.equal(response.status,200);
  assert.deepEqual(data.suppliers.map(x=>x.id),["own"]);
 }finally{h.server.close()}
});


test("purchase-order receipt records duplicate product lines independently",async()=>{
 const h=harness();
 h.records.businessSuppliers.push({id:"supplier-1",storeId:"store-a",name:"Supplier",active:true});
 h.records.products.push({id:"product-1",storeId:"store-a",name:"Test product",stock:2});
 try{
  const base=await h.url;
  const created=await fetch(base+"/api/business/purchase-orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({supplierId:"supplier-1",items:[{productId:"product-1",quantity:3,unitCost:100},{productId:"product-1",quantity:4,unitCost:120}]})});
  assert.equal(created.status,201);
  const {purchaseOrder}=await created.json();
  const received=await fetch(base+"/api/business/purchase-orders/"+purchaseOrder.id+"/receive",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  assert.equal(received.status,200);
  assert.equal(h.records.products[0].stock,9);
  assert.equal(h.records.stockMovements.length,2);
  const replay=await fetch(base+"/api/business/purchase-orders/"+purchaseOrder.id+"/receive",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  assert.equal(replay.status,200);
  assert.equal(h.records.products[0].stock,9);
  assert.equal(h.records.stockMovements.length,2);
 }finally{h.server.close()}
});

test("cashflow includes paid invoices in net cashflow",async()=>{
 const h=harness();
 h.records.orders.push({id:"order-1",storeId:"store-a",paymentStatus:"paid",total:1000});
 h.records.businessInvoices.push({id:"invoice-1",storeId:"store-a",status:"paid",amount:500});
 h.records.businessExpenses.push({id:"expense-1",storeId:"store-a",amount:200});
 try{
  const response=await fetch((await h.url)+"/api/business/cashflow");
  const data=await response.json();
  assert.equal(response.status,200);
  assert.equal(data.received,1000);
  assert.equal(data.paidInvoices,500);
  assert.equal(data.expenses,200);
  assert.equal(data.netCashflow,1300);
 }finally{h.server.close()}
});
