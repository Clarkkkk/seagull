import type { AnyRouter } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export function makeInMemoryTrpcFetch(opts: {
  router: AnyRouter;
  endpoint?: string;
  createContext: (args: { headers: Headers }) => Promise<unknown> | unknown;
}) {
  const endpoint = opts.endpoint ?? "/api/trpc";

  // Note: in Node 22, DOM lib types and undici types can disagree on `Request`.
  // Keep this helper permissive (it's test-only).
  const handlerFetch = (async (input: any, init?: any) => {
    const req = input instanceof Request ? input : (new Request(String(input), init) as any);

    return fetchRequestHandler({
      endpoint,
      req,
      router: opts.router,
      createContext: async () => await opts.createContext({ headers: req.headers }),
    });
  }) as typeof fetch;

  return handlerFetch;
}

