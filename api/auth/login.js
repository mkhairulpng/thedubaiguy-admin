// Explicit Vercel route for admin login.
// Uses Vercel's built-in JSON body parsing; delegates authentication to the existing server handler.
module.exports = require('../../server/api/auth/login.js');
