const handler = require('../server/api/analytics.js');

module.exports = async function analytics(req, res) {
  return handler(req, res);
};
