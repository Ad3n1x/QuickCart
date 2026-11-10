import test from "node:test";
import assert from "node:assert/strict";
import { registrationPatterns, validateRegistration } from "../../src/lib/registration-validation.js";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "08012345678",
  password: "StrongPass1!",
  confirmPassword: "StrongPass1!"
};

test("registration accepts valid Nigerian buyer and seller identity fields", () => {
  assert.equal(validateRegistration(valid), "");
  assert.equal(registrationPatterns.phone.test("+2348012345678"), true);
});

test("registration rejects malformed names, emails and phone numbers", () => {
  assert.notEqual(validateRegistration({ ...valid, name: "A" }), "");
  assert.notEqual(validateRegistration({ ...valid, email: "not-an-email" }), "");
  assert.notEqual(validateRegistration({ ...valid, phone: "12345" }), "");
});

test("registration requires a strong matching password", () => {
  assert.notEqual(validateRegistration({ ...valid, password: "password", confirmPassword: "password" }), "");
  assert.notEqual(validateRegistration({ ...valid, confirmPassword: "DifferentPass1!" }), "");
});
