// eslint-disable-next-line no-unused-vars
const { v4: uuidv4 } = require('uuid');
const { Queue } = require('bullmq');
const config = require('../config/config');

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
  // TODO: 实现完整的任务提交流程
  return { jobId: 'NOT_IMPLEMENTED' };
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
// eslint-disable-next-line no-unused-vars
const getJob = async (jobId, tenantId) => {
  // TODO: 实现带租户隔离的 Job 查询
  return null;
};

module.exports = { submit, getJob, JOB_QUEUE_NAME, getQueue };
