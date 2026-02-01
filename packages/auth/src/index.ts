import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins/email-otp";

import { db } from "@acme/db/client";

async function sendEmailOtpViaResend(opts: {
  to: string;
  from: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  discordClientId?: string;
  discordClientSecret?: string;
  extraPlugins?: TExtraPlugins;
}) {
  const emailFrom = process.env.EMAIL_FROM ?? "Seagull <no-reply@localhost>";
  const requestedEmailProvider = (process.env.EMAIL_OTP_PROVIDER ?? "log")
    .toLowerCase()
    .trim();
  const emailProvider =
    requestedEmailProvider === "resend" &&
    (!process.env.RESEND_API_KEY ||
      !process.env.EMAIL_FROM ||
      emailFrom === "Seagull <no-reply@localhost>")
      ? "log"
      : requestedEmailProvider;

  if (requestedEmailProvider === "resend" && emailProvider !== "resend") {
    // eslint-disable-next-line no-console
    console.warn(
      "[EMAIL_OTP] EMAIL_OTP_PROVIDER=resend but RESEND_API_KEY/EMAIL_FROM is missing (or EMAIL_FROM is default). Falling back to log provider.",
    );
  }

  const plugins: BetterAuthPlugin[] = [
    oAuthProxy({
      productionURL: options.productionUrl,
    }),
    // Type-only workaround: pnpm can lead to multiple @better-auth/core type instances,
    // making BetterAuthPlugin appear incompatible across import graphs.
    expo() as unknown as BetterAuthPlugin,
    emailOTP({
      // Send OTP for sign-in / verification / reset-password.
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === "sign-in"
            ? "Your Seagull sign-in code"
            : type === "email-verification"
              ? "Verify your email"
              : "Reset your password";
        const text = `Your verification code is: ${otp}\n\nType: ${type}\nIf you didn't request this, you can ignore this email.`;

        try {
          if (emailProvider === "resend") {
            await sendEmailOtpViaResend({
              to: email,
              from: emailFrom,
              subject,
              text,
            });
            return;
          }

          // Default: dev-friendly provider
          // eslint-disable-next-line no-console
          console.log(`[EMAIL_OTP] to=${email} type=${type} otp=${otp}`);
        } catch (err) {
          // Make sure this error is visible in dev logs (Better Auth may convert it to a generic 500).
          // eslint-disable-next-line no-console
          console.error("[EMAIL_OTP] Failed to send OTP", {
            email,
            type,
            provider: emailProvider,
            err,
          });
          throw err;
        }
      },
      storeOTP: "hashed",
      expiresIn: 300,
      allowedAttempts: 3,
    }),
  ];

  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [...plugins, ...(options.extraPlugins ?? [])],
    socialProviders:
      options.discordClientId && options.discordClientSecret
        ? {
            discord: {
              clientId: options.discordClientId,
              clientSecret: options.discordClientSecret,
              redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
            },
          }
        : {},
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
