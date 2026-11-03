import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWhatsAppNumber,
  buildOrderWhatsAppMessage,
  buildOrderWhatsAppUrl
} from "../../src/lib/whatsapp.js";

test("normalizes common Nigerian phone number formats",()=>{
  assert.equal(normalizeWhatsAppNumber("08012345678"),"2348012345678");
  assert.equal(normalizeWhatsAppNumber("+234 801 234 5678"),"2348012345678");
  assert.equal(normalizeWhatsAppNumber("0091 9876543210"),"919876543210");
  assert.equal(normalizeWhatsAppNumber("not a number"),"");
});

test("builds a status-specific dispatch message with delivery details",()=>{
  const message=buildOrderWhatsAppMessage({
    id:"order-123",customerName:"Ada",trackingReference:"RIDER-42"
  },"dispatched","Ada's Store");
  assert.match(message,/Hello Ada/);
  assert.match(message,/dispatched/);
  assert.match(message,/order-123/);
  assert.match(message,/RIDER-42/);
});

test("builds an encoded WhatsApp click-to-chat URL without claiming delivery",()=>{
  const url=buildOrderWhatsAppUrl({
    id:"order-123",customerPhone:"08012345678",customerName:"Ada"
  },"delivered","Ada's Store");
  assert.match(url,/^https:\/\/wa\.me\/2348012345678\?text=/);
  assert.match(decodeURIComponent(url),/Thank you for choosing us/);
  assert.doesNotMatch(decodeURIComponent(url),/message sent|delivered successfully to WhatsApp/i);
});

test("rejects unsupported statuses, missing order references and invalid numbers",()=>{
  assert.throws(()=>buildOrderWhatsAppMessage({id:"x"},"unknown"),/does not have a WhatsApp message template/);
  assert.throws(()=>buildOrderWhatsAppMessage({},"new"),/order reference is required/);
  assert.throws(()=>buildOrderWhatsAppUrl({id:"x",customerPhone:"bad"},"new"),/valid customer WhatsApp number/);
});
