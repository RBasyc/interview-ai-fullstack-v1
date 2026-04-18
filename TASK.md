# AI 全栈工程师面试实测任务书 V1

**考核时长：** 120 分钟 | **版本：** V1.0 | **骨架：** interview-ai-fullstack-v1

## 考核主题

在生产级 Express 样板基础上，扩展以下 5 个模块，完成端到端 Demo：

**登录（JWT）→ 余额查询 → 提交任务 → BullMQ 流水线 → WebSocket 实时进度**

## 模块一览

| 模块 | 分支 | 分值 | 核心要求 |
|------|------|------|---------|
| A 多租户 Auth | feat/auth | 15 | tenantId 写入 JWT claim；requireTenant 中间件；前端 login.jsx 实现登录 fetch + token 存储 |
| B Redis 计费 | feat/billing | 20 | Lua 原子扣费；余额查询；startup seed |
| C BullMQ 队列 | feat/jobs | 25 | 提交任务；4-Phase Worker；MongoDB 状态 |
| D WebSocket | feat/ws-progress | 20 | WS 鉴权（token query）；事件推送；前端 dashboard.jsx 实现 WS 连接 + 进度条更新 |
| E Docker + Git | chore/compose | 10 | 创建 frontend/Dockerfile；补全四服务 healthcheck / depends_on / volumes；语义化 commit |
| 工程过程 | — | 10 | `.claude/` 目录包含本次会话记录并 commit；SELF-REVIEW.md 四题必答 |

## 快速开始

```bash
# 1. Fork 并 clone 本仓库到自己账号
git clone git@github.com:<你的账号>/interview-ai-fullstack-v1.git
cd interview-ai-fullstack-v1

# 2. 配置环境变量
cp .env.example .env

# 3. 完成 Module E 后一键启动所有服务（backend · frontend · mongodb · redis）
docker compose up -d
# backend  → http://localhost:3000
# frontend → http://localhost:3001
# mongodb  → localhost:27017
# redis    → localhost:6379
```

## 关键技术约束

- `tenantId` 必须从 JWT claim 读取，禁止从 body/header 取值
- Redis 扣费必须使用 Lua 脚本（禁止 GET-then-SET）
- WebSocket token 通过 query 传递：`/ws/job/:id?token=<jwt>`
- 容器间通讯使用服务名（禁止 localhost）；浏览器访问 backend 用 localhost:3000
- 至少 4 个 feature 分支，语义化 commit

## 演示

完成后在浏览器走完完整链路：

`http://localhost:3001/login` → 登录 → 提交任务 → 实时看到 preprocess → transform → build → package 进度条

## SELF-REVIEW（10 分，必交）

```bash
cp SELF-REVIEW.template.md SELF-REVIEW.md
```

打开 `SELF-REVIEW.md`，按模板填写四个问题（追问过程、卡住的地方、架构延伸、回头看）及 3 条 Claude Code prompt 原文。写完后 commit。

> 这 10 分不看代码写得多好，看你怎么思考、怎么用 AI、遇到问题怎么解。

## 交付

1. 合并所有 feature 分支到 main
2. 将本次 Claude Code 会话记录（`.jsonl`）放入 `.claude/` 目录并 commit
3. commit SELF-REVIEW.md
4. 推送到自己 GitHub 仓库，当场交 URL
