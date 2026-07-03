const { getClient } = require('../lib/redisClient');

const COST_PER_JOB = 10;

// 单条 Lua 脚本：原子读取余额→判断→DECRBY，禁止 GET-then-SET
// 余额不足返回 -1，否则返回扣费后的新余额
const DEDUCT_LUA = `
local bal = tonumber(redis.call('GET', KEYS[1]) or 0)
if bal < tonumber(ARGV[1]) then return -1 end
return redis.call('DECRBY', KEYS[1], ARGV[1])
`;

const key = (tenantId) => `billing:${tenantId}`;

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
const deduct = async (tenantId, points = COST_PER_JOB) => {
  const client = getClient();
  const result = await client.eval(DEDUCT_LUA, 1, key(tenantId), points);
  if (Number(result) === -1) {
    return { ok: false, reason: 'INSUFFICIENT' };
  }
  return { ok: true, balance: Number(result) };
};

/**
 * Get current balance for a tenant
 *
 * @param {string} tenantId
 * @returns {Promise<number>}
 */
const getBalance = async (tenantId) => {
  const client = getClient();
  const value = await client.get(key(tenantId));
  return Number(value) || 0;
};

/**
 * Idempotently seed initial balances from tenants map
 * Only sets key if it does NOT already exist (SET NX)
 *
 * @param {Object} tenants - { "tenant-001": 100, ... }
 */
const seed = async (tenants) => {
  const client = getClient();
  // 幂等播种：仅当 key 不存在时写入（SET ... NX）
  await Promise.all(Object.entries(tenants || {}).map(([tenantId, value]) => client.set(key(tenantId), value, 'NX')));
};

module.exports = { deduct, getBalance, seed, COST_PER_JOB };
