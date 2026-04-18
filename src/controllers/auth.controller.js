const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const tokenService = require('../services/token.service');

const login = catchAsync(async (req, res) => {
  const { username, tenantId, role } = req.body;
  const token = tokenService.generateSimpleToken({ username, tenantId, role });
  res.status(httpStatus.OK).send({ token });
});

module.exports = { login };
