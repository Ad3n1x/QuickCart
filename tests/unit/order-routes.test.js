import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { registerOrderRoutes } from "../../server/src/routes/orders.js";

function createHarness({stock=5}={}) {
 const state={
  products:[{id:"p-1",storeId:"store-1",name:"Classic Tee",price:2500,stock,active:true}],
  stores:[{id:"store-1",deliveryEnabled:true,deliveryFee:300}],discounts:[],orders:[],customers:[]
 };
 const products={
  find(filter){return {toArray:async()=>state.products.filter(p=>p.storeId===filter.storeId&&p.active===true)}},
  async updateOne(filter,update){
   const p=state.products.find(x=>x.id===filter.id&&x.storeId===filter.storeId&&x.active===true&&
    (filter.stock?.$gte===undefined||x.stock>=filter.stock.$gte));
   if(!p)return {modifiedCount:0};
   p.stock+=Number(update.$inc?.stock||0);
   return {modifiedCount:1};
  }
 };
 const orders={
  async insertOne(order){state.orders.push(structuredClone(order));return {insertedId:order.id}},
  async findOne(filter){return state.orders.find(x=>Object.entries(filter).every(([k,v])=>x[k]===v))||null}
 };
 const customers={async updateOne(filter,update){state.customers.push({filter,update});return {matchedCount:1,modifiedCount:1}}};
 const stores={async findOne(filter){return state.stores.find(x=>Object.entries(filter).every(([k,v])=>x[k]===v))||null}};
 const discounts={async findOne(filter){return state.discounts.find(x=>Object.entries(filter).every(([k,v])=>x[k]===v))||null}};
 const database={collection(name){return ({products,orders,customers,stores,discounts})[name]}};
 const app=express();app.use(express.json());
 registerOrderRoutes(app,{
  db:async()=>database,
  auth:(req,_res,next)=>{req.user={sub:"seller-1"};next()},
  customerAuth:(_req,_res,next)=>next(),
  customerTokenFor:()=>"",now:()=>new Date().toISOString(),
  randomUUID,randomBytes:()=>Buffer.from("test-confirmation-token"),
  hashToken:value=>"hash:"+value,getUserStore:async()=>({id:"store-1",deliveryEnabled:true,deliveryFee:300}),
  jwt:{verify:()=>({role:"customer",sub:"customer-1",email:"customer@example.com"})},
  jwtSecret:"test-secret",emailPattern:/^[^@\s]+@[^@\s]+\.[^@\s]+$/
 });
 const server=app.listen(0);
 const url=new Promise(resolve=>server.once("listening",()=>resolve("http://127.0.0.1:"+server.address().port)));
 return {state,server,url};
}

test("manual catalogue order reserves stock and records the catalogue product",async()=>{
 const h=createHarness({stock:5});
 try{
  const response=await fetch((await h.url)+"/api/orders/manual",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   customerName:"Ada",customerPhone:"08012345678",items:[{name:"Classic Tee",price:2500,quantity:2}]
  })});
  const data=await response.json();
  assert.equal(response.status,201);
  assert.equal(h.state.products[0].stock,3);
  assert.equal(data.order.items[0].id,"p-1");
  assert.equal(data.order.items[0].inventoryTracked,true);
  assert.equal(h.state.orders.length,1);
 }finally{h.server.close()}
});

test("manual order refuses insufficient catalogue stock without creating an order",async()=>{
 const h=createHarness({stock:1});
 try{
  const response=await fetch((await h.url)+"/api/orders/manual",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   customerName:"Ada",customerPhone:"08012345678",items:[{name:"Classic Tee",price:2500,quantity:2}]
  })});
  assert.equal(response.status,409);
  assert.equal(h.state.products[0].stock,1);
  assert.equal(h.state.orders.length,0);
 }finally{h.server.close()}
});

test("custom one-off manual lines do not mutate catalogue inventory",async()=>{
 const h=createHarness({stock:5});
 try{
  const response=await fetch((await h.url)+"/api/orders/manual",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   customerName:"Ada",customerPhone:"08012345678",items:[{name:"Custom service",price:900,quantity:3}]
  })});
  const data=await response.json();
  assert.equal(response.status,201);
  assert.equal(h.state.products[0].stock,5);
  assert.equal(data.order.items[0].inventoryTracked,false);
 }finally{h.server.close()}
});


test("guest checkout creates an order without a customer account and reserves catalogue stock",async()=>{
 const h=createHarness({stock:5});
 try{
  const response=await fetch((await h.url)+"/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   storeId:"store-1",customerName:"Ada",customerPhone:"08012345678",fulfillment:"pickup",paymentMethod:"pay_on_delivery",items:[{id:"p-1",quantity:2}]
  })});
  const data=await response.json();
  assert.equal(response.status,201);
  assert.equal(data.guestCheckout,true);
  assert.ok(data.confirmationToken);
  assert.equal(h.state.products[0].stock,3);
  assert.equal(h.state.orders.length,1);
  assert.equal(h.state.orders[0].guestCheckout,true);
  assert.equal(h.state.orders[0].customerEmail,"");
 }finally{h.server.close()}
});
