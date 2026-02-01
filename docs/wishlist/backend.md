## 愿望罐子（Wishlist Jars）后端技术文档 v1

本文档描述“愿望罐子”功能的后端实现设计（数据模型、tRPC 接口、第三方地图能力、数据一致性与约束）。  
产品/交互请见：`docs/wishlist/product.md`。

---

## 范围与关键约束

### 范围（v1）
- 罐子（wishlist jar）CRUD、状态流转（未活跃 / 行程中 / 已归档）
- 罐子与行程绑定（通过关联表）
- 链接/分享内容解析 → 地址识别 → 地理编码获取坐标
- 坐标变更后反向地理编码 → 更新国家/省/市与展示地址

### 关键约束
- **坐标必填**：任何 jar 记录必须有 `(lat, lng)`。
- **坐标为“真值”**：国家/省/市/展示地址等派生字段，以坐标反向解析结果为准。
- **行程归属通过关联表表达**：当 jar “属于某行程”时，必须存在 `wishlist_jar_trip` 记录；v1 建议一个 jar 同时只属于一个 trip。

---

## 数据模型（PostgreSQL + Drizzle）

### 表：`wishlist_jar`
用途：存储地点灵感条目（jar）。

建议字段（v1）：
- `id` UUID PK
- `user_id` UUID（FK → user）
- `status` ENUM/TEXT：`inactive` | `in_trip` | `archived`
- `name` TEXT NOT NULL
- `country` TEXT NOT NULL
- `province` TEXT NOT NULL
- `city` TEXT NOT NULL
- `lat` DOUBLE PRECISION NOT NULL
- `lng` DOUBLE PRECISION NOT NULL
- `formatted_address` TEXT NULL
- `note` TEXT NULL
- `link_url` TEXT NULL
- `source_type` ENUM/TEXT：`map` | `link` | `share` | `manual`
- `source_title` TEXT NULL
- `source_raw_text` TEXT NULL
- `place_provider` TEXT NULL
- `place_id` TEXT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()（或 $onUpdateFn）

索引/约束建议：
- `INDEX (user_id, status)`
- `INDEX (user_id, country, province, city)`
- 可选唯一约束（仅用于提示/轻去重）：
  - `UNIQUE (user_id, place_provider, place_id)`（place_id 非空时）
- v1 如暂不引入 PostGIS，可先用 `lat/lng`；后续可升级：
  - `location geometry(Point, 4326)` + `GiST` 索引，用于附近查询/聚类加速。

### 表：`wishlist_jar_trip`（关联表）
用途：记录 jar 当前属于哪个 trip。

建议字段（v1）：
- `id` UUID PK
- `jar_id` UUID NOT NULL（FK → wishlist_jar.id）
- `trip_id` UUID NOT NULL（FK → trip.id）
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

约束/索引建议：
- **v1（强建议）**：`UNIQUE (jar_id)`，保证一个 jar 同时只属于一个 trip
- `INDEX (trip_id)`：按 trip 列出 jar
- `INDEX (jar_id)`：按 jar 查询归属

### 关系与一致性规则
- `user 1 ── N wishlist_jar`
- `wishlist_jar 1 ── 0..1 wishlist_jar_trip ── 1 trip`（v1 约束）

一致性（由业务层保证，使用事务）：
- 若存在 `wishlist_jar_trip`：`wishlist_jar.status` 必须为 `in_trip`
- 若 `wishlist_jar.status = in_trip`：必须存在 `wishlist_jar_trip`
- `wishlist_jar.status = archived`：必须不存在 `wishlist_jar_trip`

---

## 坐标与地址策略（强制统一）

### 坐标系
- 统一约定后端存储为 **WGS-84**。
- 若某地图服务输出 GCJ-02/BD-09，必须在边界层转换后再入库。

### 派生字段更新规则
- 创建/更新 jar 时：
  - `lat/lng` 必填
  - `country/province/city/formatted_address` 建议由后端通过 reverse geocode 得到（或接受前端传入但必须以 reverse geocode 结果校准/覆盖）
- 编辑时用户移动坐标：
  - 以新坐标 reverse geocode 更新行政区字段，覆盖旧值，避免“坐标与行政区不一致”。

---

## tRPC 接口设计（建议）

> 命名仅建议，可按你们 repo 现有规范调整（如 `wishlist.*`）。

### 查询类
- **`wishlist.list`**
  - 输入：`status?`、`country?`、`province?`、`city?`、`q?`、`cursor?`、`limit?`
  - 输出：分页列表（默认过滤 `archived` 可由前端控制）
- **`wishlist.getById`**
  - 输入：`id`
  - 输出：jar + 当前 trip 归属（join 关联表）
- **`wishlist.listByTrip`**
  - 输入：`tripId`
  - 输出：该行程内所有 jars（join）

### 变更类（事务保证一致性）
- **`wishlist.create`**
  - 输入：`name`、`lat`、`lng`、`note?`、`linkUrl?`、`source*?`
  - 行为：
    - reverse geocode 得到国家/省/市/地址
    - `status` 默认 `inactive`
- **`wishlist.update`**
  - 输入：`id` + 可更新字段（允许更新 `lat/lng/name/note/linkUrl/...`）
  - 行为：
    - 若 `lat/lng` 变化：reverse geocode 更新派生字段
- **`wishlist.archive`**
  - 输入：`id`
  - 行为（事务）：
    - 删除 `wishlist_jar_trip`（若存在）
    - 更新 `status=archived`
- **`wishlist.restore`**
  - 输入：`id`
  - 行为：
    - 更新 `status=inactive`
- **`wishlist.attachToTrip`**
  - 输入：`id`(jarId)、`tripId`
  - 行为（事务）：
    - upsert `wishlist_jar_trip`（受 `UNIQUE(jar_id)` 约束）
    - 更新 `status=in_trip`
- **`wishlist.detachFromTrip`**
  - 输入：`id`(jarId)
  - 行为（事务）：
    - 删除 `wishlist_jar_trip`
    - 更新 `status=inactive`

### 导入/解析类
- **`wishlist.parseLink`**
  - 输入：`url` 或 `rawText`
  - 输出（建议）：
    - `candidates: Array<{ name?; addressText?; lat?; lng?; placeId?; placeProvider?; sourceTitle? }>`
  - 行为：
    - 提取页面标题/候选地点文本（可先轻量）
    - 若无坐标：用 geocode/place search 获取坐标
    - 前端进入“地图确认”，用户确认后再调用 `wishlist.create`

### 鉴权与授权
- 所有接口：`protectedProcedure`
- 资源级授权：按 `wishlist_jar.user_id === ctx.session.user.id` 校验；不满足则 `FORBIDDEN` 或 `NOT_FOUND`（建议 `NOT_FOUND` 避免枚举）。

---

## 地图能力（Provider 抽象）

### 必需能力
- **Autocomplete / Place Search**：关键字 → 候选地点（名称 + 地址 + placeId）
- **Geocode**：地址文本 → 坐标
- **Reverse Geocode**：坐标 → 国家/省/市/格式化地址

### 建议实现方式（可演进）
- 在 `packages/api` 增加 `services/map-provider.ts`（或类似位置）封装：
  - `search(query, regionHint?)`
  - `geocode(addressText)`
  - `reverseGeocode(lat, lng)`
- 将 provider 的 API key/endpoint 放入环境变量（并用 zod/env 校验）。

### 缓存与限流（v1 建议）
- reverse geocode 对同一 `(lat,lng)`（可按精度四舍五入）缓存 7 天，减少成本
- `parseLink`、`geocode`、`reverseGeocode` 按用户/IP 做轻量限流（避免被刷）

---

## 错误处理（建议）

建议统一用 `TRPCError`：
- `BAD_REQUEST`：缺少坐标、非法 URL、Zod 校验失败
- `UNAUTHORIZED`：未登录
- `FORBIDDEN/NOT_FOUND`：无权访问该 jar
- `CONFLICT`：`attachToTrip` 时违反唯一归属（若不使用 upsert）
- `INTERNAL_SERVER_ERROR`：地图服务失败、解析失败且无法回退

对于地图服务失败的策略：
- `parseLink`：允许返回“部分解析结果”（只有 name/addressText）并让前端走手动地图选点兜底

---

## 实现落点（与你们 repo 对齐的建议）

在当前仓库结构下，建议新增：
- `packages/db/src/schema.ts`：增加 `wishlist_jar`、`wishlist_jar_trip` 表定义与 insert/update schema
- `packages/api/src/router/wishlist.ts`：wishlist 相关 tRPC router
- `packages/api/src/root.ts`：挂载 `wishlist: wishlistRouter`
- `packages/api/src/services/map-provider.ts`：地图 provider 抽象与实现

