const express = require('express');
const passport = require('passport');
const httpStatus = require('http-status');
const validate = require('../../middlewares/validate');
const requireTenant = require('../../middlewares/requireTenant');
const jobValidation = require('../../validations/job.validation');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const jobService = require('../../services/jobService');

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
router.post(
  '/',
  auth,
  requireTenant,
  validate(jobValidation.submitJob),
  catchAsync(async (req, res) => {
    // 余额不足时 jobService.submit 抛出 ApiError(402)
    const result = await jobService.submit(req.tenantId, req.body.payload);
    res.status(httpStatus.CREATED).send(result);
  })
);

/**
 * GET /v1/jobs/:id
 *
 * 候选人实现要求：
 * 调用 jobService.getJob(req.params.id, req.tenantId)，返回 Job 文档
 */
router.get(
  '/:id',
  auth,
  requireTenant,
  catchAsync(async (req, res) => {
    // 租户隔离查询：仅返回属于当前 tenant 的 job
    const job = await jobService.getJob(req.params.id, req.tenantId);
    if (!job) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
    }
    res.send(job);
  })
);

module.exports = router;
