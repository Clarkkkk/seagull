---
name: frontend-standards
description: Use when implementing or refactoring frontend UI and business logic in apps/expo. Enforce business/UI layering, feature-based business folders, effect hooks, store usage rules, and Tailwind/NativeWind + clsx styling conventions.
---

# Frontend Standards (Seagull)

## When to use
- Building or refactoring React Native screens/components in `apps/expo`.
- Moving logic into `apps/expo/src/business` modules.
- Deciding where logic/state/style belongs (business vs UI).

## Core rules
- **Business logic lives in `apps/expo/src/business/<module>/<feature>`**.
  - Files: `hooks.ts`, `effect.ts` (side effects only), `store.ts` (Zustand shared state), `types.ts`, `utils.ts`.
  - Business modules must not contain UI details (className/layout/components).
- **UI layer is pure**: no `trpc`, `queryClient`, `authClient`, `useQuery/useMutation`.
- **Hook contract**:
  - UI events call business methods; UI does not assemble payloads.
  - Derived data computed in hooks.
  - Side effects only in `effect.ts`, mounted once by page-level aggregate hook.
- **Store access**: UI may read store via selector only. No side effects in UI.
- **Styling**: TailwindCSS + NativeWind with `className`.
  - `className` composition must use `clsx`.
  - Use semantic tokens (`text-foreground`, `bg-primary`, `border-border`), avoid hardcoded colors.

## Refactoring checklist
- Page contains only UI logic and view state.
- Repeated logic extracted to business hooks/utils/components.
- Files > 500 lines are split by feature.
- Lists handle empty states.

## Canonical reference
- See `skills/frontend-standards/references/frontend-standards.md` for the full policy text and examples.
