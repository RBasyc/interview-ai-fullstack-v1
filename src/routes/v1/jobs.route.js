const express = require('express');
const passport = require('passport');
const validate = require('../../middlewares/validate');
const requireTenant = require('../../middlewares/requireTenant');
const jobValidation = require('../../validations/job.validation');

const router = express.Router();

const auth = passport.authenticate('jwt', { session: false });

/**
 * POST /v1/jobs
 *
 * 候选人实现要求：
 * 1. 使用 auth + requireTenant 保护路由
 * 2. 调用 jobService.submit(req.tenantId, req.body.payload)
 * 3. 余额不足（billingService 返回 ok:false）抛出 ApiError(402, 'Insufficient balance')
 * 4. 成功返回 201 { jobId }
 */
router.post('/', auth, requireTenant, validate(jobValidation.submitJob), (req, res) => {
  // TODO: 实现任务提交
  res.status(201).send({ jobId: 'NOT_IMPLEMENTED' });
});

/**
 * GET /v1/jobs/:id
 *
 * 候选人实现要求：
 * 调用 jobService.getJob(req.params.id, req.tenantId)，返回 Job 文档
 */
router.get('/:id', auth, requireTenant, (req, res) => {
  // TODO: 实现任务查询
  res.send({ jobId: req.params.id, status: 'NOT_IMPLEMENTED' });
});

module.exports = router;
