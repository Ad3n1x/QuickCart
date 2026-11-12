import { createHmac } from "node:crypto";

const hash = (value, secret) => createHmac("sha256", secret).update(String(value || "")).digest("hex");
const allowedTypes = new Set([
  "access", "rectification", "erasure", "restriction", "objection",
  "portability", "withdraw-consent", "automated-decision", "complaint", "other"
]);
const statuses = new Set(["received", "identity_verification", "in_progress", "completed", "declined"]);
const verificationStatuses = new Set(["pending", "verified", "not_required"]);

const sensitiveExportKey = /(password|secret|token|hash|otp|credential|session|authorization|api.?key|private.?key)/i;
function sanitiseExport(value) {
  if (Array.isArray(value)) return value.map(sanitiseExport);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !sensitiveExportKey.test(key))
    .map(([key, item]) => [key, sanitiseExport(item)]));
}

export function registerPrivacyRoutes(app, { db, adminAuth, randomUUID, now }) {
  const hashSecret = process.env.PRIVACY_HASH_SECRET || process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "";

  app.post("/api/privacy/requests", async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim().slice(0, 100);
      const email = String(req.body?.email || "").trim().toLowerCase();
      const type = String(req.body?.type || "").trim();
      const details = String(req.body?.details || "").trim().slice(0, 3000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !name || name.length < 2 || !allowedTypes.has(type) || details.length < 10) {
        return res.status(400).json({ error: "Enter your name, a valid email, request type and at least 10 characters of explanation.", code: "INVALID_PRIVACY_REQUEST" });
      }

      if (!hashSecret) return res.status(503).json({ error: "Privacy request intake is temporarily unavailable. Please contact the platform operator.", code: "PRIVACY_HASH_SECRET_MISSING" });
      const database = await db();
      const requests = database.collection("privacy_requests");
      const createdAt = new Date(now());
      const emailHash = hash(email, hashSecret);
      const ipHash = hash(req.ip || req.socket?.remoteAddress || "unknown", hashSecret);
      const since = new Date(createdAt.getTime() - 24 * 60 * 60 * 1000);
      const recent = await requests.countDocuments({ createdAt: { $gte: since }, $or: [{ emailHash }, { ipHash }] });
      if (recent >= 3) return res.status(429).json({ error: "Too many privacy requests have been submitted. Please try again later.", code: "PRIVACY_REQUEST_RATE_LIMIT" });

      const request = {
        id: randomUUID(),
        name,
        email,
        emailHash,
        ipHash,
        type,
        details,
        status: "received",
        verificationStatus: "pending",
        internalNote: "",
        resolutionEvidence: "",
        responseSentAt: null,
        createdAt,
        updatedAt: createdAt,
        history: [{ action: "request_received", at: createdAt }]
      };
      await requests.insertOne(request);
      res.status(201).json({ message: "Your privacy request has been received. Keep this reference for follow-up.", reference: request.id });
    } catch (error) {
      console.error("Privacy request intake failed:", error?.message || error);
      res.status(503).json({ error: "Unable to receive your request right now. Please try again later.", code: "PRIVACY_REQUEST_UNAVAILABLE" });
    }
  });

  app.get("/api/admin/privacy/requests", adminAuth, async (req, res) => {
    try {
      const database = await db();
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
      const requests = await database.collection("privacy_requests")
        .find({}, { projection: { ipHash: 0, emailHash: 0 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      res.setHeader("Cache-Control", "no-store");
      res.json({ requests });
    } catch (error) {
      console.error("Admin privacy request listing failed:", error?.message || error);
      res.status(500).json({ error: "Unable to load privacy requests.", code: "PRIVACY_REQUEST_LIST_FAILED" });
    }
  });

  // Export is generated on demand after identity verification; no public download URL is created.
  app.get("/api/admin/privacy/requests/:id/export", adminAuth, async (req, res) => {
    try {
      const database = await db();
      const request = await database.collection("privacy_requests").findOne({ id: String(req.params.id || "") });
      if (!request) return res.status(404).json({ error: "Privacy request not found." });
      if (!["verified", "not_required"].includes(request.verificationStatus) || (request.verificationStatus === "not_required" && String(request.internalNote || "").trim().length < 10)) {
        return res.status(409).json({ error: "Verify the requester before preparing a personal-data export.", code: "PRIVACY_IDENTITY_GUARD" });
      }
      const email = String(request.email || "").trim().toLowerCase();
      const [seller, buyer, ordersAsBuyer, crmAsBuyer] = await Promise.all([
        database.collection("users").findOne({ email }, { projection: { passwordHash: 0, emailVerificationOtpHash: 0, emailVerificationExpiresAt: 0, emailVerificationAttempts: 0 } }),
        database.collection("customer_users").findOne({ email }, { projection: { passwordHash: 0, emailVerificationOtpHash: 0, emailVerificationExpiresAt: 0, emailVerificationAttempts: 0 } }),
        database.collection("orders").find({ customerEmail: email }).toArray(),
        database.collection("customers").find({ customerEmail: email }).toArray()
      ]);
      const stores = seller ? await database.collection("stores").find({ userId: seller.id }).toArray() : [];
      const storeIds = stores.map(item => item.id).filter(Boolean);
      const [products, discounts, sellerOrders] = storeIds.length ? await Promise.all([
        database.collection("products").find({ storeId: { $in: storeIds } }).toArray(),
        database.collection("discounts").find({ storeId: { $in: storeIds } }).toArray(),
        database.collection("orders").find({ storeId: { $in: storeIds } }).toArray()
      ]) : [[], [], []];
      const buyerOrderIds = ordersAsBuyer.map(item => item.id).filter(Boolean);
      const sellerOrderIds = sellerOrders.map(item => item.id).filter(Boolean);
      const deliveries = buyerOrderIds.length ? await database.collection("deliveries").find({ orderId: { $in: buyerOrderIds } }).toArray() : [];
      const sellerSafeOrders = sellerOrders.filter(order => !ordersAsBuyer.some(buyerOrder => buyerOrder.id === order.id)).map(order => ({
        ...order,
        customerName: "[redacted — another data subject]",
        customerEmail: "[redacted — another data subject]",
        customerPhone: "[redacted — another data subject]",
        address: "[redacted — another data subject]",
        receiptData: undefined
      }));
      const exportData = sanitiseExport({
        generatedAt: now(),
        requestReference: request.id,
        subjectEmail: email,
        accountProfiles: { seller: seller || null, buyer: buyer || null },
        sellerWorkspace: seller ? { stores, products, discounts, orders: sellerSafeOrders } : null,
        buyerActivity: { orders: ordersAsBuyer, customerRecords: crmAsBuyer, deliveries },
        privacyRequests: await database.collection("privacy_requests").find({ emailHash: request.emailHash }, { projection: { emailHash: 0, ipHash: 0 } }).toArray()
      });
      await database.collection("privacy_requests").updateOne({ id: request.id }, {
        $set: { exportPreparedAt: now(), exportPreparedBy: req.admin.email },
        $push: { history: { action: "personal_data_export_prepared", at: now(), adminEmail: req.admin.email } }
      });
      res.setHeader("Cache-Control", "no-store, private");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="quickcart-personal-data-export.json"');
      return res.status(200).send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error("Privacy export failed:", error?.message || error);
      return res.status(500).json({ error: "Unable to prepare the personal-data export.", code: "PRIVACY_EXPORT_FAILED" });
    }
  });

  // Buyer erasure is deliberately scoped: financial/order evidence is retained and direct buyer identifiers are anonymised.
  // Seller account/store erasure remains a reviewed process because seller records contain other people's order data.
  app.post("/api/admin/privacy/requests/:id/execute-erasure", adminAuth, async (req, res) => {
    try {
      const database = await db();
      if (typeof database.withTransaction !== "function") {
        return res.status(503).json({ error: "Safe erasure is unavailable because transactional database support is not configured.", code: "PRIVACY_ERASURE_TRANSACTION_REQUIRED" });
      }

      const requestId = String(req.params.id || "");
      const confirmation = String(req.body?.confirmation || "");
      const confirmEmail = String(req.body?.confirmEmail || "").trim().toLowerCase();
      if (confirmation !== "ERASE" || !confirmEmail || req.body?.confirmNoLegalHold !== true) {
        return res.status(400).json({ error: "Confirm the exact requester email, type ERASE, and complete the legal-hold review before proceeding.", code: "PRIVACY_ERASURE_CONFIRMATION_REQUIRED" });
      }

      const result = await database.withTransaction(async session => {
        const requests = database.collection("privacy_requests");
        const customerUsers = database.collection("customer_users");
        const orders = database.collection("orders");
        const customers = database.collection("customers");
        const options = { session };
        const request = await requests.findOne({ id: requestId }, options);
        if (!request) return { error: "Privacy request not found.", status: 404 };
        if (request.type !== "erasure") return { error: "This request is not an erasure request.", status: 400 };
        if (request.status !== "in_progress") return { error: "Move the request to in progress before executing erasure.", status: 409 };
        if (request.verificationStatus !== "verified") return { error: "Identity must be verified before erasure.", status: 409, code: "PRIVACY_IDENTITY_GUARD" };
        if (confirmEmail !== String(request.email || "").trim().toLowerCase()) {
          return { error: "The confirmation email must exactly match the verified requester.", status: 400, code: "PRIVACY_ERASURE_CONFIRMATION_REQUIRED" };
        }

        const email = String(request.email || "").trim().toLowerCase();
        const buyer = await customerUsers.findOne({ email }, options);
        if (!buyer) return { error: "No buyer account was found for this requester. Seller accounts and seller workspaces are not automatically erased by this workflow.", status: 409, code: "PRIVACY_BUYER_ACCOUNT_NOT_FOUND" };

        const orderFilter = { $or: [{ customerEmail: email }, { customerId: buyer.id }] };
        const relatedOrders = await orders.find(orderFilter, options).toArray();
        const activeOrders = relatedOrders.filter(order =>
          !["cancelled", "picked_up", "delivered"].includes(String(order.status || "").toLowerCase()) ||
          ["pending", "processing"].includes(String(order.paymentStatus || "").toLowerCase())
        );
        if (activeOrders.length) return { error: "This buyer has active or unresolved orders. Complete or resolve them before erasure.", status: 409, code: "PRIVACY_ACTIVE_ORDERS" };

        const executedAt = now();
        const orderResult = await orders.updateMany(orderFilter, {
          $set: {
            customerId: null,
            customerEmail: "",
            customerName: "Deleted customer",
            customerPhone: "",
            address: "",
            customerDataErasedAt: executedAt
          },
          $unset: { customerConfirmationTokenHash: "" }
        }, options);
        const crmResult = await customers.deleteMany({ customerEmail: email }, options);
        const buyerResult = await customerUsers.deleteOne({ id: buyer.id, email }, options);
        if (!buyerResult.deletedCount) throw new Error("Buyer account changed during erasure; transaction aborted.");

        const evidence = "Buyer account removed; " + Number(crmResult.deletedCount || 0) + " matching CRM record(s) removed; " + Number(orderResult.modifiedCount || 0) + " order record(s) retained with buyer identifiers anonymised. Seller profile, seller workspace and statutory/financial order evidence were not deleted.";
        await requests.updateOne({ id: request.id }, {
          $set: {
            erasureExecutedAt: executedAt,
            erasureExecutedBy: req.admin.email,
            erasureEvidence: evidence,
            updatedAt: executedAt
          },
          $push: {
            history: {
              action: "buyer_erasure_executed",
              at: executedAt,
              adminEmail: req.admin.email,
              buyerProfileDeleted: true,
              crmRecordsDeleted: Number(crmResult.deletedCount || 0),
              ordersAnonymised: Number(orderResult.modifiedCount || 0)
            }
          }
        }, options);

        return {
          executed: true,
          buyerProfileDeleted: true,
          crmRecordsDeleted: Number(crmResult.deletedCount || 0),
          ordersAnonymised: Number(orderResult.modifiedCount || 0),
          evidence
        };
      });

      if (result?.error) return res.status(result.status || 409).json({ error: result.error, ...(result.code ? { code: result.code } : {}) });
      res.setHeader("Cache-Control", "no-store");
      return res.json(result);
    } catch (error) {
      console.error("Privacy erasure failed:", error?.message || error);
      return res.status(500).json({ error: "Unable to execute buyer erasure. No partial deletion was committed.", code: "PRIVACY_ERASURE_FAILED" });
    }
  });

  app.patch("/api/admin/privacy/requests/:id", adminAuth, async (req, res) => {
    try {
      const status = req.body?.status === undefined ? undefined : String(req.body.status);
      const verificationStatus = req.body?.verificationStatus === undefined ? undefined : String(req.body.verificationStatus);
      const internalNote = req.body?.internalNote === undefined ? undefined : String(req.body.internalNote).trim().slice(0, 2000);
      const resolutionEvidence = req.body?.resolutionEvidence === undefined ? undefined : String(req.body.resolutionEvidence).trim().slice(0, 3000);
      const responseSent = req.body?.responseSent === undefined ? undefined : req.body.responseSent;
      if (status !== undefined && !statuses.has(status)) return res.status(400).json({ error: "Invalid request status." });
      if (verificationStatus !== undefined && !verificationStatuses.has(verificationStatus)) return res.status(400).json({ error: "Invalid identity-verification status." });
      if (responseSent !== undefined && typeof responseSent !== "boolean") return res.status(400).json({ error: "Response-sent must be a boolean value." });
      if (status === undefined && verificationStatus === undefined && internalNote === undefined && resolutionEvidence === undefined && responseSent === undefined) {
        return res.status(400).json({ error: "No supported changes were supplied." });
      }

      const database = await db();
      const requests = database.collection("privacy_requests");
      const existing = await requests.findOne({ id: String(req.params.id || "") });
      if (!existing) return res.status(404).json({ error: "Privacy request not found." });
      if (["completed", "declined"].includes(existing.status) && status !== "in_progress") {
        return res.status(409).json({ error: "This request is closed. Reopen it as in progress with an internal reason before changing its record.", code: "PRIVACY_REQUEST_CLOSED" });
      }
      if (["completed", "declined"].includes(existing.status) && status === "in_progress" && (internalNote ?? existing.internalNote ?? "").trim().length < 10) {
        return res.status(409).json({ error: "Record a reason of at least 10 characters before reopening this request.", code: "PRIVACY_REOPEN_GUARD" });
      }

      const nextVerification = verificationStatus ?? existing.verificationStatus;
      const nextNote = internalNote ?? existing.internalNote ?? "";
      const nextEvidence = resolutionEvidence ?? existing.resolutionEvidence ?? "";
      const nextResponseSent = responseSent ?? Boolean(existing.responseSentAt);
      if (status === "completed") {
        if (!["verified", "not_required"].includes(nextVerification) || (nextVerification === "not_required" && nextNote.trim().length < 10)) {
          return res.status(409).json({ error: "Verify the requester, or document why identity verification is not required, before completing this request.", code: "PRIVACY_IDENTITY_GUARD" });
        }
        if (nextEvidence.trim().length < 20 || !nextResponseSent) {
          return res.status(409).json({ error: "Record at least 20 characters of resolution evidence and confirm that the requester was notified before completing this request.", code: "PRIVACY_COMPLETION_GUARD" });
        }
      }
      if (status === "declined" && (nextNote.trim().length < 10 || !nextResponseSent)) {
        return res.status(409).json({ error: "Record the reason for declining and confirm that the requester was notified before closing this request.", code: "PRIVACY_DECLINE_GUARD" });
      }

      const updatedAt = now();
      const set = { updatedAt };
      if (status !== undefined) set.status = status;
      if (verificationStatus !== undefined) set.verificationStatus = verificationStatus;
      if (internalNote !== undefined) set.internalNote = internalNote;
      if (resolutionEvidence !== undefined) set.resolutionEvidence = resolutionEvidence;
      if (responseSent !== undefined) set.responseSentAt = responseSent ? (existing.responseSentAt || updatedAt) : null;
      if (status === "completed") {
        set.completedAt = updatedAt;
        set.completedBy = req.admin.email;
      }
      if (status === "in_progress" && ["completed", "declined"].includes(existing.status)) {
        set.completedAt = null;
        set.completedBy = null;
        set.responseSentAt = null;
        set.resolutionEvidence = "";
      }
      await requests.updateOne({ id: existing.id }, {
        $set: set,
        $push: { history: {
          action: "admin_updated",
          at: updatedAt,
          adminEmail: req.admin.email,
          status: status || existing.status,
          verificationStatus: verificationStatus || existing.verificationStatus,
          resolutionEvidenceRecorded: Boolean(nextEvidence.trim()),
          responseSent: nextResponseSent
        } }
      });
      const updated = await requests.findOne({ id: existing.id }, { projection: { ipHash: 0, emailHash: 0 } });
      res.setHeader("Cache-Control", "no-store");
      res.json({ request: updated });
    } catch (error) {
      console.error("Admin privacy request update failed:", error?.message || error);
      res.status(500).json({ error: "Unable to update privacy request.", code: "PRIVACY_REQUEST_UPDATE_FAILED" });
    }
  });
}
