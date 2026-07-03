const { v4: uuidv4 } = require('uuid');
const { Queue } = require('bullmq');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const billingService = require('./billingService');
const Job = require('../models/job.model');
const { PHASES } = require('../../workers/jobWorker');

const JOB_QUEUE_NAME = 'job-pipeline';

let queue;
const getQueue = () => {
  if (!queue) {
    queue = new Queue(JOB_QUEUE_NAME, {
      connection: { url: config.redis.url },
    });
  }
  return queue;
};

/**
 * Submit a new job: deduct billing → enqueue → save to MongoDB
 *
 * 候选人实现要求：
 * 1. 调用 billingService.deduct(tenantId)，若失败抛出 ApiError(402, 'Insufficient balance')
 * 2. 生成 jobId = uuidv4()
 * 3. 将 job 加入 BullMQ 队列：getQueue().add(jobId, { jobId, tenantId, phases: PHASES })
 * 4. 在 MongoDB 创建 Job 文档：{ jobId, tenantId, status: 'queued', phases: [] }
 * 5. 返回 { jobId }
 *
 * @param {string} tenantId
 * @param {Object} payload - request body payload (stored for reference)
 * @returns {Promise<{jobId: string}>}
 */
// eslint-disable-next-line no-unused-vars
const submit = async (tenantId, payload) => {
  const billing = await billingService.deduct(tenantId);
  if (!billing.ok) {
    throw new ApiError(httpStatus.PAYMENT_REQUIRED, 'Insufficient balance');
  }
  const jobId = uuidv4();
  await getQueue().add(jobId, { jobId, tenantId, phases: PHASES });
  await Job.create({ jobId, tenantId, status: 'queued', phases: [] });
  return { jobId };
};

/**
 * Get job by jobId, enforcing tenant isolation
 *
 * 候选人实现要求：
 * - 查询 MongoDB Job 时必须包含 { jobId, tenantId } 两个条件
 * - 若不存在或 tenantId 不匹配，返回 null
 *
 * @param {string} jobId
 * @param {string} tenantId
 * @returns {Promise<Job|null>}
 */
const getJob = async (jobId, tenantId) => {
  // 租户隔离：必须同时按 jobId + tenantId 查询
  return Job.findOne({ jobId, tenantId });
};

module.exports = { submit, getJob, JOB_QUEUE_NAME, getQueue };
