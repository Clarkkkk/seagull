import { TRPCClientError } from "@trpc/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestServer } from "./server";

describe("api.auth router", () => {
  const userA = "userA";

  let server: Awaited<ReturnType<typeof createApiTestServer>>;

  beforeAll(async () => {
    server = await createApiTestServer();
  });

  beforeEach(async () => {
    await server.dbHarness.resetDb();
  });

  it("getSession returns null when unauthenticated", async () => {
    const client = server.makeClient(null);
    const session = await client.auth.getSession.query();
    expect(session).toBeNull();
  });

  it("getSession returns session when authenticated", async () => {
    const client = server.makeClient(userA);
    const session = await client.auth.getSession.query();
    expect(session?.user?.id).toBe(userA);
  });

  it("getSecretMessage throws UNAUTHORIZED when unauthenticated", async () => {
    const client = server.makeClient(null);
    await expect(client.auth.getSecretMessage.query()).rejects.toBeInstanceOf(TRPCClientError);
    await expect(client.auth.getSecretMessage.query()).rejects.toMatchObject({
      data: { code: "UNAUTHORIZED" },
    });
  });

  it("getSecretMessage returns message when authenticated", async () => {
    const client = server.makeClient(userA);
    const msg = await client.auth.getSecretMessage.query();
    expect(msg).toContain("secret message");
  });
});

