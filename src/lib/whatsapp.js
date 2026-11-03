const STATUS_MESSAGES = {
  new: "We have received your order and will confirm it shortly.",
  confirmed: "Your order has been confirmed.",
  processing: "Your order is being prepared.",
  preparing: "Your order is being prepared.",
  dispatched: "Your order has been dispatched and is on its way.",
  "in-transit": "Your order is on its way.",
  delivered: "Your order has been delivered. Thank you for shopping with us!",
  cancelled: "Your order has been cancelled. Please contact the store if you need help."
};

export function normalizeWhatsAppNumber(value, defaultCountryCode = "234") {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let international = digits;
  if (raw.startsWith("+")) {
    international = digits;
  } else if (digits.startsWith("00")) {
    international = digits.slice(2);
  } else if (digits.startsWith("0")) {
    international = defaultCountryCode + digits.slice(1);
  } else if (digits.length === 10 && defaultCountryCode === "234") {
    international = defaultCountryCode + digits;
  }
  // E.164 has at most 15 digits; require a plausible national/international length.
  if (!/^\d{8,15}$/.test(international) || international.startsWith("0")) return "";
  return international;
}

export function buildOrderWhatsAppMessage(order, status, storeName = "the store") {
  const key = String(status || "").trim().toLowerCase();
  const update = STATUS_MESSAGES[key];
  if (!update) throw new Error("This order status does not have a WhatsApp message template.");
  const reference = String(order?.orderNumber || order?.id || order?._id || "").trim();
  if (!reference) throw new Error("An order reference is required.");
  const customer = String(order?.customerName || "").trim();
  const lines = [
    customer ? `Hello ${customer},` : "Hello,",
    update,
    `Order: ${reference}`,
    `Store: ${String(storeName || "the store").trim()}`
  ];
  if (key === "dispatched" || key === "in-transit") {
    const delivery = String(order?.deliveryNote || order?.trackingReference || "").trim();
    if (delivery) lines.push(`Delivery details: ${delivery}`);
  }
  lines.push("Thank you for choosing us.");
  return lines.join("\n");
}

export function buildOrderWhatsAppUrl(order, status, storeName) {
  const phone = normalizeWhatsAppNumber(order?.customerPhone || order?.phone);
  if (!phone) throw new Error("A valid customer WhatsApp number is required.");
  const message = buildOrderWhatsAppMessage(order, status, storeName);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
