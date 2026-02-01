# 前端开发规范 (Frontend Development Standards)

本文档用于统一 Seagull 项目的前端开发规范，目标是保证业务逻辑可维护、UI 逻辑清晰、页面可拆分、复用优先。规范与后端标准保持一致的分层思想。

## 1. 分层职责 (Business vs UI)

### 1.1 业务层结构 (apps/expo/src/business)
- **所有业务逻辑必须放在 `apps/expo/src/business` 下**，按业务模块划分：
  - `business/trip`
  - `business/wishlist`
  - 未来新增模块继续平铺扩展
- 每个业务模块下按功能域拆分子目录，例如：
  - `business/trip/edit-lock`
  - `business/trip/trip-item`
  - `business/trip/trip-day`
- 子目录中常见文件：
  - `hooks.ts`：业务逻辑、数据获取、Mutation、业务方法
  - `effect.ts`：仅副作用同步（锁续期、订阅、store 同步等），不暴露 UI 直接使用
  - `store.ts`：Zustand 本地共享状态（仅跨组件共享）
  - `types.ts`：业务类型定义
  - `utils.ts`：纯函数工具
- **业务层禁止出现 UI 细节**：如 className、布局、组件结构。

### 1.2 页面 UI 层 (page component)
- 只包含 UI 逻辑：
  - 展示结构、组件组合
  - 按钮/输入的 disabled、显示逻辑
  - 纯视图状态（如弹窗开关、动画状态）
- UI 层优先从 `useXxxBusiness()` 获取状态与方法，不直接调用 API。
- 需要获取本地共享状态时，**UI 组件允许直接读取 store**，但必须使用 selector 形式：
  - ✅ `const canEdit = useTripEditStore((state) => state.canEdit)`
  - ❌ `const { canEdit } = useTripEditStore()`

### 1.3 业务 Hook 契约
- **Hook 只负责业务状态与业务方法**：返回值要可读、稳定（命名清晰）。
- **UI 事件 → 业务方法**：UI 不拼装 payload、不写校验，调用业务方法即可。
- **派生数据统一在 Hook 内计算**（如筛选、排序、Set 关系、是否可编辑）。
- **副作用统一在 effect hook 内处理**（如锁续期、订阅、导航跳转、store 同步）。
- **副作用 Hook 必须放在 `effect.ts`**，并且只能在页面级聚合 hook 中调用，避免被多个组件重复执行。
- **业务聚合 hook 负责集中挂载所有副作用**（如 `useTripEditBusiness`）。
- **业务聚合 hook 必须只被调用一次**，避免副作用重复触发。
- **Store 可以暴露给 UI 读取**，但只允许 selector 读取，且不能在 UI 内触发副作用。

## 2. 组件复用优先级

当逻辑重复出现时必须立即抽象：
- **页面级复用**：在 `app/(tabs)/trips/_components`（或页面目录内）抽成 UI 组件。
- **模块级复用**：放在 `features/trip`（未来迁移）或 `app/(tabs)/trips/_components`。
- **全局复用**：放在 `apps/expo/src/components` 或 `apps/expo/src/shared`。

判断标准：
- 相同 UI/行为出现 2 次以上必须抽象。
- 相同数据逻辑出现 2 次以上必须抽象成 hook/utility。

### 2.1 列表与空态规范
- 列表页必须考虑 **空列表** 下的 header/footer/空态展示。
- 大型列表建议使用 `ListEmptyComponent` 容器统一渲染 header + footer，避免空态丢失。

## 2.2 样式与 UI 工具规范
- **样式统一使用 TailwindCSS + NativeWind**：
  - 使用 `className` 作为主要样式入口，避免内联 style 做布局（布局可用 className）。
  - **仅在需要动态 style 对象时使用 style**（如 MapView region、动画数值）。
- **className 拼接必须使用 `clsx`**：
  - ✅ `className={clsx("text-sm", isActive && "text-primary")}`
  - ❌ `className={["text-sm", isActive && "text-primary"].join(" ")}`
- **颜色与间距统一使用设计 Token**：
  - 颜色使用 `text-foreground / text-muted-foreground / bg-primary / border-border` 等语义类名。
  - 禁止在 UI 组件中随意硬编码色值（除非是临时占位或特定品牌色）。
- **Icon 与尺寸**：
  - 同一页面内使用一致的 icon 大小与颜色变量，避免魔法数字散落。
- **Shadow 与圆角**：
  - 使用统一的 `rounded-*` 与 `shadow-*` 规范，避免每个组件随意变化。

## 3. 代码结构与拆分要求

### 3.1 超过 500 行必须拆分
- 任何单文件超过 500 行必须拆分。
- 拆分方式：
  - **业务模块**：拆到 `apps/expo/src/business/<module>/<feature>/hooks.ts`。
  - **UI 模块**：拆分成 `components/` 下的子组件。
  - **功能域拆分**：按「头部」「列表」「操作区」「弹窗」等模块拆。

### 3.2 业务逻辑聚合
- 业务逻辑集中到 business hook 内。
- UI 组件只消费 props，不包含数据获取逻辑。

### 3.3 UI 组件纯度
- UI 组件不得 import `trpc`、`queryClient`、`authClient`。
- UI 组件不得包含 `useQuery/useMutation`。
- UI 组件允许存在 `useState`（仅用于视图状态）。

## 4. 复用与去重要求

**时刻留意逻辑是否可复用**：
- 页面级 → 页面组件 / 页面 hooks。
- 模块级 → feature hooks / components。
- App 级 → shared utils / shared hooks。

出现重复必须立即封装，即使成本较高。

## 5. 命名规范

| 类型      | 规则                     | 示例                   |
| --------- | ------------------------ | ---------------------- |
| 业务 hook | `useXxxBusiness`         | `useTripEditBusiness`  |
| UI 组件   | PascalCase               | `TripEditorHeader`     |
| 辅助方法  | camelCase                | `formatRange`          |
| 业务文件  | `hooks.ts / store.ts` 等 | `hooks.ts`, `store.ts` |

## 6. 错误与状态管理

- **业务层统一处理错误**，UI 只展示 `errorMessage`。
- 禁止在 UI 中散落 `try/catch` 或 `toast` 逻辑。
- 对业务失败要提供明确业务错误提示，而非 500 或默认错误。

## 7. trips 模块落地示例

- `business/trip/edit-lock/hooks.ts`
- `business/trip/edit-lock/effect.ts`
- `business/trip/trip-item/hooks.ts`
- `business/trip/trip-day/hooks.ts`
- `business/trip/plan/hooks.ts`
- UI 页面只通过 hooks 聚合业务逻辑，禁止直接访问 store。
- UI 组件如果直接读取 store，必须使用 selector，且不得包含副作用。

## 8. 提交前检查

- 页面是否仅包含 UI 逻辑？
- 是否有重复逻辑未抽象？
- 是否有单文件超过 500 行？
- 是否有业务逻辑混进组件？

---

此文档与 `docs/backend-standards.md` 保持一致的“分层 + 职责单一”原则。
