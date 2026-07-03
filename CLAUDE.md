# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is a **timed (120 min) AI full-stack interview skeleton**, built on top of
[node-express-boilerplate](https://github.com/hagopj13/node-express-boilerplate). The boilerplate
(auth plumbing, error handling, mongoose plugins, docs, tests) is complete; five feature modules are
intentionally left as stubs for the candidate to implement. See [TASK.md](./TASK.md) for the graded
requirements and [SELF-REVIEW.template.md](./SELF-REVIEW.template.md) for the written deliverable.

The demo flow being built end-to-end: **login (JWT) → balance query → submit job → BullMQ 4-phase
pipeline → live progress over WebSocket**.

## Commands

Backend (root):

```bash
pnpm dev                 # nodemon src/index.js (NODE_ENV=development)
pnpm test                # jest -i (serial; required — tests share a Mongo test DB)
pnpm test -- auth.test   # run a single test file by name substring
pnpm test:watch
pnpm coverage
pnpm lint                # eslint (airbnb-base + security + prettier)
pnpm lint:fix
```

Frontend (`frontend/`, separate package):

```bash
pnpm dev                 # next dev on port 3001
pnpm build && pnpm start
```

Full stack via Docker (only works after Module E is completed):

```bash
docker compose up -d     # backend:3000 · frontend:3001 · mongodb:27017 · redis:6379
```

Husky runs `lint-staged` (eslint + prettier) on pre-commit.

## The five stub modules (where the real work is)

Each stub has a `TODO` and a Chinese doc-comment spelling out the exact required behavior. Implement
against those comments — they encode the grading rubric.

| Module | Files with stubs |
|--------|------------------|
| A Multi-tenant auth | [src/middlewares/requireTenant.js](src/middlewares/requireTenant.js), [frontend/pages/login.jsx](frontend/pages/login.jsx) |
| B Redis billing | [src/services/billingService.js](src/services/billingService.js) (`deduct`/`getBalance`/`seed`) |
| C BullMQ jobs | [src/services/jobService.js](src/services/jobService.js), [workers/jobWorker.js](workers/jobWorker.js), [src/models/job.model.js](src/models/job.model.js), [src/routes/v1/jobs.route.js](src/routes/v1/jobs.route.js) |
| D WebSocket | [src/lib/wsServer.js](src/lib/wsServer.js), [frontend/pages/dashboard.jsx](frontend/pages/dashboard.jsx) |
| E Docker/Git | [docker-compose.yml](docker-compose.yml) (TODO markers), missing `frontend/Dockerfile` |

## Architecture

**Request/data flow for a job:** `POST /v1/jobs` → `auth` (passport-jwt) → `requireTenant` →
`jobService.submit` calls `billingService.deduct` (Redis Lua) → enqueues to BullMQ `job-pipeline`
queue → persists a `Job` doc in Mongo. A separate `Worker` ([workers/jobWorker.js](workers/jobWorker.js))
drains the queue, runs 4 phases (`preprocess → transform → build → package`), and after each phase
emits `job:${jobId}` on the in-process `eventBus`. The WS server ([src/lib/wsServer.js](src/lib/wsServer.js))
subscribes to that event per connection and forwards progress to the browser.

**Process wiring:** [src/index.js](src/index.js) is the entrypoint — it connects Mongo, seeds tenant
balances, starts the HTTP server ([src/app.js](src/app.js)), attaches the WS server to that HTTP
server, and starts the BullMQ worker **in the same process**. The Express app itself is built in
`app.js` and knows nothing of WS/workers.

**Key indirection layers** (already implemented — reuse, don't reinvent):
- [src/lib/eventBus.js](src/lib/eventBus.js) — a shared Node `EventEmitter` connecting worker → WS server.
- [src/lib/redisClient.js](src/lib/redisClient.js) — lazily-created singleton ioredis client via `getClient()`.
- [src/services/jobService.js](src/services/jobService.js) — lazily-created singleton BullMQ `Queue` via `getQueue()`.
- Route → validation → controller → service is the standard layering; new endpoints follow the same shape.

**Auth model (interview-simplified):** [src/services/token.service.js](src/services/token.service.js)
signs a JWT carrying `{ sub, tenantId, role }`. [src/config/passport.js](src/config/passport.js)
does **not** hit the DB — the JWT claims *are* the user context (`req.user = { id, tenantId, role }`).
Login is a single stubbed `POST /v1/auth/login`; there is no user registration in scope.

## Non-negotiable constraints (graded)

> ### ⛔ 违反即淘汰 (elimination triggers) — 违反任一条直接判负，实现时逐条自检
>
> 1. **tenantId 来源** — 只能读 `req.user.tenantId`（JWT claim）；**禁止** body / query / `x-tenant-id` header。→ [requireTenant.js](src/middlewares/requireTenant.js)
> 2. **Redis 扣费** — 必须单条 **Lua 脚本**原子完成；**禁止** GET-then-SET。→ [billingService.js](src/services/billingService.js) `deduct`
> 3. **WebSocket 鉴权** — token 走 query `?token=`；鉴权失败 `ws.close(4001)`；断开时 **必须** `eventBus.off` 移除监听器。→ [wsServer.js](src/lib/wsServer.js)
> 4. **租户隔离** — 所有 Mongo `Job` 查询必须同时按 `{ jobId, tenantId }` 过滤。→ [jobService.js](src/services/jobService.js) `getJob`、[wsServer.js](src/lib/wsServer.js)
> 5. **容器网络** — 容器间用服务名 `mongodb` / `redis`；**禁止** `localhost`；浏览器访问 backend 用 `localhost:3000`。→ [docker-compose.yml](docker-compose.yml)、`.env`
> 6. **计费常量** — 播种幂等（`SET ... NX`）自 [seed/tenants.json](seed/tenants.json)；`COST_PER_JOB = 10`。→ [billingService.js](src/services/billingService.js) `seed`
> 7. **工程过程** — ≥4 个 feature 分支 + 语义化 commit；`.claude/` 会话记录与 `SELF-REVIEW.md` 必须 commit。

- `tenantId` must come **only** from the JWT claim (`req.user.tenantId`), never from body/query/headers.
- All Mongo `Job` queries must filter by `{ jobId, tenantId }` for tenant isolation.
- Redis balance deduction must be a **single Lua script** (atomic) — no GET-then-SET.
- Balance seeding is idempotent (`SET ... NX`) from [seed/tenants.json](seed/tenants.json); `COST_PER_JOB = 10`.
- WebSocket URL passes the token via query: `ws://host/ws/job/:jobId?token=<jwt>`; close with code
  `4001` on auth failure and always remove eventBus listeners on disconnect.
- In Docker, services talk over the compose network by **service name** (`mongodb`, `redis`), never
  `localhost`; the browser reaches the backend at `localhost:3000`.
- Use ≥4 feature branches with semantic commits (see the branch column in [TASK.md](./TASK.md)).

## Notes

- Package manager is **pnpm** (root and frontend are separate workspaces, each with its own lockfile).
- `MONGODB_URL` automatically gets a `-test` suffix when `NODE_ENV=test` (see [src/config/config.js](src/config/config.js)).
- Config is validated by Joi at startup; a missing required env var throws immediately.
- Docs route (`/v1/docs`, swagger) is registered only in development.
