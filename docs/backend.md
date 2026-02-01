# Seagull 旅行规划应用后端技术方案 (T3 Stack)

> 基于 Create T3 Turbo + tRPC + Drizzle ORM + PostgreSQL

## 目录

1. [项目背景与需求概述](#1-项目背景与需求概述)
2. [设计原则](#2-设计原则)
3. [技术栈选型](#3-技术栈选型)
4. [系统架构设计](#4-系统架构设计)
5. [数据库设计](#5-数据库设计)
6. [API 设计规范](#6-api-设计规范)
7. [开发规范](#7-开发规范)
8. [安全设计](#8-安全设计)
9. [部署与运维](#9-部署与运维)
10. [迭代规划](#10-迭代规划)
11. [风险评估](#11-风险评估)

---

## 1. 项目背景与需求概述

Seagull 是一款面向旅行爱好者的全流程旅行规划与记录应用。后端系统需支持从灵感收集、行程规划到实时导航、回忆分享的完整数据链路,并为移动端(Expo)提供高性能、类型安全的 API 支持。

### 1.1 核心功能需求

后端系统需要支撑以下完整的旅行生命周期:

#### 行程前:灵感收集与智能规划
- **多渠道数据抓取与解析**:支持链接解析、网页爬虫,自动提取地点信息
- **POI 数据管理**:地点的结构化存储、分类、标签和搜索
- **结构化行程存储**:灵活的行程-天数-项目三层结构,支持 JSONB 存储自定义字段
- **协同编辑**:多用户实时编辑同一行程,需要冲突检测和解决机制
- **智能路线规划**:集成第三方地图 API,基于用户偏好优化路线

#### 行程中:实时响应与离线保障
- **实时状态同步**:行程变更通过 WebSocket 实时推送到所有协作者
- **位置服务(LBS)**:地理围栏提醒、附近景点查询(PostGIS)
- **天气与交通数据聚合**:集成第三方 API,提供实时信息
- **离线优先设计**:支持移动端完全离线访问核心功能,网络恢复后智能同步

#### 行程后:回忆沉淀与社区分享
- **多媒体资源管理**:照片、文档上传到对象存储(OSS),生成缩略图和 WebP
- **游记生成**:整合行程数据、照片、笔记,生成 Markdown 长文本
- **社区内容分发**:用户可将行程发布为模板,支持搜索和推荐

### 1.2 技术挑战

1. **端到端类型安全**:确保前后端数据契约一致,减少联调成本
2. **地理信息处理**:高效处理经纬度、路径规划及地理围栏(PostGIS)
3. **离线同步**:解决多设备、弱网环境下的数据冲突与一致性
4. **高并发与扩展**:应对节假日流量高峰及未来的用户增长
5. **Serverless 冷启动**:优化函数启动时间和数据库连接管理

---

## 2. 设计原则

### 2.1 技术选型原则

1. **开发体验优先(DX)**  
   利用 TypeScript 的静态类型推导,实现"修改一处,全栈自动报错/补全",最大化单人开发效率。

2. **生态统一**  
   前后端统一使用 TypeScript/JavaScript,复用工具链(Prettier, ESLint, Zod schemas)。

3. **Serverless 友好**  
   架构设计需同时支持传统容器部署和 Serverless(Vercel/AWS Lambda)部署。

4. **强类型约束**  
   运行时校验(Zod)与编译时检查(TypeScript)结合,杜绝 `any` 类型。

5. **渐进式增强**  
   初期采用 Monorepo + Serverless,随着规模增长可平滑过渡到独立微服务。

---

## 3. 技术栈选型

### 3.1 核心技术栈

| 层级           | 技术选型                                               | 说明                               |
| -------------- | ------------------------------------------------------ | ---------------------------------- |
| **运行环境**   | Node.js v20+ (LTS)                                     | Serverless 环境兼容性最佳          |
| **API 框架**   | tRPC v11 + @trpc/server                                | 端到端类型安全,零样板代码          |
| **Web 服务器** | Next.js App Router (Serverless) / Fastify (Standalone) | 初期 Vercel,中期独立容器           |
| **数据库**     | PostgreSQL (Supabase/Neon) + PostGIS                   | Serverless 数据库,GIS 扩展         |
| **ORM**        | Drizzle ORM                                            | 轻量级,SQL-like,冷启动快           |
| **缓存**       | Redis (Upstash/自建)                                   | Serverless Redis 或容器部署        |
| **验证库**     | Zod                                                    | Schema 定义与运行时校验            |
| **任务队列**   | BullMQ + Redis                                         | 异步任务处理(路线优化、图片压缩)   |
| **对象存储**   | S3 兼容协议 (Supabase Storage / R2 / OSS)              | 照片、文档存储 + CDN               |
| **实时通信**   | tRPC Subscriptions (WebSockets) - 独立部署             | 协同编辑、实时通知(需长连接服务器) |
| **认证**       | Auth.js (NextAuth.js)                                  | 支持 Apple、Google、Email 登录     |

### 3.2 选型理由

#### 3.2.1 Node.js + tRPC:极致的类型安全与开发效率

**核心优势**:
- **零样板代码**:无需编写 `.proto` 文件或手动生成 Swagger 文档。后端函数直接作为前端可调用的 SDK。
- **极致的类型安全**:后端修改字段名,前端代码立即报错,重构风险几乎为零。
- **全栈复用**:DTO(数据传输对象)和验证逻辑(Zod schemas)可在前后端共享,避免重复定义。

**示例对比**:
```typescript
// ❌ 传统 REST API:需要手动同步类型
// backend/types.ts
export interface Trip { id: string; title: string; }

// frontend/types.ts (重复定义)
interface Trip { id: string; title: string; }

// ✅ tRPC:类型自动同步
// packages/api/src/router/trip.ts
export const tripRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => { /* ... */ }),
});

// apps/expo/src/app.tsx (自动推导类型)
const { data } = api.trip.getById.useQuery({ id: "123" });
//    ^? data: Trip | undefined (自动推导!)
```

**性能考虑**:
- tRPC 底层使用 HTTP/JSON,比 gRPC 的二进制协议略慢,但对于移动端应用(非微秒级延迟敏感)完全够用
- 可通过 Batching 和 Link Deduplication 优化网络请求
- Serverless 环境下启动速度更快(无需 gRPC 的 C++ 依赖)

#### 3.2.2 Drizzle ORM + PostgreSQL:轻量级且 GIS 友好

**为什么不用 Prisma**:
- Drizzle 更轻量,无运行时黑盒,启动速度快(Serverless 冷启动友好)
- SQL-like 体验,对复杂地理查询(PostGIS)的控制力更强
- Schema 即代码,TypeScript 定义数据库结构,自动生成迁移文件

**PostGIS 支持示例**:
```typescript
// packages/db/schema/pois.ts
import { pgTable, uuid, text, geometry } from "drizzle-orm/pg-core";

export const pois = pgTable("poi", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // 存储 WGS-84 坐标点 (SRID 4326)
  location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
});

// 查询附近 5km 内的 POI
const nearby = await db.execute(sql`
  SELECT * FROM poi 
  WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
    5000
  )
`);
```

**JSONB 支持示例**:
```typescript
export const trips = pgTable("trip", {
  id: uuid("id").primaryKey(),
  // 存储灵活的元数据(如用户自定义字段)
  metadata: jsonb("metadata").$type<{
    budget?: number;
    preferences?: string[];
  }>(),
});
```

#### 3.2.3 PostgreSQL(Supabase/Neon):Serverless 数据库

**为什么选择托管 Serverless 数据库**:
- **按需扩缩容**:自动根据负载调整,初期成本低
- **连接池管理**:Supavisor(Supabase)或 PgBouncer 解决 Lambda 连接数爆炸问题
- **内置备份与高可用**:无需自己搭建主从复制

**Supabase vs Neon 对比**:
| 特性         | Supabase                    | Neon                 |
| ------------ | --------------------------- | -------------------- |
| 免费额度     | 500MB 存储 + 2GB 传输       | 0.5GB 存储,共享计算  |
| PostGIS 支持 | ✅ 内置                      | ✅ 需手动启用扩展     |
| Realtime     | ✅ 内置 WebSocket            | ❌ 需自建             |
| 冷启动       | 较慢(~1s)                   | 极快(<100ms)         |
| **推荐场景** | 需要 Realtime + Auth 一体化 | 纯 API 场景,追求性能 |

#### 3.2.4 BullMQ:Node.js 生态最佳任务队列

**核心能力**:
- **延迟任务**:旅行提醒、出发前 24 小时推送通知
- **优先级队列**:紧急路线重算 > 游记生成
- **失败重试**:自动指数退避重试
- **任务进度追踪**:前端可查询"路线优化 85% 完成"

**示例**:
```typescript
// packages/api/src/jobs/optimize-route.ts
import { Queue, Worker } from "bullmq";

const optimizeQueue = new Queue("optimize", { connection: redis });

// 添加任务
await optimizeQueue.add("optimize-trip", { tripId: "123" });

// 处理任务
const worker = new Worker("optimize", async (job) => {
  const { tripId } = job.data;
  const route = await calculateOptimalRoute(tripId);
  await db.update(trips).set({ route }).where(eq(trips.id, tripId));
  
  // 通过 WebSocket 通知前端
  io.to(tripId).emit("route-updated", route);
});
```

---

## 4. 系统架构设计

### 4.1 整体架构(Monorepo)

采用 **TurboRepo** 管理的 Monorepo 结构,前后端代码物理分离但逻辑紧密结合。

```
TurboRepo Root/
├── apps/
│   ├── expo/                   # React Native 移动端
│   │   ├── src/
│   │   │   ├── app/           # Expo Router 页面
│   │   │   └── utils/
│   │   │       └── api.ts     # tRPC Client 初始化
│   │   └── package.json
│   │
│   └── nextjs/                # Web 管理端 + tRPC API Server
│       ├── src/
│       │   ├── app/           # Next.js App Router
│       │   └── components/
│       ├── pages/
│       │   └── api/
│       │       └── trpc/
│       │           └── [trpc].ts  # tRPC HTTP Handler
│       └── package.json
│
└── packages/
    ├── api/                   # ⭐ 后端逻辑核心
    │   ├── src/
    │   │   ├── root.ts        # AppRouter 聚合
    │   │   ├── trpc.ts        # tRPC 初始化 & Context
    │   │   ├── router/        # tRPC 路由定义
    │   │   │   ├── auth.ts
    │   │   │   ├── trip.ts
    │   │   │   ├── poi.ts
    │   │   │   └── sync.ts
    │   │   └── services/      # 复杂业务逻辑
    │   │       ├── gis.service.ts
    │   │       └── optimization.service.ts
    │   └── package.json
    │
    ├── db/                    # ⭐ 数据库层
    │   ├── src/
    │   │   ├── schema/        # Drizzle 表定义
    │   │   │   ├── users.ts
    │   │   │   ├── trips.ts
    │   │   │   └── pois.ts
    │   │   ├── index.ts       # DB 连接实例导出
    │   │   └── migrations/    # 自动生成的迁移文件
    │   ├── drizzle.config.ts
    │   └── package.json
    │
    ├── auth/                  # 认证逻辑 (Auth.js)
    │   ├── src/
    │   │   ├── config.ts      # Auth.js 配置
    │   │   └── providers.ts   # Apple/Google 登录
    │   └── env.ts             # 环境变量校验
    │
    └── ui/                    # 共享 UI 组件 (shadcn/ui)
        └── src/components/
```

### 4.2 架构演进策略

#### 初期(MVP - 1 万 DAU)
- 利用 **Next.js API Routes** 托管 tRPC,部署在 **Vercel Edge/Serverless Functions**
- 数据库连接使用 **Supavisor**(Supabase 连接池)或 **HTTP Driver**(Neon)
- Redis 使用 **Upstash**(Serverless Redis)
- **⚠️ WebSocket 服务独立部署**:由于 Vercel Serverless 不支持长连接,协同编辑功能需部署到 Railway/Fly.io

**部署架构**:
```
                    ┌──> [ Vercel Serverless ] --> [ Supabase PG ]
[ Expo App ] ───────┤         (HTTP API)                ↓
                    └──> [ Railway/Fly.io ]      [ Upstash Redis ]
                         (WebSocket Server)
```

#### 中期(10 万 DAU)
- 将**计算密集型 Router**(如 `route.optimize`)剥离到独立的 Node.js 微服务
- 使用 **Fastify** 宿主独立的 tRPC Server,部署在 Railway/Fly.io(长连接支持)
- Next.js API Routes 通过 **tRPC Server-side Caller** 或 HTTP 代理调用
- 引入 **Redis Cluster** 和 **读写分离数据库**

**部署架构**:
```
                    ┌──> [ Vercel Serverless ]────┐
[ Expo App ] ───────┤         (HTTP API)          │
                    │                              ├──> [ Supabase PG (Primary) ]
                    └──> [ Railway/Fly.io ]────────┤          ↓
                         - WebSocket Server        └──> [ Supabase PG (Replica) ]
                         - Optimization Service
                                 ↓
                         [ Redis Cluster ]
```

#### 后期(100 万+ DAU)
- 完整的微服务架构:User Service、Trip Service、POI Service 独立部署
- 使用 **API Gateway**(如 Kong)统一入口,路由到不同 tRPC 服务
- 引入 **消息队列**(RabbitMQ/Kafka)解耦服务
- 数据库分片(Citus)或引入专业 NoSQL(MongoDB)处理海量 JSONB 数据

### 4.3 核心模块设计

#### 4.3.1 路由模块(Routers)

tRPC 的 **Router** 对应传统架构的 Controller/Service。每个 Router 负责一个业务领域。

**Router 职责划分**:
```typescript
// packages/api/src/root.ts
export const appRouter = createTRPCRouter({
  auth: authRouter,           // 登录、注册、Session 管理
  user: userRouter,           // 用户信息、偏好设置
  trip: tripRouter,           // 行程 CRUD、协同编辑
  day: dayRouter,             // 天数管理、项目排序
  poi: poiRouter,             // 地点搜索、详情、附近查询
  resource: resourceRouter,   // 照片、文档上传(Presigned URL)
  sync: syncRouter,           // 离线数据同步
  community: communityRouter, // 模板分享、评论
});

export type AppRouter = typeof appRouter;
```

#### 4.3.2 离线同步机制(Sync Service)

针对移动端 **Offline-First** 的需求,设计如下同步协议:

**基本原理**:
- 基于 **Last-Modified 时间戳** 的增量同步
- **软删除**(Soft Delete):所有核心表包含 `deleted_at` 字段
- **版本号**(Optional):冲突检测时使用乐观锁

**Schema 设计**:
```typescript
// packages/db/schema/trips.ts
export const trips = pgTable("trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["planning", "active", "completed"] }).default("planning"),
  
  // 同步字段
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // 软删除
  version: integer("version").default(1).notNull(), // 版本号
});
```

**同步流程(Pull - 客户端拉取变更)**:
```typescript
// packages/api/src/router/sync.ts
export const syncRouter = createTRPCRouter({
  pull: protectedProcedure
    .input(
      z.object({
        lastSyncTimestamp: z.date(),
        entities: z.array(z.enum(["trips", "pois", "resources"])),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // 查询所有自 lastSyncTimestamp 后变更的数据
      const changedTrips = await ctx.db.query.trips.findMany({
        where: and(
          eq(trips.userId, userId),
          gte(trips.updatedAt, input.lastSyncTimestamp)
        ),
        with: { days: { with: { items: true } } },
      });
      
      return {
        trips: changedTrips,
        serverTimestamp: new Date(),
      };
    }),
});
```

**冲突解决策略**:
1. **Last Write Wins(LWW)** - 初期采用
   - 简单高效,适合单人编辑为主的场景
   - 冲突时保留最新写入,丢失的数据客户端可提示用户

2. **Operational Transformation(OT)** - 中期升级
   - 适合实时协同编辑(类似 Google Docs)
   - 复杂度高,需要专门的 OT 库(如 ShareDB)

3. **CRDT** - 长期目标
   - 数学上保证最终一致性
   - 适合去中心化同步(如离线多设备)

#### 4.3.3 协同编辑(Real-time Collaboration)

**技术实现**:tRPC Subscriptions(基于 WebSockets)

**通道设计**:每个行程 ID(`trip_id`)对应一个 WebSocket Room

**事件流**:
```typescript
// packages/api/src/router/trip.ts
import { EventEmitter } from "events";
import { observable } from "@trpc/server/observable";

const ee = new EventEmitter();

export const tripRouter = createTRPCRouter({
  // Mutation:更新行程
  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateTripSchema }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.update(trips).set(input.data);
      ee.emit(`trip:${input.id}:updated`, { userId: ctx.session.user.id, data: updated });
      return updated;
    }),

  // Subscription:订阅行程变更
  onUpdate: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .subscription(({ input, ctx }) => {
      return observable((emit) => {
        const onUpdate = (data: any) => {
          if (data.userId !== ctx.session.user.id) emit.next(data);
        };
        ee.on(`trip:${input.tripId}:updated`, onUpdate);
        return () => ee.off(`trip:${input.tripId}:updated`, onUpdate);
      });
    }),
});
```

**⚠️ 重要部署说明**:

由于 **Vercel Serverless 不支持长连接 WebSocket**,上述 Subscription 代码需要部署到支持长连接的服务器:

**部署方案**:
1. 将 Subscription Router 独立部署到 **Railway/Fly.io**
2. 使用 Fastify 宿主 tRPC WebSocket Server
3. 客户端使用 `splitLink` 分离 HTTP 和 WebSocket 流量

详细实现请参考 [11.2 长连接限制](#112-长连接限制已在架构中解决)

#### 4.3.4 异步任务处理(Background Jobs)

使用 **BullMQ** 处理耗时操作:

**任务类型**:
1. **路线优化**:调用地图 API 计算距离矩阵,求解 TSP 路径
2. **图片处理**:生成缩略图、WebP 转码
3. **定时任务**:旅行提醒、纪念日推送

**示例**:
```typescript
// packages/api/src/jobs/optimize-route.job.ts
import { Queue, Worker } from "bullmq";

export const optimizeQueue = new Queue("optimize", { connection: redis });

export const optimizeWorker = new Worker("optimize", async (job) => {
  const { tripId } = job.data;
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  const optimizedRoute = await calculateOptimalRoute(trip);
  await db.update(trips).set({ optimizedRoute }).where(eq(trips.id, tripId));
  ee.emit(`trip:${tripId}:optimized`, optimizedRoute);
});
```

---

## 5. 数据库设计(Drizzle Schema)

### 5.1 核心表结构

#### 用户表(Users)
```typescript
// packages/db/schema/users.ts
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  travelMode: text("travel_mode", { enum: ["budget", "balanced", "luxury"] }).default("balanced"),
  transportPreference: text("transport_preference", { enum: ["public", "car", "walk", "mixed"] }).default("mixed"),
  enablePushNotifications: boolean("enable_push").default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 行程表(Trips)
```typescript
// packages/db/schema/trips.ts
export const trips = pgTable("trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  destination: text("destination"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status", { enum: ["planning", "active", "completed", "archived"] }).default("planning"),
  
  // JSONB:存储灵活的元数据
  metadata: jsonb("metadata").$type<{
    budget?: number;
    currency?: string;
    coverImage?: string;
    tags?: string[];
  }>(),
  
  // 同步字段
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  version: integer("version").default(1).notNull(),
});
```

#### POI 表(Points of Interest)
```typescript
// packages/db/schema/pois.ts
import { geometry } from "drizzle-orm/pg-core";

export const pois = pgTable("poi", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  
  // PostGIS 地理坐标(SRID 4326 = WGS-84)
  location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
  
  // 结构化地址
  address: jsonb("address").$type<{
    country: string;
    city: string;
    street: string;
  }>(),
  
  category: text("category", { enum: ["attraction", "restaurant", "hotel", "shopping", "transport"] }).notNull(),
  tags: jsonb("tags").$type<string[]>(),
  
  // 营业信息
  openingHours: jsonb("opening_hours").$type<{
    monday?: { open: string; close: string };
  }>(),
  
  // 外部数据源
  externalId: text("external_id"),
  externalSource: text("external_source"), // "amap" | "google" | "custom"
  
  rating: real("rating"),
  popularity: integer("popularity").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

### 5.2 关键索引设计

```typescript
// packages/db/schema/pois.ts
import { index } from "drizzle-orm/pg-core";

export const pois = pgTable("poi", { /* ... */ }, (table) => ({
  // 地理空间索引(GiST)- 用于附近查询
  locationIdx: index("poi_location_idx").on(table.location).using("gist"),
  categoryIdx: index("poi_category_idx").on(table.category),
}));

// trips 表索引
export const trips = pgTable("trip", { /* ... */ }, (table) => ({
  userIdIdx: index("trip_user_id_idx").on(table.userId),
  updatedAtIdx: index("trip_updated_at_idx").on(table.updatedAt),
}));
```

---

## 6. API 设计规范

### 6.1 tRPC Procedure 定义规范

#### 命名规范
- **格式**:`domain.action`(如 `trip.create`, `trip.list`, `user.getProfile`)
- **查询(Query)**:使用 `get`、`list`、`search` 前缀
- **变更(Mutation)**:使用 `create`、`update`、`delete` 前缀
- **订阅(Subscription)**:使用 `on` 前缀(如 `onUpdate`)

#### 输入验证
**必须** 使用 Zod Schema 定义 `.input()`:
```typescript
// ✅ 正确:明确的验证规则
.input(
  z.object({
    id: z.string().uuid("必须是有效的 UUID"),
    title: z.string().min(1).max(100),
  })
)
```

### 6.2 错误处理

使用 **TRPCError** 抛出标准错误:
```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "NOT_FOUND",
  message: "行程不存在",
});
```

**错误码映射表**:
| tRPC Code               | HTTP Status | 使用场景               |
| ----------------------- | ----------- | ---------------------- |
| `BAD_REQUEST`           | 400         | Zod 校验失败           |
| `UNAUTHORIZED`          | 401         | 未登录                 |
| `FORBIDDEN`             | 403         | 无权限访问资源         |
| `NOT_FOUND`             | 404         | 资源不存在             |
| `CONFLICT`              | 409         | 数据冲突(版本号不匹配) |
| `INTERNAL_SERVER_ERROR` | 500         | 系统级错误             |

---

## 7. 开发规范

### 7.1 代码组织

```
packages/api/src/
├── root.ts          # AppRouter 聚合点
├── trpc.ts          # 初始化、Context、Middleware
├── router/          # 业务路由
│   ├── trip.ts
│   ├── auth.ts
│   └── ...
└── services/        # 复杂业务逻辑
    ├── gis.service.ts
    └── export.service.ts
```

### 7.2 提交与工作流

**Git Hooks**:使用 Husky + Lint-staged
- **Pre-commit**:运行 `tsc` + `prettier`
- **Database Migration**:
  ```bash
  # 修改 schema.ts
  pnpm db:generate  # 生成迁移文件
  pnpm db:migrate   # 执行迁移
  ```

### 7.3 测试规范

**单元测试(Vitest)**:
```typescript
// packages/api/src/router/trip.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../root";

describe("trip.create", () => {
  it("should create a trip", async () => {
    const caller = appRouter.createCaller({ db, session: mockSession });
    const trip = await caller.trip.create({ title: "Tokyo Trip" });
    expect(trip.title).toBe("Tokyo Trip");
  });
});
```

**集成测试(tRPC Caller)**:
```typescript
const caller = appRouter.createCaller(ctx);
const result = await caller.trip.getById({ id: "xxx" });
```

---

## 8. 安全设计

### 8.1 认证与授权

#### 8.1.1 双重认证策略(Web vs Mobile)

由于 **HttpOnly Cookie** 在 React Native 环境下处理复杂且不稳定,我们采用**双重认证策略**:

**Web 管理端(Next.js)**:
- 使用 **Auth.js(NextAuth)** + **HttpOnly Cookie**(防 XSS 攻击)
- Cookie 自动随请求发送,无需手动处理

**移动端(Expo)**:
- 登录成功后,API 返回 **Access Token** 和 **Refresh Token**
- Token 存储在 **SecureStore**(加密存储)
- 每次请求通过 **Authorization Header** 发送

**实现方案**:

**1. Auth Router 支持双重返回**:
```typescript
// packages/api/src/router/auth.ts
export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await validateCredentials(input.email, input.password);
      
      // 生成 JWT Token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "15m" }
      );
      
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: "7d" }
      );
      
      // 检测客户端类型
      const userAgent = ctx.req.headers["user-agent"];
      const isMobile = userAgent?.includes("Expo");
      
      if (isMobile) {
        // 移动端:返回 Token
        return {
          user,
          accessToken,
          refreshToken,
        };
      } else {
        // Web 端:设置 HttpOnly Cookie
        ctx.res.setHeader("Set-Cookie", [
          `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/`,
          `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/`,
        ]);
        return { user };
      }
    }),
});
```

**2. tRPC Context 解析双重认证**:
```typescript
// packages/api/src/trpc.ts
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";

export const createContext = async ({ req, res }: CreateNextContextOptions) => {
  // 1. 尝试从 Cookie 获取 Session (Web 端)
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    return { req, res, session, db };
  }
  
  // 2. 尝试从 Authorization Header 获取 (移动端)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
      const user = await db.query.users.findFirst({ where: eq(users.id, decoded.userId) });
      if (user) {
        return { req, res, session: { user }, db };
      }
    } catch (error) {
      // Token 无效或过期
    }
  }
  
  // 3. 未认证
  return { req, res, session: null, db };
};

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  }
  return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
```

**3. Expo 客户端配置**:
```typescript
// apps/expo/src/utils/api.tsx
import * as SecureStore from "expo-secure-store";
import { httpBatchLink } from "@trpc/client";

export const api = createTRPCReact<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://seagull.vercel.app/api/trpc",
      headers: async () => {
        const token = await SecureStore.getItemAsync("accessToken");
        return {
          Authorization: token ? `Bearer ${token}` : undefined,
        };
      },
    }),
  ],
});
```

**4. Token 刷新机制**:
```typescript
// apps/expo/src/hooks/useTokenRefresh.ts
import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export function useTokenRefresh() {
  useEffect(() => {
    const interval = setInterval(async () => {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) return;
      
      try {
        const response = await fetch("https://seagull.vercel.app/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        
        const { accessToken } = await response.json();
        await SecureStore.setItemAsync("accessToken", accessToken);
      } catch (error) {
        // Refresh 失败,跳转登录页
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
      }
    }, 10 * 60 * 1000); // 每 10 分钟刷新一次
    
    return () => clearInterval(interval);
  }, []);
}
```

#### 8.1.2 权限控制(Authorization)

在 Procedure 内部检查资源归属权:
```typescript
// packages/api/src/router/trip.ts
export const tripRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const trip = await ctx.db.query.trips.findFirst({
        where: eq(trips.id, input.id),
      });
      
      // 权限检查
      if (trip?.userId !== ctx.session.user.id) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "您没有权限删除此行程" 
        });
      }
      
      await ctx.db.update(trips).set({ deletedAt: new Date() });
      return { success: true };
    }),
});
```

### 8.2 数据安全

**输入清洗**:Zod 自动剥离未定义字段,防止注入
**SQL 注入防护**:Drizzle ORM 使用参数化查询
**环境隔离**:生产环境密码通过 Vercel 环境变量注入

---

## 9. 部署与运维

### 9.1 部署架构

**Web/API**:Vercel(Singapore Region)
- 自动扩缩容,Git Push 即部署

**Database**:Supabase / Neon(Singapore Region)
- 开启 Connection Pooling(端口 6543)支持 Serverless

**Redis**:Upstash(Serverless Redis)或 Railway

### 9.2 监控与日志

**日志**:接入 Axiom 或 Datadog,通过 tRPC 中间件记录请求输入/输出
**错误追踪**:接入 Sentry,捕获未处理异常
**性能监控**:Vercel Analytics 查看 API 延迟和冷启动

---

## 10. 迭代规划

### 10.1 MVP 阶段
- 完成数据库 Schema 设计(User, Trip, Day, POI)
- 搭建 tRPC 基础架构,实现 CRUD
- 集成 Supabase Auth 和 Apple 登录
- 实现基础的图片上传(Presigned URL)

### 10.2 增强阶段
- 实现 `sync` 路由,支持 Expo 端的离线增量同步
- 引入 BullMQ 处理异步任务(邮件、数据统计)
- 集成 PostGIS 实现"查找周边景点"功能

### 10.3 完善阶段
- 开启 tRPC Subscriptions 实现多端协同
- 优化 API 性能,引入 Redis 缓存
- 对外开放 OpenAPI 接口

---

## 11. 风险评估

### 11.1 Serverless 冷启动
**风险**:Vercel 函数闲置后首次请求有 500ms-1s 延迟
**应对**:使用 Edge Runtime,或 Cron Job 定时预热

### 11.2 长连接限制(已在架构中解决)

**风险**:Vercel Serverless 不支持长时间 WebSocket,导致 tRPC Subscriptions 无法部署

**⚠️ 解决方案**:

#### 方案 1:独立 WebSocket 服务(推荐)

**服务端实现**:
```typescript
// packages/api/src/standalone/websocket-server.ts
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { appRouter } from "../root";
import ws from "@fastify/websocket";

const server = Fastify();
await server.register(ws);

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter },
});

await server.listen({ port: 3001, host: "0.0.0.0" });
```

**客户端配置**:
```typescript
// apps/expo/src/utils/api.ts
import { createWSClient, wsLink, httpBatchLink, splitLink } from "@trpc/client";

const wsClient = createWSClient({
  url: "wss://seagull-ws.railway.app/trpc", // 独立 WebSocket 域名
});

export const api = createTRPCReact<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsLink({ client: wsClient }), // Subscription 走 WebSocket
      false: httpBatchLink({ url: "https://seagull.vercel.app/api/trpc" }), // Query/Mutation 走 HTTP
    }),
  ],
});
```

**部署方式**:
- 使用 Railway/Fly.io 部署长连接服务
- 配置独立域名(如 `wss://seagull-ws.railway.app`)
- 通过 Redis Pub/Sub 与 Vercel Serverless 通信

#### 方案 2:使用 Supabase Realtime(备选)

若不想维护独立服务,可直接使用 Supabase 的 Realtime Channels:
```typescript
// 替代 tRPC Subscriptions
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, key);
const channel = supabase.channel(`trip:${tripId}`);

channel.on("broadcast", { event: "update" }, (payload) => {
  // 处理实时更新
});
```

**成本对比**:
- **Railway**:$5/月起(512MB 内存足够支撑 1 万并发连接)
- **Supabase Realtime**:免费额度 200 并发连接,超出后 $10/月

### 11.3 数据库连接数
**风险**:高并发下 Lambda 实例耗尽 Postgres 连接
**应对**:强制使用 Supavisor 或 PgBouncer 连接池

---

## 附录

### 术语表

- **POI**:Point of Interest,兴趣点
- **MVP**:Minimum Viable Product,最小可行产品
- **LWW**:Last-Write-Wins,最后写入胜出
- **JSONB**:PostgreSQL 中的二进制 JSON 数据类型
- **PostGIS**:PostgreSQL 的空间数据扩展
- **tRPC**:TypeScript Remote Procedure Call
- **DX**:Developer Experience,开发者体验

### 参考资料

- tRPC 官方文档:https://trpc.io/docs
- Drizzle ORM 文档:https://orm.drizzle.team/docs
- PostGIS 文档:https://postgis.net/docs/
- Auth.js 文档:https://authjs.dev/
- BullMQ 文档:https://docs.bullmq.io/
- T3 Stack:https://create.t3.gg/

---

**文档版本**:v1.0  
**最后更新**:2024-12-13  
**维护者**:Seagull Backend Team
