const { getClient } = require('../lib/redisClient');

const COST_PER_JOB = 10;

/**
 * Atomically deduct points from tenant balance using Lua script
 *
 * 候选人实现要求：
 * - Redis key 格式：`billing:${tenantId}`
 * - 使用 Lua 脚本保证原子性（禁止 GET-then-SET）
 * - 余额不足返回 { ok: false, reason: 'INSUFFICIENT' }
 * - 扣费成功返回 { ok: true, balance: <新余额> }
 *
 * Lua 脚本参考：
 *   local bal = tonumber(redis.call('GET', KEYS[1]) or 0)
 *   if bal < tonumber(ARGV[1]) then return -1 end
 *   return redis.call('DECRBY', KEYS[1], ARGV[1])
 *
 * @param {string} tenantId
 * @param {number} points - default COST_PER_JOB (10)
 * @returns {Promise<{ok: boolean, balance?: number, reason?: string}>}
 */
// eslint-disable-next-line no-unused-vars
const deduct = async (tenantId, points = COST_PER_JOB) => {
  // TODO: 实现 Lua 原子扣费
  // Use getClient() to access Redis client for implementation
  getClient();
  return { ok: false, reason: 'NOT_IMPLEMENTED' };
};

/**
 * Get current balance for a tenant
 *
 * @param {string} tenantId
 * @returns {Promise<number>}
 */
// eslint-disable-next-line no-unused-vars
const getBalance = async (tenantId) => {
  // TODO: 从 Redis 读取 billing:{tenantId} 的值
  // Use getClient() to access Redis client for implementation
  getClient();
  return 0;
};

/**
 * Idempotently seed initial balances from tenants map
 * Only sets key if it does NOT already exist (SET NX)
 *
 * @param {Object} tenants - { "tenant-001": 100, ... }
 */
// eslint-disable-next-line no-unused-vars
const seed = async (tenants) => {
  // TODO: 对每个 tenantId，使用 SET billing:{tenantId} <value> NX
  // Use getClient() to access Redis client for implementation
  getClient();
};

module.exports = { deduct, getBalance, seed, COST_PER_JOB };
