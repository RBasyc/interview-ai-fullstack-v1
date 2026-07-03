const { Worker } = require('bullmq');
const config = require('../src/config/config');
const eventBus = require('../src/lib/eventBus');
const Job = require('../src/models/job.model');

const PHASES = ['preprocess', 'transform', 'build', 'package'];
const PHASE_DELAY_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * BullMQ Worker: 处理 job-pipeline 队列中的任务
 *
 * 候选人实现要求：
 * 每个 job 按序执行 PHASES 中的 4 个阶段，每阶段：
 * 1. 等待 PHASE_DELAY_MS 毫秒（模拟处理耗时）
 * 2. 更新 MongoDB Job.phases（push { name, status: 'completed', completedAt: now }）
 * 3. 通过 eventBus 发送进度事件，让 WS Server 转发给客户端：
 *    eventBus.emit(`job:${job.data.jobId}`, {
 *      jobId: job.data.jobId,
 *      phase: phaseName,
 *      status: 'completed',
 *      progress: Math.round(((phaseIndex + 1) / PHASES.length) * 100),
 *      log: `Phase ${phaseName} completed`
 *    })
 * 4. 全部阶段完成后更新 Job.status = 'completed'
 * 5. 发生错误时更新 Job.status = 'failed' 并 eventBus.emit 带 status: 'failed'
 */
const processJob = async (job) => {
  const { jobId } = job.data;
  try {
    await Job.updateOne({ jobId }, { status: 'processing' });

    for (let i = 0; i < PHASES.length; i += 1) {
      const phaseName = PHASES[i];
      // eslint-disable-next-line no-await-in-loop
      await sleep(PHASE_DELAY_MS);
      // eslint-disable-next-line no-await-in-loop
      await Job.updateOne(
        { jobId },
        { $push: { phases: { name: phaseName, status: 'completed', completedAt: new Date() } } }
      );
      eventBus.emit(`job:${jobId}`, {
        jobId,
        phase: phaseName,
        status: 'completed',
        progress: Math.round(((i + 1) / PHASES.length) * 100),
        log: `Phase ${phaseName} completed`,
      });
    }

    await Job.updateOne({ jobId }, { status: 'completed', completedAt: new Date() });
  } catch (err) {
    await Job.updateOne({ jobId }, { status: 'failed' });
    eventBus.emit(`job:${jobId}`, {
      jobId,
      status: 'failed',
      progress: 0,
      log: `Job failed: ${err.message}`,
    });
    throw err;
  }
};

/**
 * 启动 BullMQ Worker
 * 在 src/index.js 中调用 startWorker()
 */
const startWorker = () => {
  const worker = new Worker('job-pipeline', processJob, {
    connection: { url: config.redis.url },
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`Job ${job && job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = { startWorker, PHASES };
