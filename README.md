# TheDubaiGuy Admin v254 — FINAL SIMPLE-PASSWORD / VERCEL PACKAGE

This is the complete admin project package for `admin.thedubaiguy.shop`.

## What this rebuild fixes

- Root-level Vercel API entrypoints are included for authentication and all primary admin APIs.
- Authentication login is self-contained at `api/auth/login.js`.
- Admin authentication requires only one Vercel environment variable: `ADMIN_PASSWORD`.
- Authentication session checking is self-contained at `api/auth/me.js`.
- Login cookie is URI-encoded for Safari-safe handling.
- Login page accepts the password normally and does not use an HTML `pattern` restriction.
- Login page handles non-JSON API errors without throwing a browser JSON parsing error.
- Stripe webhook has its own explicit Vercel route and raw-body handling remains in the server implementation.
- Lalamove endpoints have explicit Vercel routes.
- Dashboard remains protected and is served through `/api/dashboard`.
- Existing dashboard, assets, GA4, Stripe, Aura, POS, products, orders, customers, sync, analytics, and logistics server code are retained.

## Required Vercel Production environment variables

Keep these values in Vercel **Environment Variables**. Do not put secrets in GitHub or this ZIP.

- `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL` (if database-backed features are being used)
- `NEXT_PUBLIC_STORE_URL=https://www.thedubaiguy.shop`
- `ADMIN_APP_URL=https://admin.thedubaiguy.shop`
- `GA_MEASUREMENT_ID=406063934`
- `GA_PROPERTY_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Lalamove variables, if used, should also remain in Vercel Environment Variables.

## Deployment

Upload the **contents** of this ZIP to the root of:
`mkhairulpng/thedubaiguy-admin`

Use the `main` branch. Do not upload the ZIP file itself into the repository.

After the new commit appears on `main`, Vercel should create a new production deployment when Git integration is correctly connected. Verify that the deployment is built from the new commit before testing the custom domain.

## Verification order

1. `https://admin.thedubaiguy.shop/` loads the login page.
2. `https://admin.thedubaiguy.shop/api/auth/me` returns JSON, not a Vercel 404 page.
3. Submit the configured admin password.
4. Successful login redirects to `/dashboard`.
5. `/dashboard` loads only when the `tdg_admin` session is valid.

Do not change DNS or the storefront domain as part of this deployment.
