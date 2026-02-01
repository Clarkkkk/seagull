## 行程规划（Trip Planning）后端技术文档 v2

本文档描述“行程规划”功能的后端实现设计（数据模型、tRPC 接口、编辑锁、快照、时间段不重叠校验、智能规划 optimizer 模块）。  
产品/交互请见：`docs/trip/product.md`。

---

## 设计目标与关键约束

### v2 关键约束（与产品对齐）
- **关系型计划结构**：使用 `trip_day` / `trip_item` 存储计划内容（按天 + 顺序）。
- **行程级独占编辑锁**：同一时间只能 1 人编辑，锁带 TTL 自动过期。
- **每次保存生成快照**：每次 `trip.plan.save` 都插入 `trip_snapshot`（用于回溯/模板/AI）。
- **待定区（Unassigned）**：用 `trip_item.day_id = NULL` 表达。
- **时间段不重叠**：同一天内，任何两个设置了时间段的地点不得重叠；保存时必须后端兜底校验。
- **固定时间为硬约束**：optimizer 不得移动已有固定时间段的地点（只能在空闲时间内安排其他地点）。
- **日期范围可选**：Trip 的 `startDate/endDate` 可为空；为空时仍允许 Day 以 `dayIndex` 工作（date 可空或用虚拟占位规则，见下文）。
- **授权**：只有行程 owner 或 collaborator 才能访问；未授权返回 `NOT_FOUND`（避免枚举）。

---

## 数据模型（PostgreSQL + Drizzle）

### 表：`trip`
用途：行程元信息 + 版本号（与快照联动）。

字段（v2）：
- `id` UUID PK
- `user_id` TEXT（FK → `user.id`，owner）
- `title` TEXT NOT NULL
- `destination` TEXT NULL
- `status` TEXT NOT NULL DEFAULT `planning`（建议枚举：`planning` | `active` | `completed` | `archived`）
- `start_date` DATE NULL
- `end_date` DATE NULL
- `version` INT NOT NULL DEFAULT 1
- `deleted_at` TIMESTAMPTZ NULL（软删除）
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL（onUpdate now）

### 表：`trip_day`
用途：行程天（按 dayIndex 排序）。

字段（v2 建议）：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `day_index` INT NOT NULL
- `date` DATE NULL
  - 若 Trip 设置日期范围：date 必填且唯一
  - 若 Trip 未设置日期范围：date 允许为 NULL（Day 仅作为 index 容器）
- `created_at` / `updated_at`

约束建议：
- `UNIQUE (trip_id, day_index)`
- 若 date 非空：可加 `UNIQUE (trip_id, date)`（仅对非空 date 生效需要部分索引；v1 可先靠业务保证）

### 表：`trip_item`
用途：行程条目（时间轴/地图/规划输入）。

字段（v2 关键新增：时间段）：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `day_id` UUID FK → trip_day.id（nullable：待定区）
- `type` TEXT NOT NULL（`poi` | `transport` | `lodging` | `note` | `free`）
- `order` INT NOT NULL（同一天内排序）
- `title` TEXT NOT NULL
- `note` TEXT NULL
- `lat` DOUBLE PRECISION NULL
- `lng` DOUBLE PRECISION NULL
- `jar_id` UUID NULL（FK → wishlist_jar.id）

时间字段（两种可选存储方案，推荐 A）：
- **A. minutes-from-midnight（推荐 v1/v2）**：
  - `starts_minute` INT NULL（0..1439）
  - `ends_minute` INT NULL（1..1440）
  - 约束：两者同时为空或同时非空；且 `starts_minute < ends_minute`
- **B. 组合 date + time（较复杂）**：
  - `starts_at` / `ends_at` TIMESTAMPTZ（需要与 day.date 组合，且时区处理更复杂）

索引：
- `INDEX (trip_id)`
- `INDEX (day_id)`
- `INDEX (jar_id)`
- `INDEX (trip_id, day_id, order)`

### 表：`trip_edit_lock`
用途：行程级独占编辑锁（带 TTL）。

字段：
- `trip_id` UNIQUE
- `user_id`
- `locked_at`
- `expires_at`

### 表：`trip_snapshot`
用途：保存历史（每次保存一条完整快照）。

字段：
- `trip_id`
- `version`（与 trip.version 对齐）
- `created_by`
- `created_at`
- `data` JSONB（稳定结构 `TripPlanV1/V2`）
- `summary`（可选）

---

## TripPlan 结构（快照 JSON）

建议结构（稳定、可用于 tools）：\n
- `trip`: { id, title, destination?, startDate?, endDate?, status, version }\n
- `days`: Array<{ id, dayIndex, date?, items: Array<TripItemV2> }>\n
- `unassignedItems`: Array<TripItemV2>\n
\n
`TripItemV2` 建议包含：\n
{ id, type, order, title, note?, lat?, lng?, jarId?, startsMinute?, endsMinute? }\n
\n
> 由服务端 `plan-assembler` 统一组装，确保稳定，便于未来 MCP/tools 复用。

---

## 时间冲突校验（后端兜底）

校验目标：同一天内，任何两个带时间段的 item 不重叠。

规则（minutes-from-midnight）：\n
- 仅对 `(starts_minute, ends_minute)` 同时非空的 items 参与冲突检测。\n
- 判定：\([aStart, aEnd) 与 [bStart, bEnd)\) 相交则冲突。\n
\n
校验落点：\n
- `trip.plan.save` 事务内，在写入前或写入后进行校验。\n
- 若冲突：抛 `BAD_REQUEST`（或 `CONFLICT`），返回冲突 items 信息，前端提示用户调整。\n

---

## tRPC 接口设计（v2）

### 查询类
- `trip.list`：我拥有/协作的行程列表
- `trip.getById`：Trip + Plan（Days + Items 已排序）+ lockInfo
- `trip.snapshots.list` / `trip.snapshots.get`

### 变更类（元信息）
- `trip.create`：支持 `startDate/endDate`（可选）
- `trip.updateMeta`：创建与编辑均可更新 `startDate/endDate`\n
  - 日期范围变化时：新增 Day / 缩短时把超出范围的 items 置为待定区并提示（可以返回 affectedCount）

### 计划类（按天编辑/拖拽/跨天移动）
- `trip.plan.save`（核心，full-save 或 patch-save）\n
  - 约束：必须持锁\n
  - 兜底：时间不重叠校验\n
  - 成功：bump version + snapshot\n
- 可选拆分（便于更细粒度与性能）：\n
  - `trip.plan.reorderItems`（同一天拖拽排序，仅改 order）\n
  - `trip.plan.moveItem`（跨天移动；若时间段放不下则置入待定区并返回 reason）\n
  - `trip.plan.getFreeSlots`（返回某天空闲时间段，用于时间选择 UI）

### 智能规划（新增）
- `trip.plan.optimize`\n
  - 输入：tripId、itemsSource（可选：onlyUnscheduled / all）、daysCount?、strategy?\n
  - 行为：调用 optimizer 模块（聚类 + TSP），生成建议 plan\n
  - 约束：必须持锁；固定时间 items 不得被移动\n
  - 输出：更新后的 plan + 待定区 items + reasons\n
  - 同时：写入 snapshot（因为这是一次“保存级”变更）

错误码建议：\n
- `NOT_FOUND`：行程不存在或无权限\n
- `CONFLICT`：锁冲突/未持锁\n
- `BAD_REQUEST`：时间重叠/输入非法\n

---

## Optimizer 模块化落点（为后续实现准备）

建议目录：\n
- `packages/api/src/services/trip/optimizer/`\n
  - `types.ts`：输入/输出类型（稳定 schema）\n
  - `cluster.ts`：按天分配（KMeans/层次聚类 + 容量约束分配）\n
  - `tsp.ts`：日内路线优化（NearestNeighbor + 2-opt）\n
  - `schedule.ts`：固定时间锚点分段拼接、空闲时间计算\n
  - `index.ts`：统一入口 `optimizeTripPlan()`\n
\n
模块原则：\n
- 不直接依赖 tRPC/ctx，仅接受纯输入数据结构并返回纯输出\n
- 便于后续封装为 MCP/tools\n

---

## 事务与一致性（关键路径）

### `trip.plan.save` / `trip.plan.optimize` 事务边界
单事务保证：\n
- 校验锁\n
- 写 day/item（或 patch）\n
- 时间冲突兜底校验（同一天不重叠）\n
- 更新 trip.version = trip.version + 1\n
- 插入 trip_snapshot(version=newVersion, data=assembledPlan)\n

## 行程规划（Trip Planning）后端技术文档 v1

本文档描述“行程规划”功能的后端实现设计（数据模型、tRPC 接口、编辑锁、快照、与 wishlist 联动）。  
产品/交互请见：`docs/trip/product.md`。

---

## 设计目标与约束

### MVP 关键约束
- **关系型计划结构**：使用 `trip_day` / `trip_item` 存储计划内容。
- **行程级独占编辑锁**：同一时间只能 1 人编辑，锁带 TTL 自动过期。
- **每次保存生成快照**：每次 `trip.plan.save` 都插入 `trip_snapshot`，便于回溯/模板/AI。
- **授权**：只有行程 owner 或 collaborator 才能访问；未授权返回 `NOT_FOUND`（避免枚举）。

### 未来扩展点（仅预留）
- AI 自动生成/优化：将 trip domain 的输入/输出 schema 固化并放到 service 层，便于封装为 MCP/tools。
- 模板：从 `trip_snapshot` 生成 `trip_template`（去隐私化）。
- 更细粒度协作：分区锁/OT/CRDT（v1 不做）。

---

## 数据模型（PostgreSQL + Drizzle）

### 表：`trip`（扩展现有）
用途：行程元信息 + 版本号（与快照联动）。

字段（v1）：
- `id` UUID PK
- `user_id` TEXT（FK → `user.id`，owner）
- `title` TEXT NOT NULL
- `destination` TEXT NULL
- `status` TEXT NOT NULL DEFAULT `planning`（建议枚举：`planning` | `active` | `completed` | `archived`）
- `start_date` DATE NULL
- `end_date` DATE NULL
- `version` INT NOT NULL DEFAULT 1
- `deleted_at` TIMESTAMPTZ NULL（软删除，核心数据不物理删除）
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL（onUpdate now）

索引建议：
- `INDEX (user_id, status)`
- `INDEX (updated_at)`

### 表：`trip_collaborator`
用途：记录行程协作者（与权限相关）。

字段：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `user_id` TEXT FK → user.id（cascade）
- `role` TEXT NOT NULL DEFAULT `editor`（`viewer` | `editor`）
- `created_at` TIMESTAMPTZ DEFAULT now()

约束/索引：
- `UNIQUE (trip_id, user_id)`
- `INDEX (user_id)`（便于按用户列出参与的行程）

### 表：`trip_day`
用途：行程天（按 dayIndex 排序）。

字段：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `date` DATE NOT NULL
- `day_index` INT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ onUpdate now

约束/索引：
- `UNIQUE (trip_id, day_index)`
- 可选：`UNIQUE (trip_id, date)`（若你希望日期也唯一）
- `INDEX (trip_id)`

### 表：`trip_item`
用途：行程条目（时间轴/地图）。

字段（v1）：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `day_id` UUID FK → trip_day.id（nullable：允许“未分配条目箱”）
- `type` TEXT NOT NULL（`poi` | `transport` | `lodging` | `note` | `free`）
- `order` INT NOT NULL（同一天内排序）
- `title` TEXT NOT NULL
- `time_text` TEXT NULL（如 “09:30”，v1 先用字符串满足 UI）
- `note` TEXT NULL
- `lat` DOUBLE PRECISION NULL
- `lng` DOUBLE PRECISION NULL
- `jar_id` UUID NULL（FK → wishlist_jar.id，用于 wishlist 联动）
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ onUpdate now

索引：
- `INDEX (trip_id)`
- `INDEX (day_id)`
- `INDEX (jar_id)`

### 表：`trip_edit_lock`
用途：行程级独占编辑锁（带 TTL）。

字段：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `user_id` TEXT FK → user.id（cascade）
- `locked_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `expires_at` TIMESTAMPTZ NOT NULL

约束/索引：
- `UNIQUE (trip_id)`（一个 trip 同时最多 1 把锁）
- `INDEX (expires_at)`（清理/判断过期）

### 表：`trip_snapshot`
用途：保存历史（每次保存一条完整快照）。

字段：
- `id` UUID PK
- `trip_id` UUID FK → trip.id（cascade）
- `version` INT NOT NULL（与 trip.version 对齐）
- `created_by` TEXT FK → user.id
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `data` JSONB NOT NULL（稳定结构 `TripPlanV1`）
- `summary` TEXT NULL（可选：保存备注/AI 摘要）

约束/索引：
- `UNIQUE (trip_id, version)`
- `INDEX (trip_id, created_at)`

---

## TripPlanV1（快照 JSON 结构）

建议结构（v1，示意）：
- `trip`: { id, title, destination?, startDate?, endDate?, status, version }\n- `days`: Array<{ id, date, dayIndex, items: Array<TripItemV1> }>\n- `unassignedItems`: Array<TripItemV1>\n\n其中 `TripItemV1`：{ id, type, order, title, timeText?, note?, lat?, lng?, jarId? }。

> 该结构由服务端 `plan-assembler` 统一组装，确保稳定，便于未来 MCP/tools 复用。

---

## tRPC 接口设计（v1）

### 查询类
- `trip.list`\n  - 输出：我拥有/协作的行程列表\n- `trip.getById`\n  - 输出：Trip + Days + Items（已排序）+ lockInfo\n- `trip.snapshots.list`\n  - 输入：tripId、limit?\n  - 输出：快照列表（version、createdAt、createdBy）\n- `trip.snapshots.get`\n  - 输入：tripId、version\n  - 输出：该版本快照 data\n\n### 变更类
- `trip.create`\n  - 输入：title、destination?、startDate?、endDate?\n  - 行为：创建 trip，version=1\n- `trip.updateMeta`\n  - 更新 title/destination/dates/status\n- `trip.plan.save`（核心）\n  - 输入：tripId + planPatch 或 planFull（v1 推荐 full）\n  - 约束：必须持有锁（未持锁 → `CONFLICT`）\n  - 事务：写 day/item 变更 → bump trip.version → 插入 trip_snapshot\n\n### 锁相关
- `trip.lock.get`\n  - 输入：tripId\n  - 输出：lockInfo（持有人、expiresAt、是否过期）\n- `trip.lock.acquire`\n  - 输入：tripId\n  - 行为：若无锁/锁过期/锁属于自己 → 成功并设置 expiresAt\n  - 若锁属于他人且未过期 → `CONFLICT`（返回 lockInfo）\n- `trip.lock.refresh`\n  - 输入：tripId\n  - 行为：仅锁持有人可延长 TTL，否则 `CONFLICT`\n- `trip.lock.release`\n  - 输入：tripId\n  - 行为：仅锁持有人可释放\n\n错误码建议：\n- `NOT_FOUND`：行程不存在或无权限\n- `CONFLICT`：锁冲突/保存时未持锁\n- `BAD_REQUEST`：输入不合法\n\n---

## 事务与一致性

### 保存（`trip.plan.save`）事务边界
单事务保证：\n- 校验锁\n- upsert days\n- upsert items（含 dayId 归属与 order）\n- 更新 trip.version = trip.version + 1\n- 插入 trip_snapshot(version=newVersion, data=assembledPlan)\n\n### 权限校验
任意读取/写入必须满足：\n- trip.userId === ctx.session.user.id\n  或\n- 存在 trip_collaborator(tripId, userId)\n\n---

## 实现落点（与仓库结构对齐）

- DB：`packages/db/src/schema/` 新增 trip 相关表文件，并在 `packages/db/src/schema.ts` 统一导出（保持 `@acme/db/schema` 稳定）。\n- API：`packages/api/src/router/trip.ts` 新增路由，并在 `packages/api/src/root.ts` 注册。\n- Services：`packages/api/src/services/trip/*` 提供组装 plan、锁逻辑、快照逻辑与 Zod schemas（便于未来 tools）。\n\n*** End Patch"}]}Oops patch formatting - we must provide correct patch. Let's do ApplyPatch file add without JSON. We'll redo properly.
