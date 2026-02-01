import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { createServerAdapter } from "@whatwg-node/server";

import { appRouter, createTRPCContext } from "@acme/api";
import { initAuth } from "@acme/auth";

function getBaseUrl(req: FastifyRequest) {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    (req.headers.host as string | undefined) ??
    "localhost:4000";
  return `${proto}://${host}`;
}

function toHeaders(incoming: FastifyRequest["headers"]) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(","));
  }
  return headers;
}

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  const server = Fastify({
    logger: isProd
      ? true
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss.l",
              ignore: "pid,hostname",
              singleLine: true,
            },
          },
        },
  });

  // Global error logging + dev-friendly response (for non-hijacked routes).
  server.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, "Unhandled server error");
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    const stack = err instanceof Error ? err.stack : undefined;
    if (process.env.NODE_ENV !== "production") {
      return reply.status(500).send({
        error: message,
        stack,
      });
    }
    return reply.status(500).send({ error: "Internal Server Error" });
  });

  await server.register(cors, {
    origin: true,
    credentials: true,
    allowedHeaders: ["content-type", "authorization", "cookie", "x-trpc-source"],
    methods: ["GET", "POST", "OPTIONS"],
  });

  // Better Auth (migrated from Next route handler)
  //
  // IMPORTANT: Fastify reads/parses the request body *before* calling the route handler.
  // Better Auth (via better-call) expects to read the raw body stream itself (e.g. request.json()).
  // So we must hijack + handle it in `onRequest` (before body parsing), otherwise the body becomes empty.
  server.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    url: "/api/auth/*",
    onRequest: async (req: FastifyRequest, reply: FastifyReply) => {
      const baseUrl = getBaseUrl(req);

      const auth = initAuth({
        baseUrl,
        productionUrl: process.env.PRODUCTION_URL ?? baseUrl,
        secret: process.env.AUTH_SECRET,
        discordClientId: process.env.AUTH_DISCORD_ID,
        discordClientSecret: process.env.AUTH_DISCORD_SECRET,
      });

      // Use @whatwg-node/server to bridge Node <-> Web Request/Response.
      // We hijack the raw response so the adapter can write headers/body directly.
      const adapter = createServerAdapter(async (request: Request) => {
        try {
          // Ensure absolute URL (Better Auth expects it)
          const url = request.url.startsWith("http")
            ? request.url
            : `${baseUrl}${request.url}`;
          const nextReq =
            url === request.url ? request : new Request(url, request);
          return await auth.handler(nextReq);
        } catch (err) {
          // Because we hijack the response, Fastify's default error logging won't catch these.
          req.log.error({ err }, "Better Auth handler threw");
          if (process.env.NODE_ENV !== "production") {
            return new Response(
              JSON.stringify({
                error:
                  err instanceof Error ? err.message : "Internal Server Error",
                stack: err instanceof Error ? err.stack : undefined,
              }),
              {
                status: 500,
                headers: { "content-type": "application/json" },
              },
            );
          }
          return new Response("Internal Server Error", { status: 500 });
        }
      });

      reply.hijack();
      try {
        await adapter(req.raw, reply.raw);
      } catch (err) {
        // Extra safety: if the adapter itself throws before it can write a response.
        req.log.error({ err }, "Better Auth adapter threw");
        try {
          reply.raw.statusCode = 500;
          reply.raw.setHeader("content-type", "application/json");
          reply.raw.end(
            JSON.stringify(
              process.env.NODE_ENV !== "production"
                ? {
                    error:
                      err instanceof Error
                        ? err.message
                        : "Internal Server Error",
                    stack: err instanceof Error ? err.stack : undefined,
                  }
                : { error: "Internal Server Error" },
            ),
          );
        } catch {
          // ignore
        }
      }
    },
    // This handler should never run (request is already hijacked in onRequest).
    handler: async () => undefined,
  });

  await server.register(fastifyTRPCPlugin, {
    prefix: "/api/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }: { req: FastifyRequest }) => {
        const baseUrl = getBaseUrl(req);
        return createTRPCContext({
          auth: initAuth({
            baseUrl,
            productionUrl: process.env.PRODUCTION_URL ?? baseUrl,
            secret: process.env.AUTH_SECRET,
            discordClientId: process.env.AUTH_DISCORD_ID,
            discordClientSecret: process.env.AUTH_DISCORD_SECRET,
          }),
          headers: toHeaders(req.headers),
        });
      },
      onError({ error, path }: { error: unknown; path?: string }) {
        server.log.error({ err: error, path }, "tRPC error");
      },
    },
  });

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? "0.0.0.0";

  await server.listen({ port, host });
}

await main();

