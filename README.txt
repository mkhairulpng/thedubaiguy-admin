# TheDubaiGuy GA4 v254 patch

This patch adds the authenticated `/api/analytics` endpoint and the Google Analytics Data API dependency.

Upload these files to the root of the `mkhairulpng/thedubaiguy-admin` repository:

- `package.json` — replace the existing root package.json
- `api/analytics.js` — create this new file
- `server/api/analytics.js` — create this new file

The endpoint requires the existing admin session cookie.

Required Vercel Production environment variables already configured:
- GA_PROPERTY_ID
- GA_MEASUREMENT_ID
- GOOGLE_CLIENT_EMAIL
- GOOGLE_PRIVATE_KEY

Do not put the JSON service-account file in GitHub.
Do not put the private key in HTML or browser JavaScript.

After the files are committed to `main`, Vercel should create a new deployment. Then test:
https://admin.thedubaiguy.shop/api/analytics

You must already be logged into the admin dashboard in the same browser. A successful response will be JSON from the Google Analytics Data API.
