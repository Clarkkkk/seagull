# 项目测试指南（Seagull）

本文档说明当前仓库的测试方案、选型原因、如何运行测试，以及统一的用例写法规范。也包含“开发完一个需求后必须写哪些测试”的强制要求。

## 测试方案原理与选型原因

### 我们在测什么（分层）

- **后端 service 语义（强测）**：纯业务规则（例如锁的“过期/续期/冲突”）。
  - 代表：`packages/api/src/services/trip/lock-service.ts`
- **跨层行为（强测）**：tRPC + react-query 链路（请求是否发出、错误码是否映射正确、invalidate/refetch 是否触发、定时 refresh 等）。
  - 代表：`apps/expo/src/business/trip/edit/locks/effect.ts`
- **真实部署形态（发布前验证）**：真实 Postgres + 连接池 + 并发/事务隔离（环境因素导致的竞态、超时、死锁等）。

### 为什么选 `packages/test-integration`

`packages/test-integration` 的目标是：**不启动真实 HTTP 服务、不依赖外部 Postgres**，仍然跑通一条“接近真实调用”的链路。

选型点：
- **in-memory fetch（tRPC server 侧）**：用 `fetchRequestHandler` 直接处理 `fetch(Request)`，不需要监听端口。
- **PGlite（Postgres in WASM）**：提供接近 Postgres 的 SQL 语义，避免写大量 DB stub 造成漂移。
- **复用 Drizzle schema（单一事实来源）**：测试 DB 使用 drizzle-kit 从 `packages/db/src/schema.ts` 生成一份全量 `schema.sql`，然后 PGlite 只执行这一份 SQL，避免迁移顺序/重复迁移导致的测试不稳定。
- **复用后端 service**：测试 router 内部直接调用 `packages/api/src/services/**`，保证关键业务语义不漂移。

关键实现文件：
- DB harness：`packages/test-integration/src/db/pglite.ts`
- 测试库 schema 生成脚本：`packages/test-integration/scripts/generate-schema-sql.mjs`
- 测试库 schema 文件：`packages/test-integration/src/db/schema.sql`
- in-memory tRPC fetch：`packages/test-integration/src/trpc/inMemoryFetch.ts`
- test router（复用 lock-service）：`packages/test-integration/src/trpc/routers/tripLockTestRouter.ts`
- Drizzle 迁移目录：`packages/db/drizzle/`

### 并发策略：为什么要“原子 upsert + 冒烟”

并发 bug 的关键不是 JS 的 `async/await`，而是 **DB 层是否出现真实 race**。推荐：
- **实现层面**：把抢锁改成 DB 原子语句（`INSERT ... ON CONFLICT DO UPDATE ... WHERE ... RETURNING`），把并发语义下沉到 DB。
- **测试层面**：
  - CI/PR：并发冒烟（快速版），快速发现明显回归
  - 发布前：真实 Postgres 并发冒烟（严格版），覆盖环境因素

仓库现状：
- `acquireTripLock` 已采用 `onConflictDoUpdate` + `where` 的原子写法。

## 测试如何运行

### 0) 一键跑全仓库测试（推荐）

```bash
pnpm test
```

### 1) 跨层测试（推荐主力）：`packages/test-integration`

```bash
pnpm -F @acme/test-integration test
pnpm -F @acme/test-integration typecheck
```

### 2) 后端单元/算法测试：`packages/api`

```bash
pnpm -F @acme/api test
pnpm -F @acme/api typecheck
```

### 3) 当你改了 DB schema：先生成测试库 schema.sql

`packages/test-integration` 的 PGlite 会在启动时执行 `packages/test-integration/src/db/schema.sql`。
为了保证它与当前 `packages/db/src/schema.ts` 一致，你需要先运行一次生成命令。

```bash
pnpm -F @acme/test-integration db:schema
```

注意：`pnpm -F @acme/test-integration test` 已经默认会先执行 `db:schema`，所以多数情况下直接跑测试即可。

## 用例写法规范

### 1) 跨层测试不要 mock 掉你要测的东西

- **不要 mock `useMutation`**：会把 react-query/tRPC 集成层剪掉，测试会变“假”。
- 只 mock/alias **平台依赖**：Expo/RN-only 依赖在 node/jsdom 下无法运行。
- 客户端用真实 `httpBatchLink`，服务端用 in-memory fetch。

### 1.5) Schema/FK 约束（迁移复用后的新常态）

复用 Drizzle 迁移后，PGlite 测试库包含真实的外键/unique/index 约束，因此：
- **不要再依赖“测试库没 FK 所以随便插”的假设**。
- **seed 必须满足 FK**：例如插 `trip.user_id`/`wishlist_jar.user_id` 前要确保对应的 `"user"` 行存在。

仓库约定：
- 使用 `packages/test-integration/src/trpc/api/seed.ts` 的 `seedUser/seedTrip/seedWishlistJar/...`（这些 helper 会自动补齐必要的 user）。
- 使用 `createApiTestServer()` 时，测试 auth 会在识别到 `x-test-user-id`（header 或 cookie）后 **自动 upsert `"user"`**，让 router/hook 测试更简洁。

### 2) 用 header 注入“当前用户”（避免并发串扰）

推荐用 `httpBatchLink({ headers })` 给每个请求带上 `x-test-user-id`，并在 server `createContext({ headers })` 中读取：

- 客户端：
  - `headers: () => ({ 'x-test-user-id': userId })`
- 服务端：
  - `userId: headers.get('x-test-user-id')`

补充：
- Expo hooks 测试中，客户端通常通过 `cookie: x-test-user-id=<id>` 注入登录态（对齐 `apps/expo/src/utils/api.tsx` 的 cookies header 行为）。

示例：
- `packages/test-integration/src/trpc/tripLock.concurrent.test.ts`

### 3) 并发类用例：两段跑法

#### A) CI/PR：并发冒烟（快速版）

用途：快速发现明显回归（错误码映射/逻辑放行/返回体变化）。

- 例：50 个不同用户并发抢同一把锁
  - 断言：**1 个成功 + 49 个 `CONFLICT`**
  - 示例：`packages/test-integration/src/trpc/tripLock.concurrent.test.ts`

注意：PGlite 单连接/单进程模型无法替代真实 Postgres 的并发/隔离级别验证，但对“业务语义是否稳定”依然很有价值。

#### B) 发布前：真实 Postgres 并发冒烟（严格版）

用途：覆盖真实连接池、事务隔离、调度等因素导致的并发 bug。

建议断言：
- 不允许出现“2 个同时成功”
- 不允许出现 DB unique violation 泄漏到上层（应统一映射为 `CONFLICT`）

## 强制要求：开发完一个需求以后必须写哪些测试

核心原则：
- 不是“至少写 1 个测试”，而是：**必须写测试覆盖该需求的所有必要场景**。
- “必要场景”由业务语义决定（正常路径、关键失败路径、边界条件、并发/幂等等），而不是由测试数量决定。

每个需求合并前，必须写测试覆盖以下检查项（按影响面选择，但不要跳过“跨层行为”）：

### A) 后端（`packages/api`）

- **业务规则有分支/边界**：必须在 service 层写测试覆盖所有必要场景（过期边界、冲突错误码、权限/owned 校验、空返回防御等）。
- **新增/修改 tRPC 路由**：必须写测试覆盖：
  - 正常路径（happy path）
  - 关键失败路径（错误码与 message/shape）
  - 输入校验（至少 1 个典型 bad input）

### B) 前端（Expo，`apps/expo/src/business/**`）

- **新增 effect/轮询/副作用**：必须写跨层测试覆盖：
  - 请求触发（何时触发、触发次数是否受控）
  - 成功/失败时的关键行为（例如 invalidate/refetch、错误提示/降级策略）
  - 资源清理（interval/timeout/订阅是否释放）
- **仅 UI 变更**：可不写网络相关测试，但要保证业务层不被 UI 混入副作用（遵循 `frontend-standards`）。

### C) 跨层（推荐默认要有）

- **任何涉及后端交互的业务逻辑**（新增 mutation/query、错误处理、缓存策略、并发/锁、定时刷新）：必须写 `packages/test-integration` 测试覆盖所有必要场景。
- **涉及并发语义**（锁/抢占/幂等/去重）：必须写并发测试覆盖：
  - 并发冒烟（快速版）：在 CI/PR 阶段运行
  - 并发冒烟（严格版）：上线前用真实 Postgres 运行（覆盖连接池/隔离级别/调度差异）

## 现有覆盖概览（便于定位示例）

- **后端 service（packages/api）**：
  - `packages/api/src/services/trip/lock-service.test.ts`
  - `packages/api/src/services/trip/time-overlap.test.ts`
  - `packages/api/src/services/map-provider/index.test.ts`
- **后端 router（packages/test-integration/src/trpc/api）**：
  - `auth.router.test.ts` / `trip.router.test.ts` / `wishlist.router.test.ts`
- **Expo business（packages/test-integration/src/expo）**：
  - auth：`auth/hooks.test.tsx`
  - trip/edit：`useTripEditLockEffect.test.tsx`、`trip/edit/items/effect.test.tsx`、`trip/edit/meta/*`、`trip/edit/days/*`、`trip/edit/jars/*`、`trip/edit/plan/*`
  - wishlist：`wishlist/{list,detail,new,edit,pick-location,draft}/*.test.tsx`

