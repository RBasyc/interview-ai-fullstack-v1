const express = require('express');
const passport = require('passport');
const requireTenant = require('../../middlewares/requireTenant');

const router = express.Router();

const auth = passport.authenticate('jwt', { session: false });

/**
 * GET /v1/billing/balance
 *
 * 候选人实现要求：
 * 1. 使用 auth + requireTenant 中间件保护路由
 * 2. 调用 billingService.getBalance(req.tenantId)
 * 3. 返回 { tenantId: req.tenantId, balance: <number> }
 */
router.get('/balance', auth, requireTenant, (req, res) => {
  // TODO: 实现余额查询
  res.send({ tenantId: req.tenantId || 'NOT_IMPLEMENTED', balance: -1 });
});

module.exports = router;
