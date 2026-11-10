import test from "node:test";
import assert from "node:assert/strict";
import { createAuthServices } from "../../server/src/middleware/auth.js";

const services=createAuthServices("seller-jwt-secret-for-tests","admin-jwt-secret-for-tests");
function invoke(middleware,token){
  return new Promise(resolve=>{
    const req={headers:token?{authorization:"Bearer "+token}:{}};
    const result={statusCode:200,body:null,next:false};
    const res={
      status(code){result.statusCode=code;return this},
      json(body){result.body=body;resolve(result);return this}
    };
    middleware(req,res,()=>{result.next=true;result.payload=req.admin||req.user;resolve(result)});
  });
}

test("dedicated admin token is accepted by admin middleware",async()=>{
  const token=services.adminTokenFor({id:"primary-admin",email:"owner@example.com",name:"Admin"});
  const result=await invoke(services.adminAuth,token);
  assert.equal(result.next,true);
  assert.equal(result.payload.role,"admin");
});

test("admin token cannot authenticate as a seller",async()=>{
  const token=services.adminTokenFor({id:"primary-admin",email:"owner@example.com",name:"Admin"});
  const result=await invoke(services.auth,token);
  assert.equal(result.next,undefined);
  assert.equal(result.statusCode,401);
});

test("seller token cannot authenticate as an administrator",async()=>{
  const token=services.tokenFor({id:"seller-1",email:"seller@example.com",name:"Seller"});
  const result=await invoke(services.adminAuth,token);
  assert.equal(result.next,undefined);
  assert.equal(result.statusCode,401);
});

test("customer token cannot authenticate as an administrator",async()=>{
  const token=services.customerTokenFor({id:"buyer-1",email:"buyer@example.com",name:"Buyer"});
  const result=await invoke(services.adminAuth,token);
  assert.equal(result.next,undefined);
  assert.equal(result.statusCode,401);
});
