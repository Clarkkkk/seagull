# Seagull 用户认证模块后端技术方案 (T3 Stack)

> 基于 Create T3 Turbo + tRPC + Auth.js + Drizzle ORM + PostgreSQL

## 1. 概述

用户认证模块是 Seagull 旅行规划应用的基础设施，负责处理用户注册、登录、会话管理及账户安全等核心功能。本文档基于 **T3 Stack** 技术栈，采用 tRPC 提供端到端类型安全的 API，使用 Auth.js 实现多端认证策略，确保 Web 管理端和 Expo 移动端的最佳体验。

### 1.1 技术栈概览

| 层级             | 技术选型                   | 说明                              |
| ---------------- | -------------------------- | --------------------------------- |
| **API 框架**     | tRPC v11 + @trpc/server    | 类型安全的 RPC 调用，零样板代码   |
| **认证框架**     | Auth.js (NextAuth.js)      | 支持多种登录方式，统一认证入口    |
| **数据库**       | PostgreSQL (Supabase/Neon) | Serverless 数据库，内置连接池     |
| **ORM**          | Drizzle ORM                | 轻量级，SQL-first，冷启动快       |
| **验证库**       | Zod                        | Schema 定义与运行时校验           |
| **密码哈希**     | bcrypt / Argon2            | 通过 Auth.js Credentials Provider |
| **Session 管理** | JWT + Redis (可选)         | 双重认证策略（Cookie + Token）    |
| **短信/邮件**    | BullMQ + 第三方服务        | 异步发送验证码和通知              |

## 2. 功能需求与产品对齐

基于产品需求文档 (`docs/user/product.md`)，用户认证模块需实现以下功能：

### 2.1 核心功能

#### 2.1.1 用户注册

**支持的注册方式**：
1. **手机号 + 验证码注册**（主推）
   - 手机号格式验证（11位，以1开头）
   - 6位数字验证码，有效期10分钟
   - 同一手机号1小时内最多发送5次验证码
   - 验证码输入错误3次后需重新获取

2. **邮箱 + 密码注册**
   - 邮箱格式实时验证
   - 验证邮件5分钟内发送，24小时内有效
   - 邮件包含验证链接，点击后自动完成验证

3. **第三方账号注册**（预留）
   - 预留 OAuth 2.0 接口（微信、Apple、Google）
   - 首次登录时提示关联手机号（可选跳过）

**注册流程**：
```
输入基本信息 → 验证身份 → 设置密码（可选）→ 完善个人资料（可选）
```

**密码策略**（遵循产品需求）：
- 长度：8-20位
- 复杂度：必须包含字母和数字
- 强度分级：弱（纯数字/字母）、中（字母+数字）、强（大小写+数字+特殊字符）
- 拒绝常见弱密码（如123456）

#### 2.1.2 用户登录

**支持的登录方式**：
1. **手机号 + 验证码登录**（主推）
   - 支持记住上次登录手机号
   - 验证码机制与注册流程相同

2. **账号 + 密码登录**
   - 支持使用用户名/手机号/邮箱 + 密码组合
   - **密码连续输错5次**：需要额外验证（短信验证码/图形验证码）
   - **密码连续输错10次**：账户临时锁定30分钟
   - 提供"记住密码"选项（默认7天有效期）

3. **第三方账号快捷登录**（预留）
   - 微信、Apple ID、Google
   - 已关联手机号的第三方账号自动关联到现有账户

**登录状态管理**：
- 默认登录状态保持30天
- 用户可在设置中修改自动登录有效期（7天/30天/90天/永久）
- 敏感操作（支付、账户设置）需二次验证

#### 2.1.3 账户安全

1. **密码管理**
   - 修改密码前需验证原密码或短信验证码
   - 新密码不能与最近3次使用的密码相同
   - 密码修改成功后，向用户注册邮箱发送通知
   - 密码变更后，所有设备需重新登录（当前设备除外）

2. **账户保护**
   - **登录异常提醒**：新设备登录、异地登录、长时间未登录
   - **账户锁定机制**：
     - 密码错误5次：需额外验证
     - 密码错误10次：锁定30分钟
     - 系统检测到可疑操作时主动锁定
   - 锁定状态下，仅能通过短信/邮箱验证码解锁

3. **设备管理**（MVP 阶段实现）
   - 查看当前登录的所有设备（设备类型、名称、地点、最近活跃时间）
   - 远程下线其他设备（单个/批量）
   - 下线操作实时生效，目标设备立即退出登录

#### 2.1.4 用户管理

1. **个人资料**
   - 用户昵称：2-20个字符，30天可修改1次
   - 头像：拍照/相册/系统模板
   - 联系方式：手机号（90天限制更换1次）、邮箱（最多绑定3个）

2. **账号注销**
   - 注销前需完成双重验证（短信+邮件）
   - 设置14天"冷静期"，期间可随时取消
   - 注销后数据处理遵循隐私政策

### 2.2 非功能需求

| 指标类别               | 要求    |
| ---------------------- | ------- |
| **登录成功率**         | > 99%   |
| **认证响应时间**       | < 300ms |
| **注册流程完成时间**   | < 2分钟 |
| **服务可用性**         | > 99.9% |
| **异常登录检测准确率** | > 95%   |

## 3. 技术架构设计

### 3.1 整体架构

用户认证模块作为 **T3 Monorepo** 的核心包（`packages/auth`），与其他模块无缝集成：

```
[ Expo App ] ────┐
                 │
[ Next.js Web ]──┼──> [ tRPC API Routes ] ──> [ Auth Router ]
                 │         ↓                        ↓
                 │    [ Auth.js ]          [ Drizzle ORM ]
                 │         ↓                        ↓
                 └──> [ Vercel Edge ]      [ PostgreSQL ]
                              ↓                     ↓
                       [ Upstash Redis ]    [ Supabase/Neon ]
                              ↓
                       [ BullMQ Queue ]
                              ↓
                    [ 短信/邮件服务 ]
```

### 3.2 双重认证策略（解决移动端 Cookie 问题）

由于 **Expo/React Native 环境下 HttpOnly Cookie 处理复杂且不稳定**，我们采用**双重认证策略**：

#### Web 管理端 (Next.js)
- 使用 **Auth.js + HttpOnly Cookie**（防 XSS 攻击）
- Cookie 自动随请求发送，无需手动处理
- Session 存储在加密的 JWT Cookie 中

#### 移动端 (Expo)
- 登录成功后，API 返回 **Access Token** 和 **Refresh Token**
- Token 存储在 **SecureStore**（iOS Keychain / Android Keystore）
- 每次请求通过 **Authorization Header** 发送

**技术实现对比**：

| 维度     | Web 端                 | Expo 端               |
| -------- | ---------------------- | --------------------- |
| 认证方式 | Auth.js Session Cookie | JWT Bearer Token      |
| 存储位置 | HttpOnly Cookie        | SecureStore (加密)    |
| 传输方式 | 自动携带 Cookie        | headers.Authorization |
| 刷新机制 | Session 自动延期       | Refresh Token 轮换    |
| 安全性   | 防 XSS，易受 CSRF      | 需防 Token 泄露       |

### 3.3 Monorepo 包结构

```
packages/
├── auth/                      # ⭐ 认证核心包
│   ├── src/
│   │   ├── config.ts          # Auth.js 配置
│   │   ├── providers/         # 登录提供者
│   │   │   ├── credentials.ts # 用户名密码登录
│   │   │   ├── email.ts       # 邮箱魔法链接
│   │   │   ├── sms.ts         # 短信验证码登录（自定义）
│   │   │   └── oauth.ts       # 第三方 OAuth（预留）
│   │   ├── middleware.ts      # 认证中间件
│   │   ├── utils/
│   │   │   ├── jwt.ts         # JWT 工具（Expo 端）
│   │   │   ├── password.ts    # 密码哈希与验证
│   │   │   └── otp.ts         # 验证码生成与验证
│   │   └── index.ts
│   └── env.ts                 # 环境变量校验
│
├── api/                       # tRPC API
│   └── src/router/
│       ├── auth.ts            # 认证 Router
│       ├── user.ts            # 用户管理 Router
│       └── device.ts          # 设备管理 Router
│
└── db/                        # 数据库
    └── src/schema/
        ├── users.ts           # 用户表
        ├── sessions.ts        # Session 表（可选）
        ├── accounts.ts        # 第三方账号关联
        ├── verification_tokens.ts  # 验证令牌
        └── devices.ts         # 设备表
```

## 4. 数据模型

### 4.1 用户核心表结构

**users表**（核心用户信息）:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    nickname VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, disabled, deleted
    failed_login_attempts INT DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

**user_profiles表**（用户扩展信息）:
```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    bio TEXT,
    gender VARCHAR(10),
    birth_date DATE,
    country VARCHAR(50),
    language VARCHAR(20),
    timezone VARCHAR(50),
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**user_devices表**（用户设备信息）:
```sql
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    device_os VARCHAR(50),
    app_version VARCHAR(20),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_trusted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);
```

**refresh_tokens表**（刷新令牌管理）:
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    device_id VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**verification_codes表**（验证码管理）:
```sql
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    contact VARCHAR(255) NOT NULL, -- email or phone
    type VARCHAR(20) NOT NULL, -- registration, password_reset, login
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 4.2 索引设计

```sql
-- 用户查询索引
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);

-- 设备索引
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON user_devices(device_id);

-- 令牌索引
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 验证码索引
CREATE INDEX idx_verification_codes_contact ON verification_codes(contact);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

## 5. API 设计 (tRPC Router)

### 5.1 tRPC Router 结构

用户认证模块通过 tRPC Router 提供类型安全的 API，位于 `packages/api/src/router/auth.ts`：

```typescript
// 核心 Router 定义
export const authRouter = createTRPCRouter({
  // 公开过程（无需认证）
  registerWithPhone: publicProcedure,
  sendVerificationCode: publicProcedure,
  loginWithPassword: publicProcedure,
  loginWithOTP: publicProcedure,
  refreshToken: publicProcedure,
  resetPassword: publicProcedure,
  
  // 受保护过程（需要认证）
  logout: protectedProcedure,
  changePassword: protectedProcedure,
});

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure,
  updateProfile: protectedProcedure,
  deleteAccount: protectedProcedure,
});

export const deviceRouter = createTRPCRouter({
  listDevices: protectedProcedure,
  revokeDevice: protectedProcedure,
  revokeAllOtherDevices: protectedProcedure,
});
```

**详细实现见** `docs/user/backend-auth-api.md`

### 5.2 tRPC 端点映射

tRPC 自动生成类型安全的 RPC 调用，客户端调用方式：

**Web 端（Next.js）**：
```typescript
// 自动生成的类型推导
const { data, error } = await trpc.auth.loginWithPassword.mutate({
  identifier: "user@example.com",
  password: "SecureP@ssw0rd",
});
```

**Expo 端（React Native）**：
```typescript
// 相同的类型安全 API
const result = await trpcClient.auth.loginWithPassword.mutate({
  identifier: "13800138000",
  password: "SecureP@ssw0rd",
  deviceInfo: { deviceId: "device-uuid", deviceType: "mobile" },
});
```

### 5.3 API 调用示例

**注册请求**（手机号 + 验证码）：
```typescript
// 1. 发送验证码
await trpc.auth.sendVerificationCode.mutate({
  contact: "13800138000",
  type: "registration",
});

// 2. 注册用户
const { user, accessToken, refreshToken } = await trpc.auth.registerWithPhone.mutate({
  phone: "13800138000",
  code: "123456",
  username: "traveler123",
  password: "SecureP@ssw0rd", // 可选
});
```

**登录请求**（密码登录）：
```typescript
const { user, accessToken, refreshToken } = await trpc.auth.loginWithPassword.mutate({
  identifier: "traveler123", // 用户名/邮箱/手机号
  password: "SecureP@ssw0rd",
  deviceInfo: {
    deviceId: "device-uuid",
    deviceName: "iPhone 15",
    deviceType: "mobile",
  },
});
```

**登录请求**（验证码登录）：
```typescript
const { user, accessToken, refreshToken } = await trpc.auth.loginWithOTP.mutate({
  phone: "13800138000",
  code: "123456",
});
```

**修改密码**：
```typescript
await trpc.auth.changePassword.mutate({
  oldPassword: "OldP@ssw0rd",
  newPassword: "NewP@ssw0rd",
});
```

**设备管理**：
```typescript
// 查看所有设备
const devices = await trpc.device.listDevices.query();

// 远程下线指定设备
await trpc.device.revokeDevice.mutate({ deviceId: "device-uuid" });

// 一键下线所有其他设备
await trpc.device.revokeAllOtherDevices.mutate({ 
  currentDeviceId: "current-device-uuid" 
});
```

## 6. 核心流程实现

### 6.1 用户注册流程

1. **验证和准备**:
   - 验证用户输入(用户名、邮箱、手机号、密码)
   - 检查用户名/邮箱/手机号是否已存在
   - 密码强度检查

2. **数据处理**:
   - 密码使用 Argon2 算法哈希处理
   - 创建用户记录
   - 创建用户档案记录

3. **验证流程**:
   - 如果使用邮箱注册，发送验证邮件
   - 如果使用手机号注册，发送验证短信
   - 用户完成验证后，激活账号

4. **令牌生成**:
   - 生成JWT访问令牌
   - 生成刷新令牌并存储
   - 返回令牌和用户信息

### 6.2 用户登录流程

**密码登录流程**:
1. 用户提交标识符(用户名/邮箱/手机号)和密码
2. 系统查找用户并验证密码
3. 失败时增加失败计数，超过阈值锁定账户
4. 成功时记录登录信息，重置失败计数
5. 生成访问令牌和刷新令牌
6. 记录设备信息
7. 返回令牌和用户信息

**验证码登录流程**:
1. 用户请求发送验证码到手机
2. 系统生成验证码并通过短信发送
3. 用户提交手机号和验证码
4. 系统验证验证码有效性
5. 验证成功后，执行与密码登录相同的后续步骤

### 6.3 令牌刷新流程

1. 客户端提交刷新令牌
2. 系统验证刷新令牌的有效性和过期状态
3. 验证成功后，吊销旧的刷新令牌
4. 生成新的访问令牌和刷新令牌
5. 返回新令牌

### 6.4 密码修改流程

1. 用户提交旧密码和新密码
2. 系统验证旧密码正确性
3. 检查新密码是否符合强度要求
4. 使用Argon2算法处理新密码
5. 更新密码哈希并记录修改时间
6. 可选：吊销所有现有刷新令牌，强制重新登录

### 6.5 账号注销流程

1. 用户请求注销账号
2. 系统要求用户进行身份验证（密码或验证码）
3. 验证成功后，执行以下操作：
   - 将用户状态更新为"deleted"
   - 设置deleted_at时间戳
   - 匿名化用户个人数据（邮箱、手机号等）
   - 吊销所有刷新令牌
   - 记录注销操作日志

## 7. 安全策略

### 7.1 密码安全

1. **哈希算法**:
   - 使用 **bcrypt** 或 **Argon2** 算法（通过 Auth.js 集成）
   - bcrypt 配置：
     - 轮数（rounds）: 12
     - 盐长度: 自动生成
   - Argon2 配置（可选）：
     - 内存成本: 64MB
     - 迭代次数: 3
     - 并行度: 4

2. **密码策略**（与产品需求对齐）:
   - **长度**: 8-20 个字符
   - **复杂度**: 必须包含字母和数字（最低要求）
   - **强度分级**：
     - 弱：纯数字或纯字母
     - 中：字母 + 数字 ✅ **最低要求**
     - 强：大小写 + 数字 + 特殊字符
   - 禁用常见弱密码（如 123456、password）
   - 禁止重复使用最近 3 次使用过的密码

3. **密码重置**:
   - 通过验证码进行密码重置（短信/邮件）
   - 验证码有效期：10 分钟
   - 密码重置后通知用户
   - 重置后所有其他设备需重新登录

### 7.2 令牌安全（双重策略）

#### Web 端（Auth.js Session Cookie）
1. **Session Cookie**:
   - 使用 **HttpOnly + Secure + SameSite=Lax** 属性
   - 防止 XSS 攻击（HttpOnly）
   - 防止 CSRF 攻击（SameSite）
   - 仅在 HTTPS 传输（Secure）
   - 有效期：30 天（可配置）

#### Expo 端（JWT Bearer Token）
1. **Access Token**:
   - 使用 **HS256** 算法（对称加密，适合移动端）
   - 有效期：15 分钟
   - 包含：用户 ID、邮箱、签发时间
   - 存储位置：**SecureStore**（iOS Keychain / Android Keystore）
   - 传输方式：`Authorization: Bearer {token}`

2. **Refresh Token**:
   - 随机生成的 UUID
   - 有效期：30 天
   - 单设备使用（绑定设备 ID）
   - 数据库存储：**Token 哈希值**（防数据库泄露）
   - 支持轮换：每次刷新时生成新的 Refresh Token

3. **令牌撤销**:
   - 支持单个令牌撤销（设备下线）
   - 支持用户所有令牌撤销（密码修改、账户注销）
   - 异常行为自动撤销令牌（可疑登录）
   - 撤销记录存储在 `refreshTokens.isRevoked` 字段

### 7.3 防攻击措施（与产品需求对齐）

1. **速率限制**（Redis 实现）:
   - 登录尝试：每 IP 每分钟最多 5 次
   - 验证码请求：每手机号/邮箱每小时最多 5 次
   - 密码重置：每账号每 24 小时最多 3 次
   - 实现方式：滑动窗口算法

2. **账户锁定机制**（与产品需求完全对齐）:
   - **密码错误 5 次**：需要额外验证（短信/邮件验证码）
   - **密码错误 10 次**：账户锁定 30 分钟
   - 锁定期间仅能通过验证码解锁
   - 成功登录后重置失败次数

3. **异常检测**:
   - 新设备登录通知用户
   - 异地登录检测（基于 IP 地址）
   - 长时间未登录提醒
   - 可疑操作自动锁定账户

4. **防护技术**:
   - 全站 **TLS 1.3** 加密
   - **HTTPS** 强制跳转
   - HTTP 安全头（HSTS, X-Content-Type-Options, X-Frame-Options）
   - CORS 严格配置
   - 敏感操作需二次验证

### 7.4 设备管理（MVP 阶段实现）

1. **设备信息记录**:
   - 设备 ID（UUID）
   - 设备名称（如 "iPhone 15"）
   - 设备类型（mobile/tablet/desktop）
   - 操作系统版本（iOS 17.0 / Android 14）
   - 应用版本
   - 最后登录时间和 IP 地址

2. **多设备支持**（MVP 功能）:
   - ✅ 查看当前登录的所有设备
   - ✅ 远程下线指定设备（单个/批量）
   - ✅ 一键下线所有其他设备
   - 下线操作实时生效，目标设备立即退出登录

3. **可信设备**（后续优化）:
   - 用户可将设备标记为"可信设备"
   - 可信设备简化二次验证流程
   - 可信设备获得更长的令牌有效期（可选）

## 8. 缓存策略

### 8.1 Redis 缓存设计（Upstash 或自托管）

1. **用户信息缓存**:
   - 键格式：`user:{userId}:profile`
   - 内容：用户基本信息（JSON）
   - 过期时间：30 分钟
   - 更新策略：写穿透（写数据库时同步更新缓存）
   - 失效场景：用户信息修改、登出

2. **验证码缓存**:
   - 键格式：`otp:{contact}:{type}`
   - 内容：验证码哈希、尝试次数、生成时间
   - 过期时间：10 分钟
   - 限制：验证失败 3 次后作废
   - 防暴力破解：每次失败增加延迟

3. **速率限制器**（滑动窗口）:
   - 键格式：`ratelimit:{action}:{identifier}:{timestamp}`
   - 登录限制：`ratelimit:login:{ip}` → 5 次/分钟
   - 验证码限制：`ratelimit:otp:{contact}` → 5 次/小时
   - 密码重置限制：`ratelimit:reset:{userId}` → 3 次/24 小时

4. **Token 撤销列表**（可选）:
   - 键格式：`token:revoked:{tokenHash}`
   - 内容：撤销时间、原因
   - 过期时间：与 Token 剩余有效期一致
   - 用途：快速检查 Token 是否被撤销

### 8.2 本地缓存（应用层）

1. **配置缓存**:
   - 内容：密码策略、验证码配置等
   - 更新：应用启动时加载，支持热更新
   - 生命周期：应用程序生命周期

2. **JWT 密钥缓存**:
   - 内容：用于签名/验证 JWT 的密钥
   - 更新：密钥轮换时更新
   - 安全性：仅在内存中存储，不持久化

## 9. 异步任务处理（BullMQ + Redis）

使用 **BullMQ** 作为任务队列（基于 Redis），处理以下异步场景：

### 9.1 短信/邮件发送

1. **发送验证码**:
   - 队列：`sms-queue` / `email-queue`
   - 优先级：高
   - 重试策略：指数退避，最多 3 次
   - 超时：30 秒
   - 失败处理：记录日志、告警通知

2. **发送安全通知**:
   - 队列：`notification-queue`
   - 触发场景：
     - 新设备登录
     - 异地登录
     - 密码修改成功
     - 账户锁定
   - 通知渠道：邮件、短信、应用内消息

### 9.2 用户活动审计

1. **登录/登出记录**:
   - 队列：`audit-queue`
   - 内容：用户 ID、设备 ID、IP 地址、时间戳
   - 用途：审计日志、行为分析、异常检测

2. **敏感操作记录**:
   - 密码修改、账户注销、设备下线
   - 用于合规性审计和安全分析

### 9.3 定时清理任务

1. **过期验证码清理**:
   - 周期：每小时
   - 任务：删除 `verificationCodes.expiresAt < NOW()`

2. **已注销账户匿名化**:
   - 周期：每天
   - 任务：匿名化 `deletedAt < NOW() - 14天` 的用户数据

3. **过期 Token 清理**:
   - 周期：每天
   - 任务：删除 `refreshTokens.expiresAt < NOW()` 的记录

## 10. 监控与告警

### 10.1 关键指标

1. **性能指标**（使用 Axiom / Datadog）:
   - API 响应时间（p50/p95/p99）
   - 登录/注册成功率
   - Token 验证延迟
   - 数据库查询时间
   - **目标**：登录响应时间 < 300ms

2. **安全指标**:
   - 登录失败率（异常高峰预警）
   - 异常登录次数（新设备/异地）
   - 验证码失败率
   - 密码重置频率
   - 账户锁定数量

3. **容量指标**:
   - 活跃用户数（DAU）
   - 并发登录用户数
   - 数据库连接使用率
   - Redis 内存使用率
   - 消息队列堆积

### 10.2 日志规范

1. **日志级别**:
   - **ERROR**：影响用户操作的错误（数据库连接失败、验证失败）
   - **WARN**：需要关注但不影响操作的问题（高失败率、缓存失效）
   - **INFO**：正常操作记录（登录、注册、设备下线）
   - **DEBUG**：开发环境详细信息（参数值、中间过程）

2. **日志内容**:
   - 时间戳（ISO 8601）
   - 请求 ID（用于链路追踪）
   - 用户 ID（脱敏）
   - 操作类型（login、register、password_change）
   - 结果状态（success / failure）
   - 错误代码和消息
   - 执行时间（毫秒）
   - 客户端信息（User-Agent、IP）

3. **敏感信息处理**:
   - ❌ 不记录：密码、Token、验证码
   - 🔒 脱敏记录：手机号（135****8000）、邮箱（user@***）
   - ✅ 完整记录：IP 地址（用于安全分析）、设备 ID

### 10.3 告警策略

1. **实时告警**（P0 - 立即处理）:
   - 服务不可用（HTTP 5xx > 5%）
   - 数据库连接异常
   - Redis 连接失败
   - 验证码发送失败率 > 10%

2. **聚合告警**（P1 - 1 小时内处理）:
   - 登录失败率 > 10%
   - API 错误率 > 5%
   - 响应时间 p95 > 1 秒
   - 异常登录峰值（短时间内大量新设备）

3. **告警渠道**:
   - **P0 严重**：钉钉 + 短信 + 电话
   - **P1 中等**：钉钉 + 邮件
   - **P2 轻微**：邮件 + 日志系统

## 11. 部署与扩展

### 11.1 部署架构（Vercel + Supabase）

**MVP 阶段**：
1. **API 服务**：
   - Next.js API Routes（Vercel Serverless）
   - tRPC 端点自动扩展
   - 冷启动优化：Drizzle ORM 轻量级

2. **数据库**：
   - PostgreSQL（Supabase 或 Neon）
   - 内置连接池（PgBouncer）
   - 自动备份和高可用

3. **缓存层**：
   - Redis（Upstash 或自托管）
   - 用于验证码、速率限制、Session

4. **消息队列**：
   - BullMQ（基于 Redis）
   - 短信/邮件异步发送
   - 审计日志记录

**扩展阶段**：
- 多区域部署（CDN 加速）
- 数据库读写分离
- Redis 集群模式
- 监控和告警系统集成

### 11.2 资源估算

按每日活跃用户 10 万计算：

1. **计算资源**:
   - Vercel：自动扩展（按使用量计费）
   - 预期：平均 100-500 并发请求

2. **数据库**:
   - Supabase：2vCPU，4GB 内存，100GB 存储
   - 月增长：约 0.5GB（用户数据）

3. **缓存**:
   - Upstash Redis：1GB 内存（按使用量计费）
   - 验证码、速率限制、Session 存储

4. **存储**:
   - 数据库备份：自动管理
   - 日志存储：Axiom 或 Datadog（按量计费）

### 11.3 灾备策略

1. **数据备份**:
   - PostgreSQL：Supabase 自动每日备份
   - 备份保留：30 天
   - 备份恢复时间：< 1 小时

2. **故障转移**:
   - 数据库：Supabase 自动故障转移
   - Redis：Upstash 自动副本
   - API：Vercel 多区域部署

3. **灾难恢复**:
   - **RTO**（恢复时间目标）：< 15 分钟
   - **RPO**（恢复点目标）：< 5 分钟
   - 定期测试恢复流程

## 12. 未来规划

### 12.1 功能扩展（Post-MVP）

1. **第三方登录集成**（预留架构）:
   - **微信登录**：通过 OAuth 2.0
   - **Apple ID**：通过 Sign in with Apple
   - **Google 账号**：通过 Google OAuth 2.0
   - 统一的身份联合策略（账号关联）
   - 首次登录自动注册

2. **高级安全功能**:
   - **两因素认证（2FA）**：TOTP / SMS
   - **生物识别登录**：Face ID / Touch ID（Expo 集成）
   - **风险感知自适应认证**：根据登录风险等级动态调整验证方式
   - **异常登录检测**：机器学习模型识别可疑行为

3. **用户中心增强**:
   - 用户权益与等级体系
   - 用户偏好智能建议
   - 多语言、多区域支持
   - 账户恢复流程优化

### 12.2 技术演进

1. **认证架构升级**:
   - **OAuth 2.0 / OpenID Connect** 完整实现
   - **统一身份访问管理（IAM）**：集中式权限管理
   - **细粒度权限模型**：RBAC / ABAC
   - **JWT 密钥轮换**：定期更新签名密钥

2. **性能优化**:
   - 数据库查询优化（N+1 问题、复杂查询优化）
   - 索引调优（基于实际查询模式）
   - 缓存策略优化（热点数据识别）
   - 代码性能分析（Profiling）

3. **安全强化**:
   - **安全扫描与渗透测试自动化**（OWASP Top 10）
   - **敏感操作行为分析**：异常操作检测
   - **实时风险评估系统**：基于多维度评分
   - **合规性审计**：GDPR / CCPA 支持

## 13. 快速参考

### 密码策略速查表

| 项目         | 要求               | 说明                |
| ------------ | ------------------ | ------------------- |
| **长度**     | 8-20 位            | 产品需求            |
| **复杂度**   | 字母 + 数字        | 最低要求            |
| **强度分级** | 弱/中/强           | 中等 = 字母+数字    |
| **禁用密码** | 常见弱密码         | 如 123456、password |
| **重复使用** | 禁止最近 3 次      | 防止密码复用        |
| **哈希算法** | bcrypt (rounds=12) | 通过 Auth.js        |

### 登录失败处理速查表

| 失败次数  | 处理方式       | 用户提示                        |
| --------- | -------------- | ------------------------------- |
| 1-4 次    | 继续允许       | "账号或密码错误"                |
| **5 次**  | ⚠️ 需额外验证   | "密码错误5次，请使用验证码登录" |
| 6-9 次    | 继续需验证     | 同上                            |
| **10 次** | 🔒 锁定 30 分钟 | "账户已锁定，请30分钟后再试"    |
| 解锁      | 验证码解锁     | 通过短信/邮件验证码             |

### 验证码配置速查表

| 项目         | 值         | 说明             |
| ------------ | ---------- | ---------------- |
| **长度**     | 6 位数字   | 产品需求         |
| **有效期**   | 10 分钟    | 注册/登录/重置   |
| **最多尝试** | 3 次       | 超过则作废       |
| **频率限制** | 5 次/小时  | 每手机号/邮箱    |
| **发送延迟** | 防暴力破解 | 每次失败增加延迟 |

### Token 配置速查表

| 项目              | Web 端          | Expo 端              |
| ----------------- | --------------- | -------------------- |
| **认证方式**      | Session Cookie  | JWT Bearer Token     |
| **存储**          | HttpOnly Cookie | SecureStore          |
| **Access Token**  | Session         | 15 分钟              |
| **Refresh Token** | 自动延期        | 30 天                |
| **传输**          | 自动携带        | Authorization Header |

### 设备管理速查表

| 功能         | MVP | 说明             |
| ------------ | --- | ---------------- |
| **查看设备** | ✅   | 列出所有登录设备 |
| **下线设备** | ✅   | 单个/批量下线    |
| **一键下线** | ✅   | 下线所有其他设备 |
| **可信设备** | ⏳   | 后续优化         |
| **设备指纹** | ⏳   | 后续优化         |

---

## 14. 参考资料

### 安全标准
- [OWASP 认证安全最佳实践](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 威胁模型](https://tools.ietf.org/html/rfc6819)

### 密码与加密
- [JWT 安全实践指南](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Argon2 密码哈希最佳配置](https://password-hashing.net/)
- [bcrypt 安全配置](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### 基础设施
- [Redis 安全指南](https://redis.io/topics/security)
- [PostgreSQL 性能优化](https://www.postgresql.org/docs/current/performance-tips.html)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [tRPC 文档](https://trpc.io/)
- [Auth.js 文档](https://authjs.dev/)

### 部署与运维
- [Vercel 部署指南](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Upstash Redis 文档](https://upstash.com/docs/redis)
- [BullMQ 文档](https://docs.bullmq.io/)

---

## 15. 文档版本历史

| 版本 | 日期       | 更新内容                                     |
| ---- | ---------- | -------------------------------------------- |
| 1.0  | 2025-01-14 | 初版：基于 T3 Stack 的完整认证系统设计       |
| -    | -          | ✅ 双重认证策略（Web Cookie + Mobile JWT）    |
| -    | -          | ✅ 完整的登录/注册/密码重置流程               |
| -    | -          | ✅ 设备管理功能（MVP 阶段）                   |
| -    | -          | ✅ 安全防护机制（锁定、速率限制、Token 撤销） |
| -    | -          | ✅ 缓存策略（Redis）                          |
| -    | -          | ✅ 异步任务处理（BullMQ）                     |
| -    | -          | ✅ 监控与告警                                 |
| -    | -          | ✅ Vercel + Supabase 部署架构                 |
