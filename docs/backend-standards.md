# 后端开发规范 (Backend Development Standards)

本文档旨在统一 Seagull 项目的后端开发流程、代码风格及最佳实践。所有后端开发人员应遵循此规范。

## 1. 项目结构与职责 (Project Structure)

基于 TurboRepo 的 Monorepo 结构，后端核心代码主要位于 `packages/` 目录下：

```
packages/
├── api/                 # tRPC 后端逻辑核心
│   ├── src/
│   │   ├── root.ts      # AppRouter 聚合点 (Root Router)
│   │   ├── trpc.ts      # tRPC 初始化、Context、中间件
│   │   ├── router/      # 路由层 (Controllers)
│   │   └── services/    # 业务逻辑层 (Services - 推荐新增)
│   └── package.json
│
├── db/                  # 数据库层
│   ├── src/
│   │   ├── schema/      # Drizzle 表定义 (建议按领域拆分)
│   │   │   ├── users.ts
│   │   │   └── trips.ts
│   │   ├── client.ts    # DB 连接实例
│   │   └── index.ts     # 统一导出
│   └── drizzle.config.ts
│
└── auth/                # 认证配置 (Auth.js)
```

## 2. 分层架构 (Layering Architecture)

为了保持代码的可维护性和可测试性，建议采用以下分层结构：

### 2.1 路由层 (Router Layer)
- **位置**: `packages/api/src/router/*.ts`
- **职责**: 
  - 定义 API 接口 (Procedure)
  - 输入验证 (Zod Validation)
  - 权限校验 (Middleware)
  - 调用 Service 层或直接调用 DB (简单逻辑)
  - 返回数据格式化
- **原则**: 路由层应保持轻量，不要包含复杂的业务逻辑判断。

### 2.2 业务逻辑层 (Service Layer)
- **位置**: `packages/api/src/services/*.service.ts`
- **职责**: 
  - 处理核心业务逻辑 (如复杂计算、状态流转)
  - 编排多个 DB 操作
  - 调用第三方 API
- **原则**: 纯函数风格优先，便于单元测试。
- **示例**:
  ```typescript
  // packages/api/src/services/trip.service.ts
  export const calculateTripCost = (trip: Trip, expenses: Expense[]) => {
    // ... 复杂计算逻辑
  };
  ```

### 2.3 数据访问层 (Data Access Layer)
- **位置**: `packages/db`
- **职责**: 
  - 定义数据库 Schema
  - 执行 SQL 查询 (使用 Drizzle ORM)
  - 数据库迁移管理

## 3. 命名规范 (Naming Conventions)

| 对象             | 规范                 | 示例                                | 备注                                |
| :--------------- | :------------------- | :---------------------------------- | :---------------------------------- |
| **文件名**       | kebab-case           | `trip-service.ts`, `user-router.ts` | 保持全小写，连字符分隔              |
| **变量/函数**    | camelCase            | `getUserById`, `isVerified`         |                                     |
| **常量**         | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`                   | 仅限全局常量                        |
| **类/接口/类型** | PascalCase           | `UserResponse`, `CreateTripInput`   |                                     |
| **数据库表名**   | snake_case           | `user_preference`, `trip_items`     | Postgres 推荐规范                   |
| **数据库列名**   | snake_case           | `created_at`, `user_id`             | 代码中通过 Drizzle 映射为 camelCase |
| **tRPC 路由**    | camelCase            | `trip.create`, `user.getProfile`    | 动词后缀或前缀统一                  |

## 4. tRPC 最佳实践

### 4.1 Procedure 定义
- **Query**: 用于读取数据 (GET)。命名建议：`get`, `list`, `search`, `byId`。
- **Mutation**: 用于修改数据 (POST/PUT/DELETE)。命名建议：`create`, `update`, `delete`, `archive`。

### 4.2 输入验证
必须为所有 `input` 定义严格的 Zod Schema：
```typescript
// ✅ 推荐
.input(z.object({
  tripId: z.string().uuid(),
  status: z.enum(['active', 'completed'])
}))
```

### 4.3 错误处理
使用 `TRPCError` 抛出具有语义的 HTTP 状态码：
```typescript
if (!trip) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: '行程不存在或已被删除'
  });
}
```

## 5. Drizzle & 数据库规范

### 5.1 Schema 管理
不要将所有表都放在一个 `schema.ts` 文件中。随着业务增长，应按领域拆分：
- `packages/db/src/schema/auth.ts` (用户, Session)
- `packages/db/src/schema/trip.ts` (行程, 只有)
- `packages/db/src/schema/poi.ts` (地点)

并在 `packages/db/src/schema/index.ts` 中统一导出。

### 5.2 字段命名映射
数据库使用 snake_case，代码使用 camelCase：
```typescript
// schema/users.ts
export const users = pgTable("user", {
  // DB: created_at, JS: createdAt
  createdAt: timestamp("created_at").defaultNow().notNull(), 
});
```

### 5.3 软删除 (Soft Delete)
对于核心业务数据（如行程、订单），严禁物理删除。统一添加 `deletedAt` 字段：
```typescript
deletedAt: timestamp("deleted_at")
```
查询时务必过滤：`.where(isNull(table.deletedAt))`。

## 6. 开发工作流 (Workflow)

### 6.1 新增 API 接口
1. **定义 Schema**: 在 `packages/db/src/schema` 中定义或修改表结构。
2. **迁移数据库**: 运行 `pnpm db:push` (开发环境) 或生成 migration 文件。
3. **编写 Router**: 在 `packages/api/src/router` 中添加或修改路由文件。
4. **注册 Router**: 在 `packages/api/src/root.ts` 中挂载新路由。
5. **前端调用**: 在 `apps/nextjs` 或 `apps/expo` 中直接使用 `api.yourRouter.yourProcedure`。

### 6.2 数据库变更
1. 修改 `schema` 文件。
2. 运行 `pnpm db:generate` 生成 SQL 迁移文件。
3. 检查生成的 SQL 文件是否符合预期。
4. 运行 `pnpm db:migrate` 应用变更。
5. **禁止**手动修改数据库表结构，一切变更必须通过代码和迁移文件管理。

## 7. 代码风格 (Linting & Formatting)
- 全局遵循 ESLint 和 Prettier 配置。
- 提交代码前确保通过 `pnpm lint` 和 `pnpm typecheck`。
- 导入顺序：第三方库 -> 内部 Monorepo 包 -> 相对路径文件。

