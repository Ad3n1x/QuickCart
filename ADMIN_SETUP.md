# QuickCart private administrator authentication

QuickCart administration uses a dedicated login and a separate JWT signing secret. It does not use seller or customer passwords, sessions, or tokens.

## Required Render environment variables

Set these on the **QuickCart API service** in Render:

- `ADMIN_EMAIL`: the administrator email address (defaults to `adenix271@gmail.com` if omitted).
- `ADMIN_PASSWORD_HASH`: bcrypt hash for the private admin password. Never store the plaintext password in GitHub or send it in chat.
- `ADMIN_JWT_SECRET`: a new, unique, high-entropy secret used only to sign admin sessions. Do not reuse `JWT_SECRET`.

Generate a password hash locally:

1. Pull the latest project and install dependencies with `npm install`.
2. Run `npm run admin:hash` in a local interactive terminal.
3. Enter and confirm a strong password when prompted. Input is not echoed.
4. Copy the resulting bcrypt hash directly into Render's `ADMIN_PASSWORD_HASH` environment variable.

Generate a separate admin JWT secret locally with Node:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copy the output into Render as `ADMIN_JWT_SECRET`. Do not commit either value. Save your password in a trusted password manager.

## Sign in

- Private login: `/admin/login`
- Control Centre: `/admin`

Admin sessions expire after 8 hours. Signing out removes only the admin session; seller and customer sessions remain separate. There is no public admin registration or password-reset endpoint. To change the password, generate a new hash and replace `ADMIN_PASSWORD_HASH` in Render, then redeploy/restart the API. Rotating `ADMIN_JWT_SECRET` invalidates existing admin sessions.

## Security boundaries

- Admin API endpoints require a token signed with `ADMIN_JWT_SECRET` and carrying the admin role.
- Seller middleware explicitly rejects admin-role tokens.
- Admin requests use `quickcart_admin_token` in the browser and never fall back to seller tokens.
- Admin credentials are not embedded in source code.
- Delegated administrator invitations are intentionally not enabled yet. Add them only with a separate secure provisioning and revocation flow.

If the environment variables are missing, private admin login stays disabled. Do not fall back to seller authentication.
