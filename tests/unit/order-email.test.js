import test from "node:test";
import assert from "node:assert/strict";
import { createOrderUpdateEmailSender } from "../../server/src/services/email.js";

test("order update email skips orders without a customer email", async () => {
  const send = createOrderUpdateEmailSender({ apiKey: "test", fromEmail: "orders@example.com" });
  assert.deepEqual(await send({ status: "shipped" }), { skipped: true, reason: "Customer email unavailable" });
});

test("order update email sends a branded status message through Brevo", async t => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ messageId: "test-message" }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const send = createOrderUpdateEmailSender({ apiKey: "test-key", fromEmail: "orders@example.com", fromName: "QuickCart" });
  const result = await send({
    customerEmail: "customer@example.com",
    orderNumber: "QC-123",
    status: "shipped",
    total: 12500,
    storeId: "store-1"
  }, "Demo Store");
  assert.equal(result.messageId, "test-message");
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.to[0].email, "customer@example.com");
  assert.match(payload.subject, /Order dispatched/);
  assert.match(payload.htmlContent, /Demo Store/);
  assert.match(payload.textContent, /QC-123/);
});
