# QuickCart admin access

QuickCart's admin overview is a restricted, read-only operations page.

## Enable an administrator

1. In the Render dashboard, open the QuickCart API service.
2. Add an environment variable named `ADMIN_EMAILS`.
3. Set its value to the exact email address of an existing, verified seller account. Multiple addresses may be comma-separated.
4. Save the environment variable and allow Render to redeploy the API.
5. Sign in to QuickCart with that seller account, then open `/admin` on the QuickCart frontend.

The backend checks the signed-in seller identity against the server-side allowlist on every admin API request. A frontend route or a self-selected profile field cannot grant admin access. Do not put the allowlist in a frontend `VITE_*` variable.

## Current scope

The admin page reports platform totals for buyers, sellers, stores, products and orders, plus recent store and order activity. It does not expose customer contact details or provide destructive moderation controls. Add additional admin actions only with explicit authorization checks, audit logging and confirmation flows.
