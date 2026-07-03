Ready for review
Select text to add comments on the plan
计划：实现 interview-ai-fullstack-v1（5 个模块）+ 将淘汰级约束写入 CLAUDE.md
背景
这是一个限时（120 分钟）的 AI 全栈面试骨架。样板部分（认证管线、错误处理、mongoose、配置）已完成； 五个功能模块以桩（stub）形式留空，每个桩都带有一段中文文档注释，注释即评分标准。需要跑通的端到端 Demo： 登录（JWT）→ 余额查询 → 提交任务 → BullMQ 四阶段流水线 → WebSocket 实时进度。

用户要求：(1) 把 TASK.md 中的关键约束（违反即淘汰） 写入 CLAUDE.md，确保实现过程中绝不违反；(2) 将工作拆解为多个 phase，逐一完成。

探索确认：进程接线已完成（src/index.js 在同一进程内启动 HTTP + WS + BullMQ worker； 路由 / passport / token / config 均已就绪）。工作只集中在桩函数体内。

淘汰级约束（写入 CLAUDE.md —— 违反任一即淘汰）
CLAUDE.md 已有 "Non-negotiable constraints (graded)" 一节。Phase 0 会在该节顶部追加一个显式的 "⛔ 违反即淘汰 (elimination triggers)" 区块，逐条重申，并标注负责该约束的文件：

tenantId 只能来自 req.user.tenantId（JWT claim）—— 禁止 body/query/x-tenant-id。→ requireTenant.js
Redis 扣费必须是单条 Lua 脚本（原子）—— 禁止 GET-then-SET。→ billingService.deduct
WS token 通过 query ?token= 传递；鉴权失败 close code 4001；断开时必须移除 eventBus 监听器。→ wsServer.js
所有 Mongo Job 查询必须同时按 { jobId, tenantId } 过滤。→ jobService.getJob、wsServer
容器间通讯用服务名（mongodb、redis）；浏览器访问 backend 用 localhost:3000。→ docker-compose.yml、.env
播种幂等（SET ... NX）；COST_PER_JOB = 10。→ billingService.seed
≥4 个 feature 分支 + 语义化 commit；.claude/ 会话记录 + SELF-REVIEW.md 提交。
各阶段（按顺序执行；每个模块一个 feature 分支）
Phase 0 —— CLAUDE.md 约束 + 分支准备
编辑 CLAUDE.md：在约束节顶部加入上述淘汰区块。
从 HEAD 恢复被删除的 .env.example（URL 用服务名 mongodb/redis）。
每个模块在独立分支上做：feat/auth、feat/billing、feat/jobs、feat/ws-progress、chore/compose，语义化 commit。
Phase A —— 多租户 Auth（feat/auth）
src/middlewares/requireTenant.js：读 req.user.tenantId；缺失 → next(new ApiError(httpStatus.UNAUTHORIZED, 'Tenant required'))；否则设 req.tenantId 并 next()。禁止读 body/query/header。（ApiError、httpStatus 已 import。）
frontend/pages/login.jsx handleSubmit：POST ${NEXT_PUBLIC_BACKEND_URL}/v1/auth/login body {username,tenantId,role}；成功后将 token + tenantId 存入 localStorage → router.push('/dashboard')。
后端认证链（passport/token/controller/route/validation）已完成 —— 不改动。
Phase B —— Redis 计费（feat/billing）
src/services/billingService.js 通过 getClient()（redisClient.js）：
deduct(tenantId, points=COST_PER_JOB)：client.eval(LUA, 1, 'billing:'+tenantId, points)，Lua 用文档注释里的（GET→比较→DECRBY，不足返回 -1）。-1→{ok:false,reason:'INSUFFICIENT'}，否则 {ok:true,balance:result}。单条 Lua —— 禁止 GET-then-SET。
getBalance(tenantId)：Number(await client.get('billing:'+tenantId)) || 0。
seed(tenants)：对每个 [id,val] → client.set('billing:'+id, val, 'NX')（幂等）。
src/routes/v1/billing.route.js 余额 handler：import billingService，res.send({ tenantId: req.tenantId, balance: await getBalance(req.tenantId) })。
Phase C —— BullMQ 任务（feat/jobs）
src/models/job.model.js：schema { jobId(String,required,unique), tenantId(String,required), status(enum ['queued','processing','completed','failed'], default 'queued'), phases:[{name,status,completedAt}], createdAt(default Date.now), completedAt }。
src/services/jobService.js：import uuidv4、billingService、Job、ApiError。
submit(tenantId,payload)：deduct(tenantId) → !ok 则 throw ApiError(402,'Insufficient balance')；jobId=uuidv4()；getQueue().add(jobId,{jobId,tenantId,phases:PHASES})；Job.create({jobId,tenantId,status:'queued',phases:[]})；return {jobId}。
getJob(jobId,tenantId)：Job.findOne({ jobId, tenantId }) —— 两个键做租户隔离。
src/routes/v1/jobs.route.js：import jobService；handler 用 catchAsync 包裹。POST → res.status(201).send(await submit(req.tenantId, req.body.payload))；GET /:id → 命中返回 job，null 返回 404。
workers/jobWorker.js processJob：import Job。设 processing；对每个 PHASE：await sleep(PHASE_DELAY_MS)，向 Job.phases push {name,status:'completed',completedAt}，eventBus.emit('job:'+jobId, {jobId,phase,status:'completed',progress:Math.round((i+1)/4*100),log:...})。循环后设 status:'completed'。出错设 status:'failed' 并 emit status:'failed'。
job.validation.js 已够用（payload: Joi.object().default({})）。
Phase D —— WebSocket（feat/ws-progress）
src/lib/wsServer.js attachWsServer(server)：new WebSocket.Server({ server })（或 noServer）；connection 时从 request.url 解析 jobId（路径 /ws/job/:jobId）和 token query。
jwt.verify(token, config.jwt.secret) → 失败 ws.close(4001,'Unauthorized')。
Job.findOne({ jobId, tenantId: payload.tenantId }) → 未命中 ws.close(4001)。
注册 const fn = ev => ws.send(JSON.stringify(ev)); eventBus.on('job:'+jobId, fn)；当 ev.progress===100 约 500ms 后 close。
ws.close 时 → eventBus.off('job:'+jobId, fn)（必须移除监听器）。
frontend/pages/dashboard.jsx：实现挂载 useEffect（token 守卫 + fetchBalance）、fetchBalance（GET /v1/billing/balance，Bearer）、submitJob（POST /v1/jobs body {payload:{}}，Bearer；拿到 data.jobId→connectWs；402→报错）、connectWs(jid)（连 ${NEXT_PUBLIC_WS_URL}/ws/job/${jid}?token=${token}；onmessage 更新 progress/phase/logs；progress===100→setDone(true)+fetchBalance）。
Phase E —— Docker + Git（chore/compose）
docker-compose.yml：mongodb healthcheck（mongosh --eval 'db.adminCommand("ping")'）+ volume mongodb_data；redis healthcheck（redis-cli ping）+ volume redis_data；backend depends_on mongodb+redis condition: service_healthy；frontend build args/env NEXT_PUBLIC_BACKEND_URL=http://localhost:3000 + NEXT_PUBLIC_WS_URL=ws://localhost:3000、depends_on: backend；顶层 volumes: 块。
修复 backend Dockerfile（yarn→pnpm：corepack enable、pnpm install --frozen-lockfile、CMD node src/index.js）。
新建 frontend/Dockerfile（pnpm install、NEXT_PUBLIC_* build args、next build、EXPOSE 3001、next start -p 3001）。
backend healthcheck：在 app.js 加一个极简 GET /health 返回 200（当前无健康路由），让 compose service_healthy 有意义。
Phase F —— 交付物
按模板填写 SELF-REVIEW.md（四问 + 3 条 Claude Code prompt 原文）。
确保 .claude/ 会话记录已 commit。把所有 feature 分支合并到 master。
验证（端到端）
起 backend + Redis + Mongo；pnpm test（jest -i）保持通过。
手动 API：登录拿 token；GET /v1/billing/balance → 100；POST /v1/jobs → jobId，余额降到 90；GET /v1/jobs/:id 返回 phases。
浏览器：localhost:3001/login → 登录 → 提交 → 进度条依次走 preprocess→transform→build→package（25/50/75/100），WS 推送；余额刷新为 90。
租户隔离：查别的租户的 jobId 返回 404；tenant 不匹配的 WS close 4001。
docker compose up -d 四服务全部 healthy，完整链路在 compose 网络内跑通。