---
name: testing-guide
description: Defines Seagull testing strategy, tradeoffs, and required coverage. Use when adding or updating tests, implementing features that touch backend/frontend, introducing concurrency/locks, or when asked how to structure/run tests in this repo.
---

# Seagull Testing Guide

## Quick start (default approach)

When implementing a feature that touches backend/frontend:

1. **Classify behavior**:
   - **service semantics** (pure rules): put tests near the service
   - **cross-layer behavior** (tRPC + react-query + cache invalidation + timers): use `packages/test-integration`
   - **deployment-shape behavior** (real Postgres + pooling + true concurrency): run strict smoke tests pre-release

2. **Prefer real integrations over hook mocks**:
   - Do **not** mock `useMutation` when the goal is react-query/tRPC integration.
   - Only mock/alias **platform-only deps** (Expo/RN modules that break node/jsdom).

3. **Use header-injected identity for multi-user tests**:
   - Client: set `httpBatchLink({ headers: () => ({ 'x-test-user-id': userId }) })`
   - Server: in `createContext({ headers })`, read `headers.get('x-test-user-id')`

## Where tests live

- **Cross-layer**: `packages/test-integration/src/**`
  - in-memory tRPC fetch: `packages/test-integration/src/trpc/inMemoryFetch.ts`
  - PGlite DB harness: `packages/test-integration/src/db/pglite.ts`
  - example tests:
    - expiry: `packages/test-integration/src/trpc/tripLock.expiry.test.ts`
    - concurrency smoke: `packages/test-integration/src/trpc/tripLock.concurrent.test.ts`
- **Backend package tests**: `packages/api/src/**/*.test.ts`

## How to run

```bash
pnpm -F @acme/test-integration test
pnpm -F @acme/test-integration typecheck
pnpm -F @acme/api test
pnpm -F @acme/api typecheck
```

## Test case style rules

- **One behavior per test**: a test name should read like a requirement.
- **Assert the contract**:
  - success payload shape
  - error code (`CONFLICT`, `UNAUTHORIZED`, etc.)
  - cache behavior (invalidate/refetch) where relevant
- **Avoid flakiness**:
  - prefer deterministic triggers over “sleep”
  - if time is essential, isolate it (DB state manipulation or controlled timers)

## Concurrency policy (locks/idempotency)

### Implementation guidance

For lock acquisition, prefer **DB-atomic** statements (e.g. `onConflictDoUpdate + where + returning`) so correctness does not depend on JS scheduling.

### Testing guidance

Use two stages:
- **CI/PR smoke (fast)**: multi-user `Promise.allSettled` concurrency test verifying:
  - exactly one success, rest `CONFLICT`
  - no raw DB errors leak to the client
- **Pre-release strict smoke**: run the same scenario against **real Postgres** to cover pooling/isolation/scheduler differences.

## Definition of Done (mandatory coverage)

When a feature is “done”, tests must cover **all necessary scenarios** (not “at least one test”).

### Backend (packages/api)
- **Service rules**: cover all branches and boundary cases (expiry edges, ownership checks, conflict mapping, empty-return defenses).
- **tRPC route changes**: cover:
  - happy path
  - key failure path(s) with correct error codes/shape
  - at least one invalid input path

### Frontend (Expo business layer)
- **Effects/polling/side effects**: cover:
  - trigger conditions and call counts
  - success and failure behavior (invalidate/refetch, error handling)
  - cleanup (intervals/subscriptions released)

### Cross-layer (default required)
- Any feature that touches backend interaction (query/mutation/errors/cache/timers/concurrency) must add `packages/test-integration` tests covering all necessary scenarios.

## Reference

For the full written guide, see `docs/testing.md`.

