# SELF-REVIEW

**候选人：** 朱瑞淇

**提交时间：** 2026年7月3日16：00

**仓库 URL：** (https://github.com/RBasyc/interview-ai-fullstack-v1)

## 完成情况

勾选已完成的模块，未完成的简述卡在哪里：

- [ √ ] A 多租户 Auth（requireTenant 中间件 + login.jsx）
- [ √ ] B Redis 计费（Lua 原子扣费 + seed）
- [ √ ] C BullMQ 队列（Job Schema + Worker 4 阶段 + MongoDB 状态）
- [ √ ] D WebSocket（WS 鉴权 + 事件推送 + dashboard.jsx 进度条）
- [ √ ] E Docker（frontend/Dockerfile + 四服务 healthcheck / depends_on / volumes）

运行截图见TASK_PIC

未完成说明：

> （写不下去的原因，不要跳过）

---

## 四个问题（必答，不限字数，写真实经历）

### 1. 追问过程

> 贴出你认为最有价值的一轮 AI 对话——你最初问了什么，AI 哪里回答得不够或有误，你怎么追问的，最终得到了什么结论？

**Prompt ：**
```
检查项目中是否遵循关键技术约束
tenantId 必须从 JWT claim 读取，禁止从 body/header 取值
Redis 扣费必须使用 Lua 脚本（禁止 GET-then-SET）
WebSocket token 通过 query 传递：/ws/job/:id?token=<jwt>
容器间通讯使用服务名（禁止 localhost）；浏览器访问 backend 用 localhost:3000
至少 4 个 feature 分支，语义化 commit
```
在计划执行完毕后，发现修改环境变量时违反了约束，随后对ai使用以上prompt进行追问，并成功解决该问题

---

### 2. 卡住的地方

> 你卡得最久的地方是什么？花了多长时间？期间走过哪些死路，最后怎么解开的？

卡的最久的地方是在点击登录时，返回404错误，大约花了十分钟解决。其间以为是后端接口未完善，最后将报错与传递的数据通过询问AI，发现是运行配置问题：process.env.NEXT_PUBLIC_BACKEND_URL 是 undefined，所以 URL 变成 /undefined/v1/auth/login。前端缺少 .env.local（Next.js 需要它来注入 NEXT_PUBLIC_* 变量）。仓库只有 .env.local.example。重新启动前端即解决。

---

### 3. 架构延伸

> 现在 eventBus 是进程内通信，如果 backend 横向扩展到 3 个实例，WS 进度推送会在哪里失效？你会怎么改？

答：我认为在进入队列后可能会存在资源竞争的问题，只有当提交，ws，worker都在同一实例时才能通过。

解决方案：Worker 侧publish 替代 emit
WS 侧subscribe 替代 on，注意每个 WS 连接独立订阅/退订，保持原来 eventBus.off 的清理语义这样无论 worker 在哪个实例发布，所有实例的订阅者都能收到。

---

### 4. 回头看

> 做完之后，你觉得这个设计里哪个决策值得质疑？如果让你重来，你会改什么？

第一，websocket的token应该加密，容易泄露。第二，如果redis服务器重启，余额数据会丢失。我会将token放在header中，不直接加载url里，保证安全。第二，增加定时任务，同步redis与mongo数据库的数据。

---

## Claude Code 使用证据

贴出你认为最关键的 3 条 prompt 原文（不是描述，是原文）：

**Prompt 1：**
```
/init 请大致给我介绍一下这个项目，以及需要完成的部分
```

**Prompt 2：**
```
根据项目要求，将任务拆解为多个phase，随后逐一进行解决，请注意 @TASK.md  中提到的关键约束（违反及淘汰的内容）写入claude.md，随后开始计划
```

**Prompt 3：**
```
前端点击登录时传递参数{username: "朱瑞淇", tenantId: "tenant-001", role: "user"}，后端提示 POST /undefined/v1/auth/login 404 in 6ms
```

---

## 已知 Bug / 未处理边界

- 如果提交扣费了，任务未完成直接退出仍然会扣费。
