# QuickCart private administrator authentication

QuickCart administration uses a dedicated login and a separate JWT signing secret. It does not use seller or customer passwords, sessions, or tokens.

## Required Render environment variables

Set these on the **QuickCart API service** in Render:

- `ADMIN_EMAIL`: the administrator email address (defaults to `adenix271@gmail.com` if omitted).
- `ADMIN_PASSWORD_HASH`: initial bcrypt hash for the private admin password. Never store the plaintext password in GitHub or send it in chat.
- `ADMIN_JWT_SECRET`: a new, unique, high-entropy secret used only to sign admin sessions. Do not reuse `JWT_SECRET`.
- `BREVO_API_KEY` and `BREVO_FROM_EMAIL`: existing QuickCart Brevo sender configuration, used to deliver recovery emails.
- `FRONTEND_URL`: should point to the production QuickCart frontend (defaults to `https://quick-cart-three-chi.vercel.app`).

Generate the initial password hash locally:

1. Pull the latest project and install dependencies with `npm install`.
2. Run `npm run admin:hash` in a local interactive terminal.
3. Enter and confirm a strong password when prompted. Input is not echoed.
4. Copy the resulting bcrypt hash directly into Render's `ADMIN_PASSWORD_HASH` environment variable.

Generate a separate admin JWT secret locally with Node:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copy the output into Render as `ADMIN_JWT_SECRET`. Do not commit either value. Save your password in a trusted password manager.

## Private sign-in and password recovery

- Private login: `/admin/login`
- Forgot password: `/admin/forgot-password`
- Reset password: `/admin/reset-password`
- Control Centre: `/admin`

Forgot password sends a one-time link to the configured administrator email using the existing Brevo sender. The API always returns the same generic response so it does not reveal whether an email address is registered. Requests are rate-limited per administrator email and requester IP (hashed before storage).

Reset links:
- Use a cryptographically random 256-bit token.
- Only the SHA-256 hash of the token is stored in MongoDB.
- Expire after 15 minutes and can only be used once.
- Are invalidated after a successful password reset.
- Require a new password of 14–128 characters.

After a successful reset, the new bcrypt password hash is stored in the `admin_credentials` MongoDB collection and takes precedence over the initial Render `ADMIN_PASSWORD_HASH`. This allows future password changes through the recovery screen without changing Render variables. Keep the Render hash as a secure bootstrap fallback.

If Brevo is not configured, the reset email cannot be delivered. Configure the existing `BREVO_API_KEY` and `BREVO_FROM_EMAIL` variables in Render. No password-reset token or password is written to application logs.

Admin sessions expire after 8 hours. Signing out removes only the admin session; seller and customer sessions remain separate. There is no public admin registration.

## Security boundaries

- Admin API endpoints require a token signed with `ADMIN_JWT_SECRET` and carrying the admin role.
- Seller middleware explicitly rejects admin-role tokens.
- Admin requests use `quickcart_admin_token` in browser session storage and never fall back to seller tokens.
- Admin credentials and reset tokens are not embedded in source code.
- Delegated administrator invitations are intentionally not enabled yet.

If the environment variables are missing, private admin login stays disabled. Do not fall back to seller authentication.
