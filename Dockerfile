FROM node:18-alpine

# 使用 pnpm（本仓库为 pnpm 工作区，非 yarn）
RUN corepack enable

WORKDIR /usr/src/node-app

# 先拷贝 lockfile 以利用构建缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

# 单进程内同时启动 HTTP + WebSocket + BullMQ worker
CMD ["node", "src/index.js"]
