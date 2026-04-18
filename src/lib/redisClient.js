const Redis = require('ioredis');
const config = require('../config/config');

let client;

const getClient = () => {
  if (!client) {
    client = new Redis(config.redis.url, { lazyConnect: false });
    client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Redis error:', err.message);
    });
  }
  return client;
};

module.exports = { getClient };
