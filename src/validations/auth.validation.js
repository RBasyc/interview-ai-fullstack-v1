const Joi = require('joi');

const login = {
  body: Joi.object().keys({
    username: Joi.string().required(),
    tenantId: Joi.string().required(),
    role: Joi.string().valid('user', 'admin').default('user'),
  }),
};

module.exports = { login };
