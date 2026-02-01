import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      // Optional: only required if you enable Discord OAuth
      AUTH_DISCORD_ID: z.string().min(1).optional(),
      AUTH_DISCORD_SECRET: z.string().min(1).optional(),
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),
      NODE_ENV: z.enum(["development", "production"]).optional(),

      // Email OTP (optional, but required for real email delivery)
      EMAIL_OTP_PROVIDER: z.enum(["log", "resend"]).optional(),
      EMAIL_FROM: z.string().min(1).optional(),
      RESEND_API_KEY: z.string().min(1).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
