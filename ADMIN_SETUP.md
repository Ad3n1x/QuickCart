# QuickCart admin access

QuickCart uses a server-side primary administrator and delegated administrator records.

## Primary administrator

The backend bootstraps `adenix271@gmail.com` as the primary administrator. This is an email identity allowlist, not a password or login bypass. The person must sign in through the normal seller authentication flow with a verified seller account matching that exact email. The backend checks the signed-in user ID and verified email on every admin request.

If this email does not yet have a verified seller account, register it through the normal QuickCart seller sign-up and complete email verification first. Use the normal account password-reset flow if the password needs to be changed; no password is stored in source code or changed by this feature.

## Granting or revoking admin access

1. Sign in to QuickCart with the primary administrator account.
2. Open `/admin`.
3. Under **Administrator access**, enter the email of an existing, verified seller account and grant access.
4. Use **Revoke** to remove delegated access later.

Only the primary administrator can grant or revoke administrators. Delegated administrators can view the admin overview but cannot manage other admins. The primary admin cannot be revoked from the dashboard.

## Current scope

The dashboard reports platform totals for buyers, sellers, stores, products and orders, plus recent store and order activity. It intentionally avoids customer contact details and destructive moderation actions. Admin records are stored in the MongoDB `admin_access` collection.

## Account migration status

Buyer and seller identities remain separate legacy account types in this release. The buyer/seller entry links do not yet merge them into one canonical account. Do not associate old records merely because email addresses match; a verified account-linking flow is still required.
