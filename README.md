# TheDubaiGuy Admin v254 — Full GitHub Upload

This ZIP is the complete admin project for the Vercel Hobby deployment.

## Sidebar layout in this build

### Store
- Dashboard
- Orders
- Products
- Inventory
- Customers

### Growth
- Aura Membership
- Gift Cards
- Marketing
- Social Insights

### Finance
- Stripe
- Journal
- Audit & Taxation

### Operations
- Cashier (POS)
- Shipping
- Logistics

### Utility
- Open Store
- Inbox
- Settings

Utility is visually separated and pinned to the bottom of the sidebar.

## Google Analytics

The project includes the Google Analytics Data API backend at `server/api/analytics.js` and the consolidated route at `api/[...route].js`.

Do NOT put the Google service-account JSON/key file in this repository or ZIP.

The Vercel Production environment variables that must remain configured are:
- `GA_MEASUREMENT_ID`
- `GA_PROPERTY_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

The Google service account must have access to the GA4 property and the Google Analytics Data API must be enabled. Google documents service-account authentication and `runReport` in the Data API quickstart:
https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart

No additional Google Analytics file upload is required from the user. Keep the credential values in Vercel Environment Variables only.

## Upload

Upload the contents of this folder to the root of `mkhairulpng/thedubaiguy-admin` on the `main` branch. Replace existing files with these versions. Do not upload this ZIP itself into the repository.
