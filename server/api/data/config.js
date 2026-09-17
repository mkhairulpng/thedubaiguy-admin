const { json } = require("../_lib");
const { requireAdmin } = require("../auth/_auth");

module.exports = function handler(req, res) {
  if (!requireAdmin(req,res)) return;
  json(res, 200, {
    version: "250",
    dashboard: "TheDubaiGuy Admin",
    storefront: "https://www.thedubaiguy.shop",
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || "406063934"
  });
};
