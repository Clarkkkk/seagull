# 迁移计划（TanStack Start → 删除，Next.js 前端化，后端迁移到 Fastify）

## 目标

- **删掉 `tanstack-start`**：不再参与安装、构建、dev。
- **Next.js 只做前端**：不再承载 `/api/*`（tRPC / auth）。
- **后端统一迁移到 Fastify**：提供
  - `POST/GET /api/trpc/*`（tRPC v11）
  - `/api/auth/*`（better-auth）
- **开发体验**：不再用 Turbo 把输出混在一起，改为按服务分别启动：
  - `pnpm dev:server`（Fastify）
  - `pnpm dev:app`（Expo）
  - `pnpm dev:web`（Next 前端，可选）

## 当前已落地的变更（本次实现）

- **新增 Fastify 后端**：`apps/server`
  - tRPC：`/api/trpc`
  - Auth：`/api/auth/*`（使用 `@whatwg-node/server` 做 Node↔Web Request/Response 适配）
- **Next.js 前端化**：
  - 删除 `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`
  - 删除 `apps/nextjs/src/app/api/auth/[...all]/route.ts`
  - 删除 server-only 的 `~/auth/server` 和 `~/trpc/server`
  - `apps/nextjs` 的 tRPC client 改为指向 `NEXT_PUBLIC_API_URL`（默认 `http://localhost:4000`）
- **工作区排除 TanStack Start**：`pnpm-workspace.yaml` 添加 `!apps/tanstack-start`
- **拆分 dev 命令**：根 `package.json` 提供 `dev:server/dev:app/dev:web`

## 分阶段迁移路线

### Phase 0：基线与回滚点（建议先做）

- **基线**：记录当前可工作的 commit/tag（便于回滚）。
- **回滚策略**：
  - API：如果 Fastify 不稳定，可临时恢复 Next `/api/*`（回滚对应删除的 route handlers）。
  - 客户端：通过 `EXPO_PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL` 切换 API 指向。

### Phase 1：后端主路切换到 Fastify（低风险）

- **目标**：Expo 全量走 Fastify（`http://<LAN_IP>:4000`），不依赖 Next。
- **动作**：
  - Expo：使用 `EXPO_PUBLIC_API_URL`（可选），否则自动推导 LAN IP 并使用 `:4000`。
  - Fastify：确认监听 `0.0.0.0:4000`，并配置 CORS。
- **验收**：
  - Expo 能正常登录/获取 session（如果你启用了 better-auth）
  - Wishlist Jars 的 `wishlist.*`、`map.*`、`post.*` 等 tRPC 正常工作

### Phase 2：删除 TanStack Start（中等风险，影响范围小）

- **目标**：彻底移除 `apps/tanstack-start` 以及相关依赖/文档引用。
- **动作**：
  - 物理删除目录 `apps/tanstack-start`（本次已先从 workspace 排除）
  - 清理 `pnpm-lock.yaml` 中的 workspace package 记录（需要跑一次 `pnpm install`/`pnpm -r` 触发 lockfile 重写）
  - 更新 README/文档
- **验收**：`pnpm -r typecheck/build` 不再包含 tanstack-start。

### Phase 3：Next.js 完全前端化（中等风险）

- **目标**：Next 不再包含任何 server-only 的“后端逻辑”，只消费远端 API。
- **动作**：
  - 禁止新增 `/api/*` route handlers（代码 review 约束）
  - 将 Web 端鉴权也走 `NEXT_PUBLIC_API_URL` 的 `/api/auth/*`
- **验收**：Next 可以单独 `pnpm dev:web` 启动，仅提供前端页面；API 必须由 `dev:server` 提供。

### Phase 4：工程化与 DX 收口（建议）

- **日志**：每个服务独立终端输出（你已经要求的方式）。
- **env 归属**：
  - 服务端（Fastify）：`DATABASE_URL/MAPBOX_ACCESS_TOKEN/...`
  - 客户端（Expo/Next）：仅 `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`
- **部署**：
  - Fastify：独立部署（容器/VM/Serverless 均可）
  - Expo：EAS
  - Next：可选（若不需要 web，可直接不部署）

## 建议的端口/URL 约定

- **Fastify**：`http://localhost:4000`
- **Next**：`http://localhost:3000`（仅前端）

## 启动方式（推荐）

- **后端**：`pnpm dev:server`
- **App**：`pnpm dev:app`
- **Web（可选）**：`pnpm dev:web`

