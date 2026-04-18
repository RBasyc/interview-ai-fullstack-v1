const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { attachWsServer } = require('./lib/wsServer');
const { startWorker } = require('../workers/jobWorker');
const billingService = require('./services/billingService');
const tenants = require('../seed/tenants.json');

let server;

mongoose.connect(config.mongoose.url).then(async () => {
  logger.info('Connected to MongoDB');

  // 幂等初始化租户余额
  await billingService.seed(tenants);
  logger.info('Tenant balances seeded');

  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });

  // 挂载 WebSocket Server
  attachWsServer(server);
  logger.info('WebSocket server attached');

  // 启动 BullMQ Worker
  startWorker();
  logger.info('BullMQ worker started');
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('uncaughtException', exitHandler);
process.on('unhandledRejection', exitHandler);
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) server.close();
});
