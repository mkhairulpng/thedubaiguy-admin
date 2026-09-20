# TheDubaiGuy Admin v254 — FINAL AUTH / VERCEL PACKAGE

This is the complete admin project package for `admin.thedubaiguy.shop`.

## What this rebuild fixes

- Vercel API routing is consolidated into one catch-all function (`api/[...route].js`) so the project stays within the Vercel Hobby limit of 12 Serverless Functions.
- Authentication login is self-contained at `api/auth/login.js`.
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
- `GA_PROPERTY_ID=406063934`
- `GA_MEASUREMENT_ID=G-XXXXXXXXXX`
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


## Observability and analytics setup

This v254 package includes:
- Google Analytics 4 Data API reporting and realtime active-user reporting at `/api/analytics`.
- Vercel Web Analytics client instrumentation at `/_vercel/insights/script.js`.
- Vercel Speed Insights client instrumentation at `/_vercel/speed-insights/script.js`.
- A dashboard Observability panel showing API health, GA realtime status, Web Analytics script status, and Speed Insights script status.

### Google Analytics 4

`GA_PROPERTY_ID=406063934` is the numeric GA4 property ID used by the Data API. The service account must be granted Viewer (or higher) access to that GA4 property, and the Google Analytics Data API must be enabled. Vercel Production environment variables required for live Data API reporting:

- `GA_PROPERTY_ID=406063934`
- `GA_MEASUREMENT_ID=G-XXXXXXXXXX` (the web data-stream Measurement ID, not the numeric property ID)
- `GOOGLE_CLIENT_EMAIL=...`
- `GOOGLE_PRIVATE_KEY=...`

The private key stays server-side and is never placed in the dashboard HTML.

### Admin password

Admin authentication uses one Vercel Production variable: `ADMIN_PASSWORD`. No separate session-secret variable is required. The server derives the session-signing key from the password and stores only a signed, HttpOnly session cookie in the browser.

### Vercel Web Analytics and Speed Insights

Enable **Web Analytics** and **Speed Insights** for the Vercel project, then deploy this package. Vercel creates the corresponding `/_vercel/*` routes after the feature is enabled.

## Why the API folder contains only one file

Vercel Hobby limits deployments to 12 Serverless Functions. The previous package exposed many redundant wrapper files under `api/`, which caused the deployment to fail after a successful build. v255 keeps only `api/[...route].js`; it dispatches the existing implementations under `server/api/` for health, authentication, dashboard, products, orders, customers, Aura, POS, analytics, Stripe and Lalamove.


<!-- syntax preflight marker -->
