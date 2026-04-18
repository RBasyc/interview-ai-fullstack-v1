const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config');

/**
 * Generate a simple access token with tenantId claim
 * @param {Object} payload - { username, tenantId, role }
 * @returns {string} signed JWT
 */
const generateSimpleToken = ({ username, tenantId, role }) => {
  const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  return jwt.sign(
    {
      sub: username,
      tenantId,
      role,
      iat: moment().unix(),
      exp: expires.unix(),
      type: 'access',
    },
    config.jwt.secret
  );
};

module.exports = { generateSimpleToken };
