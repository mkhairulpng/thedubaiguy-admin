# TheDubaiGuy Admin v254

Dark two-colour admin dashboard based on the approved v252 artwork, with a server-side password gate and the storefront API bridge.

## Admin security
Set these Vercel Environment Variables (Production + Preview as appropriate):
- `ADMIN_PASSWORD` — the admin password you choose.
- `ADMIN_SESSION_SECRET` — a long random secret used to sign the HttpOnly session cookie.
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL` when the shared production database is connected.

The dashboard is served through `/dashboard` only after successful authentication. The password and Stripe secrets are never placed in frontend HTML.

## Storefront connection
The linked storefront uses `https://admin.thedubaiguy.shop/api` as its API base. Product reads and Stripe Checkout are designed to be public-facing endpoints; admin-only Stripe reporting, refunds and customer/Aura/config endpoints require the admin session.

## Important
Products/orders/customers/Aura persistence is not complete until a real shared production database is connected and the Stripe webhook is wired to persist/reconcile events.
