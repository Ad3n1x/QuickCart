import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { registerPrivacyRoutes } from "../../server/src/routes/privacy.js";

function harness() {
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "privacy-route-test-secret";
  const state = { requests: [] };
  const collection = {
    async countDocuments(query) {
      return state.requests.filter(item => item.createdAt >= query.createdAt.$gte &&
        (query.$or.some(filter => filter.emailHash === item.emailHash) || query.$or.some(filter => filter.ipHash === item.ipHash))).length;
    },
    async insertOne(document) { state.requests.push(structuredClone(document)); },
    find(_filter, options = {}) {
      let items = state.requests.map(item => {
        const copy = structuredClone(item);
        if (options.projection?.ipHash === 0) { delete copy.ipHash; delete copy.emailHash; }
        return copy;
      });
      return { sort() { items.sort((a,b) => b.createdAt-a.createdAt); return this; }, limit(n) { items=items.slice(0,n); return this; }, async toArray() { return items; } };
    },
    async findOne(query, options = {}) {
      const item = state.requests.find(row => row.id === query.id);
      if (!item) return null;
      const copy = structuredClone(item);
      if (options.projection?.ipHash === 0) { delete copy.ipHash; delete copy.emailHash; }
      return copy;
    },
    async updateOne(query, update) {
      const item = state.requests.find(row => row.id === query.id);
      if (!item) return { matchedCount: 0 };
      Object.assign(item, update.$set || {});
      if (update.$push?.history) item.history.push(update.$push.history);
      return { matchedCount: 1 };
    }
  };
  const db = async () => ({ collection: () => collection });
  const app = express(); app.use(express.json());
  registerPrivacyRoutes(app, { db, adminAuth: (req, _res, next) => { req.admin={email:"admin@example.com"}; next(); }, randomUUID, now: () => new Date() });
  const server = app.listen(0);
  const url = new Promise(resolve => server.once("listening", () => resolve("http://127.0.0.1:"+server.address().port)));
  return { state, server, url, restore() { if (previousJwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousJwtSecret; } };
}

test("privacy request intake validates and stores a minimal request record", async () => {
  const h = harness();
  try {
    const response = await fetch((await h.url)+"/api/privacy/requests", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({name:"Ada Buyer",email:"ada@example.com",type:"access",details:"Please provide a copy of the personal data linked to my account."}) });
    const data = await response.json();
    assert.equal(response.status,201);
    assert.ok(data.reference);
    assert.equal(h.state.requests.length,1);
    assert.equal(h.state.requests[0].status,"received");
    assert.equal(h.state.requests[0].verificationStatus,"pending");
    assert.ok(h.state.requests[0].emailHash);
    assert.ok(h.state.requests[0].ipHash);
  } finally { h.server.close(); h.restore(); }
});

test("privacy request intake rejects invalid email, request type and empty details", async () => {
  const h = harness();
  try {
    const response = await fetch((await h.url)+"/api/privacy/requests", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({name:"A",email:"bad",type:"erase-everything",details:"x"}) });
    assert.equal(response.status,400);
    assert.equal(h.state.requests.length,0);
  } finally { h.server.close(); }
});

test("privacy request intake rate-limits repeated requests from one email or IP", async () => {
  const h = harness();
  try {
    const url=(await h.url)+"/api/privacy/requests";
    const payload={name:"Ada Buyer",email:"ada@example.com",type:"access",details:"Please provide my account information."};
    for(let i=0;i<3;i++) {
      const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      assert.equal(response.status,201);
    }
    const limited=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    assert.equal(limited.status,429);
  } finally { h.server.close(); }
});

test("admin can review and update privacy requests without receiving rate-limit hashes", async () => {
  const h = harness();
  try {
    const created=await fetch((await h.url)+"/api/privacy/requests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Ada Buyer",email:"ada@example.com",type:"access",details:"Please provide my account information."})});
    const {reference}=await created.json();
    const listed=await fetch((await h.url)+"/api/admin/privacy/requests");
    const data=await listed.json();
    assert.equal(listed.status,200);
    assert.equal(data.requests[0].id,reference);
    assert.equal("emailHash" in data.requests[0],false);
    const updated=await fetch((await h.url)+"/api/admin/privacy/requests/"+reference,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"identity_verification",verificationStatus:"verified"})});
    const result=await updated.json();
    assert.equal(updated.status,200);
    assert.equal(result.request.status,"identity_verification");
    assert.equal(result.request.verificationStatus,"verified");
    assert.equal(result.request.history.length,2);
  } finally { h.server.close(); }
});

test("admin cannot close a privacy request without verified identity and completion evidence", async () => {
  const h = harness();
  try {
    const created = await fetch((await h.url)+"/api/privacy/requests", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({name:"Ada Buyer",email:"ada@example.com",type:"access",details:"Please provide my account information."}) });
    const { reference } = await created.json();
    const endpoint = (await h.url)+"/api/admin/privacy/requests/"+reference;
    const premature = await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"completed"})});
    assert.equal(premature.status,409);
    assert.equal((await premature.json()).code,"PRIVACY_COMPLETION_GUARD");
    const verified = await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({verificationStatus:"verified"})});
    assert.equal(verified.status,200);
    const withoutEvidence = await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"completed"})});
    assert.equal(withoutEvidence.status,409);
    const noted = await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({internalNote:"Export completed and response sent to verified requester."})});
    assert.equal(noted.status,200);
    const completed = await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:"completed"})});
    assert.equal(completed.status,200);
    assert.equal((await completed.json()).request.status,"completed");
  } finally { h.server.close(); h.restore(); }
});
