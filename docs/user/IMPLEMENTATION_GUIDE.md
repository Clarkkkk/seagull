# 认证系统实现指南

快速参考：如何基于文档实现认证系统。

---

## 🎯 实现路线图

```
Week 1: 基础设施
├── 配置 Auth.js
├── 实现 JWT 工具
├── 设置 Redis 连接
└── 配置 BullMQ 队列

Week 2: 核心 API
├── 实现 Auth Router（8 个 API）
├── 实现 User Router（3 个 API）
├── 实现 Device Router（3 个 API）
└── 集成短信/邮件服务

Week 3: 测试与优化
├── 单元测试
├── 集成测试
├── E2E 测试
└── 性能优化
```

---

## 📦 包结构与文件清单

```
packages/
├── auth/                           # ⭐ 认证核心包
│   ├── src/
│   │   ├── config.ts               # Auth.js 配置
│   │   ├── providers/
│   │   │   ├── credentials.ts       # 用户名密码登录
│   │   │   ├── email.ts             # 邮箱魔法链接（可选）
│   │   │   └── oauth.ts             # 第三方 OAuth（预留）
│   │   ├── middleware.ts            # 认证中间件
│   │   ├── utils/
│   │   │   ├── jwt.ts               # JWT 签名/验证
│   │   │   ├── password.ts          # 密码哈希/验证
│   │   │   ├── otp.ts               # OTP 生成/验证
│   │   │   └── rate-limit.ts        # 速率限制
│   │   └── index.ts                 # 导出
│   ├── env.ts                       # 环境变量校验
│   └── package.json
│
├── api/                             # tRPC API
│   └── src/router/
│       ├── auth.ts                  # Auth Router（8 个 API）
│       ├── user.ts                  # User Router（3 个 API）
│       ├── device.ts                # Device Router（3 个 API）
│       └── index.ts                 # 合并 Router
│
└── db/                              # 数据库
    └── src/schema/
        ├── users.ts                 # 用户表 + 索引
        ├── profiles.ts              # 用户资料表
        ├── devices.ts               # 设备表 + 索引
        ├── tokens.ts                # Token 表 + 索引
        ├── verification.ts          # 验证码表 + 索引
        └── index.ts                 # 导出所有 Schema
```

---

## 🔧 实现步骤

### Step 1: 配置 Auth.js（Day 1）

**文件**：`packages/auth/src/config.ts`

```typescript
import { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@acme/db";
import { users } from "@acme/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "./utils/password";

export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Username/Email/Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: or(
            eq(users.username, credentials.identifier as string),
            eq(users.email, credentials.identifier as string),
            eq(users.phone, credentials.identifier as string)
          ),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
```

### Step 2: 实现密码工具（Day 1）

**文件**：`packages/auth/src/utils/password.ts`

```typescript
import bcrypt from "bcrypt";

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Step 3: 实现 JWT 工具（Day 1）

**文件**：`packages/auth/src/utils/jwt.ts`

```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

export async function signJWT(
  payload: Record<string, unknown>,
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJWT(
  token: string
): Promise<Record<string, unknown>> {
  const verified = await jwtVerify(token, secret);
  return verified.payload;
}
```

### Step 4: 实现 OTP 工具（Day 1）

**文件**：`packages/auth/src/utils/otp.ts`

```typescript
import crypto from "crypto";
import { db } from "@acme/db";
import { verificationCodes } from "@acme/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword } from "./password";

export function generateOTP(length: number = 6): string {
  return crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, "0");
}

export async function verifyOTP(
  db: any,
  contact: string,
  code: string,
  type: string
): Promise<void> {
  const record = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.contact, contact),
      eq(verificationCodes.type, type),
      eq(verificationCodes.isUsed, false)
    ),
  });

  if (!record || record.expiresAt < new Date()) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "验证码已过期或不存在",
    });
  }

  if (record.attempts >= record.maxAttempts) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "验证码尝试次数过多，请重新获取",
    });
  }

  const isValid = await verifyPassword(code, record.codeHash);

  if (!isValid) {
    await db.update(verificationCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(verificationCodes.id, record.id));

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "验证码错误",
    });
  }

  // 标记为已使用
  await db.update(verificationCodes)
    .set({ isUsed: true, usedAt: new Date() })
    .where(eq(verificationCodes.id, record.id));
}
```

### Step 5: 实现速率限制（Day 2）

**文件**：`packages/auth/src/utils/rate-limit.ts`

```typescript
import { redis } from "@acme/redis";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return current <= limit;
}

export async function getRateLimitRemaining(
  key: string,
  limit: number
): Promise<number> {
  const current = await redis.get(key);
  return Math.max(0, limit - (parseInt(current || "0")));
}
```

### Step 6: 实现 Auth Router（Day 2-3）

**文件**：`packages/api/src/router/auth.ts`

详见 `docs/user/backend-auth-api.md` 第 5.1 章

关键点：
- ✅ 8 个 API 完整实现
- ✅ 双重认证策略（Web/Mobile）
- ✅ 密码错误锁定机制
- ✅ 验证码频率限制
- ✅ Token 刷新和撤销

### Step 7: 实现 User Router（Day 3）

**文件**：`packages/api/src/router/user.ts`

详见 `docs/user/backend-auth-api.md` 第 5.2 章

关键点：
- ✅ 获取/更新用户信息
- ✅ 账号注销（14 天冷静期）
- ✅ 身份验证（密码或验证码）

### Step 8: 实现 Device Router（Day 3）

**文件**：`packages/api/src/router/device.ts`

详见 `docs/user/backend-auth-api.md` 第 5.3 章

关键点：
- ✅ 查看所有登录设备
- ✅ 远程下线指定设备
- ✅ 一键下线所有其他设备

### Step 9: 配置 BullMQ 队列（Day 4）

**文件**：`packages/api/src/queues/index.ts`

```typescript
import { Queue, Worker } from "bullmq";
import { redis } from "@acme/redis";

// 创建队列
export const smsQueue = new Queue("sms", { connection: redis });
export const emailQueue = new Queue("email", { connection: redis });
export const auditQueue = new Queue("audit", { connection: redis });

// SMS Worker
new Worker("sms", async (job) => {
  const { phone, code, type } = job.data;
  // 调用短信服务（如阿里云、腾讯云）
  console.log(`Sending SMS to ${phone}: ${code}`);
}, { connection: redis });

// Email Worker
new Worker("email", async (job) => {
  const { to, code, type } = job.data;
  // 调用邮件服务（如 SendGrid、AWS SES）
  console.log(`Sending email to ${to}: ${code}`);
}, { connection: redis });

// Audit Worker
new Worker("audit", async (job) => {
  const { userId, action, details } = job.data;
  // 记录审计日志
  console.log(`Audit: ${userId} ${action}`, details);
}, { connection: redis });
```

### Step 10: 集成到 tRPC 路由（Day 4）

**文件**：`packages/api/src/root.ts`

```typescript
import { createTRPCRouter } from "./trpc";
import { authRouter } from "./router/auth";
import { userRouter } from "./router/user";
import { deviceRouter } from "./router/device";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  device: deviceRouter,
});

export type AppRouter = typeof appRouter;
```

---

## 🧪 测试清单

### 单元测试

```typescript
// packages/auth/src/utils/__tests__/password.test.ts
describe("Password Utils", () => {
  it("should hash and verify password", async () => {
    const password = "SecureP@ssw0rd";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject invalid password", async () => {
    const hash = await hashPassword("SecureP@ssw0rd");
    const isValid = await verifyPassword("WrongPassword", hash);
    expect(isValid).toBe(false);
  });
});
```

### 集成测试

```typescript
// packages/api/src/router/__tests__/auth.test.ts
describe("Auth Router", () => {
  it("should register user with phone", async () => {
    const result = await caller.auth.registerWithPhone({
      phone: "13800138000",
      code: "123456",
      username: "testuser",
    });
    expect(result.user).toBeDefined();
    expect(result.accessToken).toBeDefined();
  });

  it("should login with password", async () => {
    const result = await caller.auth.loginWithPassword({
      identifier: "testuser",
      password: "SecureP@ssw0rd",
    });
    expect(result.user).toBeDefined();
  });

  it("should lock account after 10 failed attempts", async () => {
    for (let i = 0; i < 10; i++) {
      await expect(
        caller.auth.loginWithPassword({
          identifier: "testuser",
          password: "WrongPassword",
        })
      ).rejects.toThrow();
    }
    // 第 11 次应该被锁定
    await expect(
      caller.auth.loginWithPassword({
        identifier: "testuser",
        password: "SecureP@ssw0rd",
      })
    ).rejects.toThrow("已锁定");
  });
});
```

### E2E 测试

```typescript
// apps/nextjs/__tests__/auth.e2e.ts
describe("Auth Flow E2E", () => {
  it("should complete full registration and login flow", async () => {
    // 1. 发送验证码
    await page.goto("/register");
    await page.fill('input[name="phone"]', "13800138000");
    await page.click("button:has-text('发送验证码')");

    // 2. 输入验证码
    const code = await getVerificationCode("13800138000");
    await page.fill('input[name="code"]', code);

    // 3. 设置密码
    await page.fill('input[name="password"]', "SecureP@ssw0rd");
    await page.click("button:has-text('注册')");

    // 4. 验证登录
    await expect(page).toHaveURL("/dashboard");
  });
});
```

---

## 🔐 安全检查清单

- [ ] 密码使用 bcrypt 哈希（rounds=12）
- [ ] JWT 使用 HS256 算法签名
- [ ] Token 存储在 SecureStore（Expo）或 HttpOnly Cookie（Web）
- [ ] 验证码存储为哈希值，不存储明文
- [ ] 密码错误 10 次锁定 30 分钟
- [ ] 验证码 5 次/小时频率限制
- [ ] 所有敏感操作记录审计日志
- [ ] 使用 HTTPS + TLS 1.3
- [ ] CORS 严格配置
- [ ] 敏感操作需二次验证

---

## 📊 性能目标

| 指标           | 目标    | 实现方式                    |
| -------------- | ------- | --------------------------- |
| 登录响应时间   | < 300ms | 数据库索引优化 + Redis 缓存 |
| 注册成功率     | > 99%   | 重试机制 + 错误处理         |
| Token 验证延迟 | < 10ms  | 本地 JWT 验证               |
| 验证码发送延迟 | < 2s    | 异步队列 + 短信服务         |

---

## 🚀 部署检查清单

### 环境变量

```bash
# Auth.js
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com

# JWT
JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# 短信服务
SMS_PROVIDER=aliyun  # 或 tencent
SMS_ACCESS_KEY=...
SMS_SECRET_KEY=...

# 邮件服务
EMAIL_PROVIDER=sendgrid  # 或 aws-ses
EMAIL_API_KEY=...
```

### 数据库迁移

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 验证 Schema
pnpm db:studio
```

### 监控设置

- [ ] 配置 Axiom / Datadog 日志收集
- [ ] 设置性能监控告警
- [ ] 配置安全告警（失败率、异常登录）
- [ ] 设置 Sentry 错误追踪

---

## 📚 相关文档

- `docs/user/product.md` - 产品需求
- `docs/user/backend.md` - 技术架构
- `docs/user/backend-auth-api.md` - API 实现
- `docs/user/REVIEW_SUMMARY.md` - Review 总结

---

**祝你实现顺利！** 🎉
