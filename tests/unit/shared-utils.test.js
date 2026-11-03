import test from "node:test";
import assert from "node:assert/strict";
import { fmt } from "../../src/lib/format.js";
import { splitPhone,joinPhone } from "../../src/lib/phone.js";
import { slugify,emailOf } from "../../src/lib/identity.js";
import { orderDisplayTotal,dedupeCustomerOrders } from "../../src/lib/order-utils.js";

test("formats amounts in Nigerian naira",()=>{
  const value=fmt(1234);
  assert.match(value,/1,234/);
  assert.match(value,/₦|NGN/);
});

test("normalizes Nigerian phone numbers without duplicating the country code",()=>{
  assert.deepEqual(splitPhone("08012345678"),{code:"+234",number:"8012345678"});
  assert.deepEqual(splitPhone("+2348012345678"),{code:"+234",number:"8012345678"});
  assert.equal(joinPhone("+234","08012345678"),"+2348012345678");
});

test("normalizes store slugs and customer email addresses",()=>{
  assert.equal(slugify("My Store / Nigeria"),"my-store-nigeria");
  assert.equal(emailOf("  ADENIX\u200B@EXAMPLE.COM "),"adenix@example.com");
});

test("calculates order totals from subtotal, delivery fee and discount when needed",()=>{
  assert.equal(orderDisplayTotal({subtotal:1000,deliveryFee:150,discount:100}),1050);
  assert.equal(orderDisplayTotal({items:[{price:200,quantity:2}],deliveryFee:50}),450);
});

test("deduplicates repeated order identifiers and ignores malformed empty orders",()=>{
  const items=[{id:"p1",quantity:1}];
  const orders=[
    {id:"one",storeId:"s1",clientOrderId:"client-one",items,createdAt:"2026-11-03T10:00:00.000Z"},
    {id:"two",storeId:"s1",clientOrderId:"client-one",items,createdAt:"2026-11-03T10:00:01.000Z"},
    {id:"empty",storeId:"s1",items:[]}
  ];
  assert.deepEqual(dedupeCustomerOrders(orders).map(order=>order.id),["one"]);
});
