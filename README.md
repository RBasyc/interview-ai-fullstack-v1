# interview-ai-fullstack-v1

AI 全栈工程师面试实测骨架仓库 V1。

## 候选人须知

请阅读 [TASK.md](./TASK.md) 了解考核要求、模块说明和验收步骤。

## Claude Code CLI 配置

```powershell
# 1. 安装（仅首次）
npm install -g @anthropic-ai/claude-code@2.1.111

# 2. 配置（粘贴到 PowerShell，token 从面试官处扫码获取）
$env:ANTHROPIC_BASE_URL = "https://cc.hubosmart.com/api"
$env:ANTHROPIC_AUTH_TOKEN = "<扫码获取>"
$env:ENABLE_TOOL_SEARCH = "true"
$env:CLAUDE_CODE_ATTRIBUTION_HEADER = "0"
$env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$env:CLAUDE_CODE_DISABLE_1M_CONTEXT = "1"
$env:CLAUDE_CODE_AUTO_COMPACT_WINDOW = "200000"

# 3. 启动（在项目根目录执行）
claude
```

## 快速启动

```bash
# Fork 本仓库到自己账号，然后 clone
git clone git@github.com:<你的账号>/interview-ai-fullstack-v1.git
cd interview-ai-fullstack-v1

# 配置环境变量
cp .env.example .env

# 完成 Module E 后一键启动所有服务
docker compose up -d
```

## 技术栈

Node.js 20 · Express 4 · MongoDB 7 · Redis 7 · BullMQ 5 · WebSocket · Next.js 14 · pnpm 9

## 交付提醒

完成后执行 `cp SELF-REVIEW.template.md SELF-REVIEW.md`，填写四题并 commit，再推送仓库 URL。详见 [TASK.md](./TASK.md)。
