import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerAdminRoutes } from "../../server/src/routes/admin.js";

function harness(adminPasswordHash="old-hash",sendEmail){
 const collections=new Map();
 const db=async()=>({collection(name){
  if(!collections.has(name)){
   const docs=[];
   collections.set(name,{
    docs,
    async findOne(query){return docs.find(d=>Object.entries(query).every(([k,v])=>d[k]===v))||null},
    async countDocuments(query){return docs.filter(d=>{if(query.$or)return d.createdAt>query.createdAt.$gt&&query.$or.some(q=>Object.entries(q).every(([k,v])=>d[k]===v));return true}).length},
    async insertOne(doc){docs.push({...doc});return {insertedId:docs.length}},
    async deleteMany(query){for(let i=docs.length-1;i>=0;i--)if(Object.entries(query).every(([k,v])=>k==="expiresAt"&&v.$lte?docs[i][k]<=v.$lte:docs[i][k]===v))docs.splice(i,1);return {deletedCount:0}},
    async findOneAndDelete(query){const i=docs.findIndex(d=>Object.entries(query).every(([k,v])=>k==="expiresAt"&&v.$gt?d[k]>v.$gt:d[k]===v));return i<0?null:docs.splice(i,1)[0]},
    async updateOne(query,update){const d=docs.find(x=>Object.entries(query).every(([k,v])=>x[k]===v));if(!d)return {matchedCount:0};Object.assign(d,update.$set);return {matchedCount:1,modifiedCount:1}}
   });
  }
  return collections.get(name);
 }});
 const handlers={};
 const app={post(path,...fns){handlers["POST "+path]=fns[fns.length-1]},get(path,...fns){handlers["GET "+path]=fns[fns.length-1]}};
 const sent=[];
 const deliverEmail=sendEmail||async(email,url)=>sent.push({email,url});
 const bcrypt={async compare(p,h){return p==="right-password"&&h==="old-hash"},async hash(p){return "bcrypt:"+p}};
 const env=process.env.ADMIN_JWT_SECRET;process.env.ADMIN_JWT_SECRET="admin-test-secret";
 registerAdminRoutes(app,{db,adminAuth:(_q,_s,next)=>next(),adminTokenFor:()=> "admin-token",adminEmail:"owner@example.com",adminPasswordHash,bcrypt,randomBytes:()=>Buffer.alloc(32,7),sendAdminPasswordResetEmail:deliverEmail,frontendUrl:"https://quick-cart.example"});
 async function call(path,body={}){const req={body,ip:"127.0.0.1"};const out={status:200,data:null};const res={status(n){out.status=n;return this},json(data){out.data=data;return this},setHeader(){}};await handlers["POST "+path](req,res);return out}
 async function seedCredential(credential){const database=await db();await database.collection("admin_credentials").insertOne(credential)}
 return {collections,sent,call,seedCredential,restore(){if(env===undefined)delete process.env.ADMIN_JWT_SECRET;else process.env.ADMIN_JWT_SECRET=env}};
}

test("admin recovery bootstraps and then requires the exact primary admin database record",async()=>{
 const h=harness();
 try{
  const unknown=await h.call("/api/admin/auth/forgot-password",{email:"other@example.com"});
  assert.equal(unknown.status,200);
  assert.equal(h.sent.length,0);
  const known=await h.call("/api/admin/auth/forgot-password",{email:"OWNER@example.com"});
  assert.equal(known.status,200);
  assert.equal(h.sent.length,1);
  const credential=h.collections.get("admin_credentials").docs[0];
  assert.equal(credential.email,"owner@example.com");
  assert.equal(credential.passwordHash,"old-hash");
  assert.equal(credential.source,"render-bootstrap");
  assert.match(h.sent[0].url,/\/admin\/reset-password\?token=/);
  const rawToken=new URL(h.sent[0].url).searchParams.get("token");
  const stored=h.collections.get("admin_password_resets").docs[0];
  assert.equal(stored.tokenHash,createHash("sha256").update(rawToken).digest("hex"));
  assert.equal(stored.tokenHash.includes(rawToken),false);
 }finally{h.restore()}
});

test("admin recovery can initialize without a Render password hash",async()=>{
 const h=harness(null);
 try{
  await h.call("/api/admin/auth/forgot-password",{email:"owner@example.com"});
  assert.equal(h.sent.length,1);
  const credential=h.collections.get("admin_credentials").docs[0];
  assert.equal(credential.email,"owner@example.com");
  assert.equal(credential.source,"recovery-bootstrap");
  assert.match(credential.passwordHash,/^bcrypt:/);
 }finally{h.restore()}
});

test("an existing database admin record with a different email never receives a reset link",async()=>{
 const h=harness();
 try{
  await h.seedCredential({id:"primary-admin",email:"someone-else@example.com",passwordHash:"old-hash"});
  await h.call("/api/admin/auth/forgot-password",{email:"owner@example.com"});
  assert.equal(h.sent.length,0);
  assert.equal(h.collections.get("admin_password_resets"),undefined);
 }finally{h.restore()}
});

test("admin reset link is single-use and updates the stored password hash",async()=>{
 const h=harness();
 try{
  await h.call("/api/admin/auth/forgot-password",{email:"owner@example.com"});
  const rawToken=new URL(h.sent[0].url).searchParams.get("token");
  const reset=await h.call("/api/admin/auth/reset-password",{token:rawToken,password:"a-very-long-new-password"});
  assert.equal(reset.status,200);
  assert.match(reset.data.message,/updated/);
  assert.equal(h.collections.get("admin_credentials").docs[0].passwordHash,"bcrypt:a-very-long-new-password");
  const reuse=await h.call("/api/admin/auth/reset-password",{token:rawToken,password:"another-very-long-password"});
  assert.equal(reuse.status,400);
  assert.equal(reuse.data.code,"ADMIN_RESET_INVALID");
 }finally{h.restore()}
});

test("admin reset enforces the minimum password length",async()=>{
 const h=harness();
 try{
  const result=await h.call("/api/admin/auth/reset-password",{token:"a".repeat(64),password:"short"});
  assert.equal(result.status,400);
  assert.equal(result.data.code,"ADMIN_PASSWORD_POLICY");
 }finally{h.restore()}
});


test("failed Brevo delivery removes the undelivered reset token and keeps the generic response",async()=>{
 const h=harness("old-hash",async()=>{const error=new Error("sender rejected");error.statusCode=400;error.code="invalid_parameter";throw error});
 try{
  const result=await h.call("/api/admin/auth/forgot-password",{email:"owner@example.com"});
  assert.equal(result.status,200);
  assert.equal(result.data.message,"If the administrator email is registered, a password reset link will be sent shortly.");
  assert.equal(h.collections.get("admin_password_resets").docs.length,0);
  assert.equal(h.collections.get("admin_password_reset_attempts").docs.length,1);
 }finally{h.restore()}
});


test("admin recovery allows five requests per hour and throttles the sixth",async()=>{
 const h=harness();
 try{
  for(let i=0;i<5;i++){
   const result=await h.call("/api/admin/auth/forgot-password",{email:"owner@example.com"});
   assert.equal(result.status,200);
  }
  assert.equal(h.sent.length,5);
  const throttled=await h.call("/api/admin/auth/forgot-password",{email:"owner@example.com"});
  assert.equal(throttled.status,200);
  assert.equal(throttled.data.message,"If the administrator email is registered, a password reset link will be sent shortly.");
  assert.equal(h.sent.length,5);
 }finally{h.restore()}
});
