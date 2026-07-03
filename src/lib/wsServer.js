const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const eventBus = require('./eventBus');
const Job = require('../models/job.model');

/**
 * Attach WebSocket server to an existing HTTP server
 *
 * 候选人实现要求：
 * 1. 创建 WebSocket.Server({ server, path: '/ws/job' })（注意：路由通过 handleProtocols 或 URL 解析区分）
 *    实际 URL 格式：ws://host/ws/job/:jobId?token=<jwt>
 * 2. 在 connection 事件中：
 *    a. 解析 request.url，提取 jobId 和 token query 参数
 *    b. 用 jwt.verify(token, config.jwt.secret) 验证 token
 *    c. 查询 MongoDB 确认 job.tenantId === tokenPayload.tenantId（租户隔离）
 *    d. 验证失败则 ws.close(4001, 'Unauthorized')
 *    e. 验证成功则监听 eventBus 上的 `job:${jobId}` 事件，收到后 ws.send(JSON.stringify(event))
 *    f. 收到 progress === 100 的事件后，延迟 500ms 关闭连接
 * 3. 客户端断开时移除 eventBus 监听器（防止内存泄漏）
 *
 * @param {http.Server} server - Express HTTP server instance
 * @returns {WebSocket.Server}
 */
const attachWsServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, request) => {
    try {
      // URL 格式：/ws/job/:jobId?token=<jwt>
      const parsed = new URL(request.url, 'http://localhost');
      const match = parsed.pathname.match(/^\/ws\/job\/([^/]+)$/);
      const jobId = match && match[1];
      const token = parsed.searchParams.get('token');

      if (!jobId || !token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      // token 从 query 读取并验证；失败一律 close 4001
      let payload;
      try {
        payload = jwt.verify(token, config.jwt.secret);
      } catch (err) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      // 租户隔离：确认该 job 属于 token 所属租户
      const job = await Job.findOne({ jobId, tenantId: payload.tenantId });
      if (!job) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const listener = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
        if (event.progress === 100) {
          setTimeout(() => ws.close(), 500);
        }
      };
      eventBus.on(`job:${jobId}`, listener);

      // 断开时移除监听器，防止内存泄漏
      ws.on('close', () => {
        eventBus.off(`job:${jobId}`, listener);
      });
    } catch (err) {
      ws.close(4001, 'Unauthorized');
    }
  });

  return wss;
};

module.exports = { attachWsServer };
