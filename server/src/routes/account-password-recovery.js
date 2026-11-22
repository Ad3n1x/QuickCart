const genericMessage = "If an account exists for that email, a password reset link will be sent shortly.";
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
const normalizeEmail = value => String(value || "").trim().toLowerCase();
const hashValue = value => String(value || "");

export function registerAccountPasswordRecoveryRoutes(app, { db, hashToken, randomBytes, bcrypt, sendAccountPasswordResetEmail }) {
  const accounts = {
    seller: { collection: "users", prefix: "/api/auth", path: "/auth/reset-password" },
    buyer: { collection: "customer_users", prefix: "/api/customer/auth", path: "/marketplace/auth/reset-password" }
  };

  for (const [accountType, config] of Object.entries(accounts)) {
    app.post(config.prefix + "/forgot-password", async (req, res) => {
      const generic = () => res.status(200).json({ message: genericMessage });
      try {
        const email = normalizeEmail(req.body?.email);
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) return res.status(400).json({ error: "Enter a valid email address.", code: "INVALID_EMAIL" });
        const database = await db();
        const collection = database.collection(config.collection);
        const account = await collection.findOne({ email, emailVerified: true }, { projection: { id: 1, name: 1, email: 1 } });
        if (!account) return generic();

        const now = new Date();
        const emailHash = hashToken(email);
        const ipHash = hashToken(String(req.ip || req.headers["x-forwarded-for"] || "unknown"));
        const attempts = database.collection("account_password_reset_attempts");
        await attempts.deleteMany({ createdAt: { $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } });
        const recent = await attempts.countDocuments({ createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) }, $or: [{ emailHash }, { ipHash }] });
        if (recent >= 5) return generic();
        await attempts.insertOne({ accountType, emailHash, ipHash, createdAt: now });

        const rawToken = randomBytes(32).toString("hex");
        const tokenHash = hashToken(rawToken);
        const resets = database.collection("account_password_resets");
        await resets.deleteMany({ accountType, accountId: account.id });
        await resets.insertOne({ accountType, accountId: account.id, tokenHash, createdAt: now, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) });

        const base = "https://ad3n1x.github.io/QuickCart";
        const resetUrl = base + config.path + "?token=" + encodeURIComponent(rawToken);
        try {
          const delivery = await sendAccountPasswordResetEmail(account.email, account.name || "there", resetUrl, accountType);
          console.info("QuickCart account password reset email accepted by Brevo.", { accountType, messageId: delivery?.messageId || null });
        } catch (error) {
          await resets.deleteMany({ accountType, accountId: account.id, tokenHash });
          console.error("QuickCart account password reset email failed.", { accountType, code: error?.code || null, message: error?.message || "Unknown email error" });
        }
        return generic();
      } catch (error) {
        console.error("QuickCart account password recovery request failed.", { accountType, message: error?.message || "Unknown error" });
        return generic();
      }
    });

    app.post(config.prefix + "/reset-password", async (req, res) => {
      try {
        const token = String(req.body?.token || "");
        const password = String(req.body?.password || "");
        if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ error: "This reset link is invalid or has expired.", code: "PASSWORD_RESET_INVALID" });
        if (!passwordPattern.test(password)) return res.status(400).json({ error: "Use 8–128 characters with uppercase, lowercase, a number and a symbol.", code: "PASSWORD_POLICY" });

        const database = await db();
        const resets = database.collection("account_password_resets");
        const tokenHash = hashToken(token);
        const reset = await resets.findOneAndDelete({ accountType, tokenHash, expiresAt: { $gt: new Date() } });
        const record = reset?.value || reset;
        if (!record?.accountId) return res.status(400).json({ error: "This reset link is invalid, expired, or has already been used.", code: "PASSWORD_RESET_INVALID" });

        const passwordHash = await bcrypt.hash(password, 12);
        const result = await database.collection(config.collection).updateOne({ id: record.accountId }, { $set: { passwordHash, passwordChangedAt: new Date() } });
        if (!result.matchedCount) return res.status(400).json({ error: "This account could not be found. Request a new reset link.", code: "PASSWORD_RESET_ACCOUNT_MISSING" });
        await resets.deleteMany({ accountType, accountId: record.accountId });
        res.setHeader("Cache-Control", "no-store");
        return res.json({ message: "Your password has been updated. You can now sign in with your new password." });
      } catch (error) {
        console.error("QuickCart account password reset failed.", { accountType, message: error?.message || "Unknown error" });
        return res.status(500).json({ error: "Unable to reset your password. Request a new link and try again." });
      }
    });
  }
}
