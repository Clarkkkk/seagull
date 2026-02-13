## Seagull 开发需求流程（回顾总结）

本文档基于本次“愿望罐子图片 + 链接解析 + 测试体系”完整交付过程，沉淀出一套可复用的需求开发步骤与注意事项。

---

## 目标与原则

- **先定义契约再写代码**：明确数据结构、接口输入输出、错误码与边界（例如：最多 9 张图片、封面默认回退逻辑）。
- **遵循分层**：
  - **Router（packages/api/src/router）**：只做输入校验、鉴权、路由编排。
  - **Service（packages/api/src/services）**：业务逻辑与编排（限制、回退策略、幂等与一致性）。
  - **DB（packages/db）**：Drizzle schema 与迁移。
  - **Expo 业务层（apps/expo/src/business/**）**：负责 tRPC/react-query、缓存、side effects；UI 只消费业务层返回值与事件方法。
- **测试先行或同步**：任何涉及后端交互的需求，默认要补 `packages/test-integration` 跨层测试。

---

## 需求开发步骤（推荐顺序）

### 1) 澄清需求与约束（必须）

建议用最少问题确认“会影响架构/数据/接口”的关键点：

- **存储与上传方式**：外链、已有存储、还是新增 S3 兼容存储？
- **入口与数据来源**：链接导入属于哪个入口？解析范围？
- **边界条件**：
  - 图片数量上限（本次：最多 9 张）
  - 封面规则（本次：默认第一张；可选其他；可单独上传封面）
  - 删除行为（删除图片后封面如何回退？）

输出物建议：
- 一个简单“数据结构 + 接口列表 + UI 行为”的小规格（可以是 plan）。

---

### 2) 设计数据结构（DB）与迁移策略

目标：数据模型先稳定，避免后面反复改接口/前端。

本次典型做法：
- 新增图片表（示例）：`wishlist_jar_image`
- 在主表增加封面字段（示例）：`coverImageId/coverImageUrl/coverImageKey`

注意事项：
- **软删除**：核心实体尽量使用 `deletedAt`（本次图片表使用软删除）。
- **索引**：按常用查询加索引（例如 `jar_id`、`created_at`）。
- **迁移一致性**：避免重复迁移/顺序问题（详见“测试体系注意事项”）。

---

### 3) 后端实现（按分层）

#### 3.1 Service 层（packages/api/src/services/**）

把所有“规则”收口在 service，router 只调用 service。

本次实现的关键语义示例：
- **图片上限 9 张**：在写入前检查数量；超限返回 `BAD_REQUEST`。
- **默认封面回退**：
  - 如果没有封面且存在图片：封面默认第一张。
  - 删除封面图后：清除封面并回退到第一张。
  - 清除封面后：回退到第一张（如果存在）。
- **链接解析服务抽象**：
  - router 提供 `parseLink` 接口。
  - 解析逻辑由后端 adapter（小红书等）实现，统一返回 `{ title, content, images, url, provider, raw }`。
  - 前端拿到 `images[]` 后，再调用“添加图片”接口写入罐子（后端不在 create 中耦合）。

#### 3.2 Router 层（packages/api/src/router/**）

要求：
- 每个 endpoint 都有 Zod input。
- 错误使用 `TRPCError` 且语义明确（NOT_FOUND/CONFLICT/BAD_REQUEST 等）。
- 不把业务规则写进 router（例如“链接解析 + 写入图片”属于业务编排，应该交给前端或 service）。

#### 3.3 环境变量（.env.example）

将可配置项显式写到 `.env.example`：
- S3：`S3_*`
- TikHub：`TIKHUB_API_TOKEN`

---

### 4) 前端实现（Expo：业务层与 UI 分离）

#### 4.1 业务层（apps/expo/src/business/**）

原则：
- 业务层负责：tRPC/react-query 调用、缓存 invalidate、网络副作用、稳定 deps。
- UI 层不直接用 `trpc.*`/`useQuery`/`useMutation`。

本次典型做法：
- 新增 `useWishlistJarImages(jarId)`：
  - `listImages` query
  - `confirmImageUpload/deleteImage/setCover/clearCover` mutations
  - 封装 UI 事件方法：`pickAndUpload/deleteJarImage/setCoverFromImage/clearCoverImage`
  - 统一触发 `invalidateQueries`（`wishlist.listImages` + `wishlist.getById`）

#### 4.2 UI 层（apps/expo/src/screens/**）

UI 只做：
- 展示（封面 + 图片网格）
- 触发业务层方法（添加/删除/设封面/上传封面）

---

## 测试流程（必须项）

### 1) 建议测试分层

- **后端 service 语义**：靠近 service 写单测（例如锁、算法、纯规则）。
- **跨层（tRPC + react-query + invalidate）**：写在 `packages/test-integration`（本次主要覆盖在这里）。

### 2) 本仓库的测试 DB 初始化策略（重要）

当前约定：`packages/test-integration` 使用 **schema-driven** 的测试库初始化：

- 通过脚本生成全量 SQL：
  - `pnpm -F @acme/test-integration db:schema`
- 测试运行会自动先生成：
  - `pnpm -F @acme/test-integration test`

原因：
- 避免依赖迁移目录顺序/重复迁移导致的不稳定（例如 “relation already exists”）。

### 3) Expo 平台依赖的 mock/alias

原则：
- 不 mock 你要测的 react-query/tRPC；只 mock 平台依赖（Expo/RN-only）。
- 对 `expo-image-picker` 这类“会去 require 原生模块”的包，**需要通过 vitest alias 指向 mock 模块**，避免真实包在 node/jsdom 中加载。

### 4) 外部网络 stub

测试中不允许真实网络；需要 stub：
- Mapbox API（search/reverseGeocode）
- TikHub API（链接解析）
- S3 presigned PUT URL（上传请求）

---

## 常用命令（建议写进开发习惯）

### 0) 一键跑全仓库测试

```bash
pnpm test
```

### 1) 跨层测试（推荐主力）

```bash
pnpm -F @acme/test-integration test
pnpm -F @acme/test-integration typecheck
```

### 2) 后端测试（packages/api）

```bash
pnpm -F @acme/api test
pnpm -F @acme/api typecheck
```

### 3) 生成测试库 schema.sql

```bash
pnpm -F @acme/test-integration db:schema
```

### 4) 代码质量检查

```bash
pnpm lint
pnpm typecheck
```

---

## 提交前自检清单（可复制）

### 后端
- [ ] DB schema 与迁移一致（新增字段/表/索引都有对应变更）
- [ ] Router 只做校验/鉴权/编排；业务规则在 service
- [ ] 错误码语义正确（NOT_FOUND/CONFLICT/BAD_REQUEST）
- [ ] `.env.example` 补齐新增环境变量

### 前端
- [ ] 业务逻辑在 `apps/expo/src/business/**`，UI 不直接访问 tRPC/react-query
- [ ] `invalidateQueries` 覆盖必要 query（避免 UI 不刷新）
- [ ] 避免不稳定 deps（不要把 mutation 对象整体放进 effect deps）

### 测试
- [ ] 关键路径 + 关键失败路径 + 边界条件均有覆盖
- [ ] `packages/test-integration` 能跑通（无真实网络依赖）
- [ ] schema.sql 生成逻辑可用：`pnpm -F @acme/test-integration test`

