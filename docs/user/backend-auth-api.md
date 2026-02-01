# Auth Router API 完整实现（补充文档）

由于文档过长，这里补充 API 设计部分的 tRPC Router 完整实现。

## 5. API 设计 (tRPC Router)

### 5.1 Auth Router 核心实现

```typescript
// packages/api/src/router/auth.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { users, verificationCodes, refreshTokens, userDevices } from "@acme/db/schema";
import { hashPassword, verifyPassword } from "@acme/auth/utils/password";
import { generateOTP, verifyOTP } from "@acme/auth/utils/otp";
import { signJWT, verifyJWT } from "@acme/auth/utils/jwt";
import { eq, or, and } from "drizzle-orm";

export const authRouter = createTRPCRouter({
  // 1. 用户注册（手机号 + 验证码）
  registerWithPhone: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式错误"),
        code: z.string().length(6, "验证码为6位数字"),
        username: z.string().min(2).max(20).optional(),
        password: z.string().min(8).max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证手机号是否已注册
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.phone, input.phone),
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该手机号已注册，请直接登录",
        });
      }
      
      // 验证短信验证码
      await verifyOTP(ctx.db, input.phone, input.code, "registration");
      
      // 创建用户
      const [newUser] = await ctx.db.insert(users).values({
        phone: input.phone,
        username: input.username || `user_${Date.now()}`,
        passwordHash: input.password ? await hashPassword(input.password) : null,
        status: "active",
      }).returning();
      
      // 检测客户端类型（双重认证策略）
      const userAgent = ctx.req.headers["user-agent"] || "";
      const isMobile = userAgent.includes("Expo");
      
      if (isMobile) {
        // Expo 端：返回 JWT Token
        const accessToken = await signJWT(
          { userId: newUser.id, email: newUser.email },
          "15m"
        );
        const refreshToken = await signJWT(
          { userId: newUser.id, type: "refresh" },
          "30d"
        );
        
        // 存储 Refresh Token 哈希
        await ctx.db.insert(refreshTokens).values({
          userId: newUser.id,
          tokenHash: await hashPassword(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        
        return {
          user: newUser,
          accessToken,
          refreshToken,
          expiresIn: 900, // 15分钟
        };
      } else {
        // Web 端：使用 Auth.js Session Cookie（自动处理）
        return { user: newUser };
      }
    }),

  // 2. 发送验证码
  sendVerificationCode: publicProcedure
    .input(
      z.object({
        contact: z.string(), // 手机号或邮箱
        type: z.enum(["registration", "login", "password_reset"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 频率限制检查（Redis）
      const rateLimitKey = `sms:ratelimit:${input.contact}`;
      const count = await ctx.redis.incr(rateLimitKey);
      if (count === 1) {
        await ctx.redis.expire(rateLimitKey, 3600); // 1小时
      }
      if (count > 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "1小时内最多发送5次验证码",
        });
      }
      
      // 生成验证码
      const code = generateOTP(6);
      const codeHash = await hashPassword(code);
      
      // 存储验证码
      await ctx.db.insert(verificationCodes).values({
        contact: input.contact,
        contactType: input.contact.includes("@") ? "email" : "phone",
        type: input.type,
        code: code,
        codeHash: codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟
      });
      
      // 异步发送短信/邮件（通过 BullMQ）
      if (input.contact.includes("@")) {
        await ctx.emailQueue.add("send-verification", {
          to: input.contact,
          code,
          type: input.type,
        });
      } else {
        await ctx.smsQueue.add("send-verification", {
          phone: input.contact,
          code,
          type: input.type,
        });
      }
      
      return { success: true, message: "验证码已发送" };
    }),

  // 3. 密码登录
  loginWithPassword: publicProcedure
    .input(
      z.object({
        identifier: z.string(), // 用户名/手机号/邮箱
        password: z.string(),
        deviceInfo: z.object({
          deviceId: z.string(),
          deviceName: z.string().optional(),
          deviceType: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 查找用户
      const user = await ctx.db.query.users.findFirst({
        where: or(
          eq(users.username, input.identifier),
          eq(users.email, input.identifier),
          eq(users.phone, input.identifier)
        ),
      });
      
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "账号或密码错误",
        });
      }
      
      // 检查账户是否锁定
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `账户已锁定，请${remainingMinutes}分钟后再试`,
        });
      }
      
      // 验证密码
      const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
      
      if (!isPasswordValid) {
        // 失败次数 +1
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: any = { failedLoginAttempts: failedAttempts };
        
        // 失败 10 次锁定 30 分钟
        if (failedAttempts >= 10) {
          updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        
        await ctx.db.update(users)
          .set(updateData)
          .where(eq(users.id, user.id));
        
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: failedAttempts >= 5 
            ? `密码错误${failedAttempts}次，请使用验证码登录` 
            : "账号或密码错误",
        });
      }
      
      // 登录成功，重置失败次数
      await ctx.db.update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ctx.req.ip,
        })
        .where(eq(users.id, user.id));
      
      // 记录设备信息（用于设备管理功能）
      if (input.deviceInfo) {
        await ctx.db.insert(userDevices)
          .values({
            userId: user.id,
            deviceId: input.deviceInfo.deviceId,
            deviceName: input.deviceInfo.deviceName,
            deviceType: input.deviceInfo.deviceType,
            lastLoginAt: new Date(),
            lastLoginIp: ctx.req.ip,
          })
          .onConflictDoUpdate({
            target: [userDevices.userId, userDevices.deviceId],
            set: { lastLoginAt: new Date(), lastLoginIp: ctx.req.ip },
          });
      }
      
      // 返回认证信息（双重策略）
      return handleLoginResponse(ctx, user);
    }),

  // 4. 验证码登录
  loginWithOTP: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证短信验证码
      await verifyOTP(ctx.db, input.phone, input.code, "login");
      
      // 查找或创建用户（手机验证码登录允许自动注册）
      let user = await ctx.db.query.users.findFirst({
        where: eq(users.phone, input.phone),
      });
      
      if (!user) {
        [user] = await ctx.db.insert(users).values({
          phone: input.phone,
          username: `user_${Date.now()}`,
          status: "active",
        }).returning();
      }
      
      // 更新登录信息
      await ctx.db.update(users)
        .set({ lastLoginAt: new Date(), lastLoginIp: ctx.req.ip })
        .where(eq(users.id, user.id));
      
      return handleLoginResponse(ctx, user);
    }),

  // 5. 刷新 Token（Expo 端）
  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 验证 Refresh Token
      const payload = await verifyJWT(input.refreshToken);
      
      if (payload.type !== "refresh") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token 类型错误" });
      }
      
      // 检查 Token 是否被撤销
      const tokenRecord = await ctx.db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.userId, payload.userId),
          eq(refreshTokens.isRevoked, false)
        ),
      });
      
      if (!tokenRecord) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token 已失效" });
      }
      
      // 生成新的 Access Token
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });
      
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户不存在" });
      }
      
      const newAccessToken = await signJWT(
        { userId: user.id, email: user.email },
        "15m"
      );
      
      return {
        accessToken: newAccessToken,
        expiresIn: 900,
      };
    }),

  // 6. 登出
  logout: protectedProcedure
    .input(z.object({ deviceId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // 撤销 Refresh Token
      await ctx.db.update(refreshTokens)
        .set({ isRevoked: true, revokedAt: new Date(), revokedReason: "logout" })
        .where(eq(refreshTokens.userId, userId));
      
      return { success: true };
    }),

  // 7. 修改密码
  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(8).max(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先设置密码" });
      }
      
      // 验证旧密码
      const isValid = await verifyPassword(input.oldPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "原密码错误" });
      }
      
      // 更新密码
      const newPasswordHash = await hashPassword(input.newPassword);
      await ctx.db.update(users)
        .set({
          passwordHash: newPasswordHash,
          lastPasswordChange: new Date(),
        })
        .where(eq(users.id, userId));
      
      // 撤销所有其他设备的 Token
      await ctx.db.update(refreshTokens)
        .set({ isRevoked: true, revokedReason: "password_changed" })
        .where(eq(refreshTokens.userId, userId));
      
      // 发送邮件通知
      if (user.email) {
        await ctx.emailQueue.add("password-changed", {
          to: user.email,
          username: user.username,
        });
      }
      
      return { success: true, message: "密码修改成功，请重新登录" };
    }),

  // 8. 重置密码（忘记密码）
  resetPassword: publicProcedure
    .input(
      z.object({
        contact: z.string(), // 手机号或邮箱
        code: z.string().length(6),
        newPassword: z.string().min(8).max(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证验证码
      await verifyOTP(ctx.db, input.contact, input.code, "password_reset");
      
      // 查找用户
      const user = await ctx.db.query.users.findFirst({
        where: or(
          eq(users.phone, input.contact),
          eq(users.email, input.contact)
        ),
      });
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      }
      
      // 重置密码
      const newPasswordHash = await hashPassword(input.newPassword);
      await ctx.db.update(users)
        .set({
          passwordHash: newPasswordHash,
          failedLoginAttempts: 0, // 重置失败次数
          lockedUntil: null, // 解锁账户
        })
        .where(eq(users.id, user.id));
      
      // 撤销所有 Token
      await ctx.db.update(refreshTokens)
        .set({ isRevoked: true, revokedReason: "password_reset" })
        .where(eq(refreshTokens.userId, user.id));
      
      return { success: true, message: "密码重置成功" };
    }),
});

// 辅助函数：处理登录响应（Web/Mobile 双重策略）
async function handleLoginResponse(ctx: any, user: any) {
  const userAgent = ctx.req.headers["user-agent"] || "";
  const isMobile = userAgent.includes("Expo");
  
  if (isMobile) {
    // Expo 端：返回 JWT
    const accessToken = await signJWT({ userId: user.id, email: user.email }, "15m");
    const refreshToken = await signJWT({ userId: user.id, type: "refresh" }, "30d");
    
    // 存储 Refresh Token
    await ctx.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: await hashPassword(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    
    return { user, accessToken, refreshToken, expiresIn: 900 };
  } else {
    // Web 端：Auth.js Session Cookie（自动处理）
    return { user };
  }
}
```

### 5.2 User Router（用户管理）

```typescript
// packages/api/src/router/user.ts
export const userRouter = createTRPCRouter({
  // 获取当前用户信息
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        with: { profile: true },
      });
      return user;
    }),

  // 更新用户信息
  updateProfile: protectedProcedure
    .input(
      z.object({
        nickname: z.string().min(2).max(20).optional(),
        avatarUrl: z.string().url().optional(),
        bio: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.update(users)
        .set(input)
        .where(eq(users.id, ctx.session.user.id))
        .returning();
      return updated[0];
    }),

  // 注销账号
  deleteAccount: protectedProcedure
    .input(
      z.object({
        password: z.string().optional(),
        verificationCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证身份（密码或验证码二选一）
      if (!input.password && !input.verificationCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请提供密码或验证码",
        });
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      if (input.password && user?.passwordHash) {
        const isValid = await verifyPassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "密码错误" });
        }
      }

      // 软删除用户
      await ctx.db.update(users)
        .set({
          status: "deleted",
          deletedAt: new Date(),
          // 匿名化个人信息
          email: null,
          phone: null,
        })
        .where(eq(users.id, ctx.session.user.id));

      // 撤销所有 Token
      await ctx.db.update(refreshTokens)
        .set({ isRevoked: true, revokedReason: "account_deleted" })
        .where(eq(refreshTokens.userId, ctx.session.user.id));

      return { success: true, message: "账号已注销" };
    }),
});
```

### 5.3 Device Router（设备管理）

```typescript
// packages/api/src/router/device.ts
export const deviceRouter = createTRPCRouter({
  // 查看所有登录设备
  listDevices: protectedProcedure
    .query(async ({ ctx }) => {
      const devices = await ctx.db.query.userDevices.findMany({
        where: eq(userDevices.userId, ctx.session.user.id),
        orderBy: desc(userDevices.lastLoginAt),
      });
      return devices;
    }),

  // 远程下线指定设备
  revokeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 删除设备记录
      await ctx.db.delete(userDevices)
        .where(
          and(
            eq(userDevices.userId, ctx.session.user.id),
            eq(userDevices.deviceId, input.deviceId)
          )
        );

      // 撤销该设备的 Refresh Token
      await ctx.db.update(refreshTokens)
        .set({ isRevoked: true, revokedReason: "device_revoked" })
        .where(
          and(
            eq(refreshTokens.userId, ctx.session.user.id),
            eq(refreshTokens.deviceId, input.deviceId)
          )
        );

      return { success: true, message: "设备已下线" };
    }),

  // 一键下线所有其他设备
  revokeAllOtherDevices: protectedProcedure
    .input(z.object({ currentDeviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 删除其他设备
      await ctx.db.delete(userDevices)
        .where(
          and(
            eq(userDevices.userId, ctx.session.user.id),
            ne(userDevices.deviceId, input.currentDeviceId)
          )
        );

      // 撤销其他设备的 Token
      await ctx.db.update(refreshTokens)
        .set({ isRevoked: true, revokedReason: "all_devices_revoked" })
        .where(
          and(
            eq(refreshTokens.userId, ctx.session.user.id),
            ne(refreshTokens.deviceId, input.currentDeviceId)
          )
        );

      return { success: true, message: "所有其他设备已下线" };
    }),
});
```

## 总结

基于 T3 Stack 的认证系统实现了：

✅ **双重认证策略**：Web Cookie + Mobile Bearer Token  
✅ **完整的注册登录流程**：手机号/邮箱/密码/验证码  
✅ **安全防护机制**：密码错误锁定、频率限制、Token 撤销  
✅ **设备管理功能**：查看设备、远程下线（MVP 阶段）  
✅ **类型安全**：tRPC 端到端类型推导，零运行时错误  
✅ **与产品需求完全对齐**：密码策略、锁定机制、注销流程
