import { createHash } from "node:crypto";

const hash = value => createHash("sha256").update(String(value || "")).digest("hex");
const allowedTypes = new Set([
  "access", "rectification", "erasure", "restriction", "objection",
  "portability", "withdraw-consent", "automated-decision", "complaint", "other"
]);
const statuses = new Set(["received", "identity_verification", "in_progress", "completed", "declined"]);
const verificationStatuses = new Set(["pending", "verified", "not_required"]);

export function registerPrivacyRoutes(app, { db, adminAuth, randomUUID, now }) {
  app.post("/api/privacy/requests", async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim().slice(0, 100);
      const email = String(req.body?.email || "").trim().toLowerCase();
      const type = String(req.body?.type || "").trim();
      const details = String(req.body?.details || "").trim().slice(0, 3000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !name || name.length < 2 || !allowedTypes.has(type) || details.length < 10) {
        return res.status(400).json({ error: "Enter your name, a valid email, request type and at least 10 characters of explanation.", code: "INVALID_PRIVACY_REQUEST" });
      }

      const database = await db();
      const requests = database.collection("privacy_requests");
      const createdAt = now();
      const emailHash = hash(email);
      const ipHash = hash(req.ip || req.socket?.remoteAddress || "unknown");
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

  app.patch("/api/admin/privacy/requests/:id", adminAuth, async (req, res) => {
    try {
      const status = req.body?.status === undefined ? undefined : String(req.body.status);
      const verificationStatus = req.body?.verificationStatus === undefined ? undefined : String(req.body.verificationStatus);
      const internalNote = req.body?.internalNote === undefined ? undefined : String(req.body.internalNote).trim().slice(0, 2000);
      if (status !== undefined && !statuses.has(status)) return res.status(400).json({ error: "Invalid request status." });
      if (verificationStatus !== undefined && !verificationStatuses.has(verificationStatus)) return res.status(400).json({ error: "Invalid identity-verification status." });
      if (status === undefined && verificationStatus === undefined && internalNote === undefined) return res.status(400).json({ error: "No supported changes were supplied." });

      const database = await db();
      const requests = database.collection("privacy_requests");
      const existing = await requests.findOne({ id: String(req.params.id || "") });
      if (!existing) return res.status(404).json({ error: "Privacy request not found." });
      const updatedAt = now();
      const set = { updatedAt };
      if (status !== undefined) set.status = status;
      if (verificationStatus !== undefined) set.verificationStatus = verificationStatus;
      if (internalNote !== undefined) set.internalNote = internalNote;
      await requests.updateOne({ id: existing.id }, {
        $set: set,
        $push: { history: { action: "admin_updated", at: updatedAt, adminEmail: req.admin.email, status: status || existing.status, verificationStatus: verificationStatus || existing.verificationStatus } }
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
