import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { appRouter, createTRPCContext, type AppRouter } from "@acme/api";

import { createPgliteTestDb } from "../../db/pglite";
import { setTestFetch } from "../../test/setup";
import { makeInMemoryTrpcFetch } from "../inMemoryFetch";

export async function createApiTestServer() {
  const dbHarness = await createPgliteTestDb();

  process.env.MAP_PROVIDER ??= "mapbox";
  process.env.MAPBOX_ACCESS_TOKEN ??= "test-token";

  const testAuth = {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const headerUserId = headers.get("x-test-user-id");
        const cookie = headers.get("cookie") ?? "";
        const cookieUserId = (() => {
          // Minimal cookie parsing for Expo client tests:
          // authClient.getCookie() -> "x-test-user-id=<id>" (or included among others)
          const m = cookie.match(/(?:^|;\s*)x-test-user-id=([^;]+)/i);
          return m?.[1] ? decodeURIComponent(m[1]) : null;
        })();

        const userId = headerUserId ?? cookieUserId;
        if (!userId) return null;

        // Ensure the user exists for FK constraints in DB (matches real-world expectation).
        // This keeps router tests concise: authenticated requests always have a backing user row.
        await dbHarness.client.exec(`
          INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
          VALUES (
            '${userId.replaceAll("'", "''")}',
            'Test User',
            '${`${userId}@test.local`.replaceAll("'", "''")}',
            true,
            NULL,
            now(),
            now()
          )
          ON CONFLICT (id) DO NOTHING;
        `);
        return { user: { id: userId } };
      },
    },
  } as any;

  const handlerFetch = makeInMemoryTrpcFetch({
    router: appRouter,
    createContext: async ({ headers }) =>
      await createTRPCContext({
        headers,
        auth: testAuth,
        db: dbHarness.db as any,
      }),
  });

  // Allow map-provider (Mapbox) calls in wishlist/map routers without network.
  setTestFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);

    if (url.includes("/api/trpc")) {
      return await handlerFetch(input, init);
    }

    if (url.startsWith("https://api.mapbox.com/geocoding/v5/mapbox.places/")) {
      // Minimal Mapbox Geocoding API stub (supports both search and reverse).
      const path = url.split("mapbox.places/")[1] ?? "";
      const queryPart = decodeURIComponent(path.split(".json")[0] ?? "");
      const isReverse = queryPart.includes(",");

      const feature = isReverse
        ? {
            id: "place.1",
            type: "Feature",
            place_name: "Hangzhou, Zhejiang, China",
            text: "Hangzhou",
            place_type: ["place"],
            center: [120.1551, 30.2741],
            context: [
              { id: "country.1", text: "China" },
              { id: "region.1", text: "Zhejiang" },
              { id: "place.1", text: "Hangzhou" },
            ],
          }
        : {
            id: "poi.1",
            type: "Feature",
            place_name: `${queryPart}, Hangzhou, Zhejiang, China`,
            text: queryPart || "POI",
            place_type: ["poi"],
            center: [120.1551, 30.2741],
            context: [
              { id: "country.1", text: "China" },
              { id: "region.1", text: "Zhejiang" },
              { id: "place.1", text: "Hangzhou" },
            ],
          };

      return new Response(JSON.stringify({ type: "FeatureCollection", features: [feature] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`[test] Unhandled fetch: ${url}`);
  }) as any);

  const makeClient = (userId: string | null) =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "http://test.local/api/trpc",
          fetch: globalThis.fetch as any,
          headers: () => (userId ? { "x-test-user-id": userId } : {}),
        }),
      ],
    });

  return {
    dbHarness,
    makeClient,
  };
}

