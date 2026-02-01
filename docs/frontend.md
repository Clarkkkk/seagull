# Seagull - 旅行规划应用前端技术方案

## 1. 项目背景与需求概述

Seagull 是一款面向旅行爱好者的全流程旅行规划与记录应用，基于 **Expo + React Native** 实现，优先支持 iOS 和 Android 移动端。应用旨在提供从旅行灵感收集、行程规划、旅途中导航指引到旅行后记忆保存的完整体验。

### 1.1 核心功能需求

根据产品规划，应用将分三个阶段实现功能：

1. **行程前 · 精心规划**
   - 灵感收集系统（多渠道录入、智能解析、分层管理）
   - 核心行程规划（规划向导、约束设定、智能路线生成、动态调整）
   - 协同与准备工具（协同编辑、分享功能、资料库、行李清单、天气预报）

2. **行程中 · 沉浸体验**
   - 今日行程仪表盘（聚焦当前、全天概览）
   - 主动提醒与实时活动（锁屏提醒、地理围栏提醒）
   - 动态应变系统（实时天气、一键优化路线）
   - 核心保障与记录（离线访问、一键打卡）

3. **行程后 · 回味与分享**
   - 智能游记生成（一键生成、多格式分享）
   - 情感化回忆唤醒（纪念日提醒、旅行足迹）
   - 社区生态循环（行程模板化、模板共享）

### 1.2 前端技术挑战

1. **复杂交互设计**：行程规划需要地图拖拽、时间轴调整等复杂交互
2. **离线功能**：确保核心功能在无网络环境下可用
3. **性能优化**：地图渲染、大量POI处理等场景的性能优化
4. **跨平台一致性**：确保在不同设备上提供一致的用户体验
5. **原生集成**：地理围栏、锁屏活动等需要深度集成原生功能
6. **数据同步**：处理多设备、多用户间的数据同步与冲突解决
7. **Expo 生态集成**：充分利用 Expo SDK 的能力，避免手动原生配置

## 2. 技术选型

### 2.1 核心技术栈

- **开发框架**：Expo SDK 54 + React Native 0.81
- **编程语言**：TypeScript 5.x
- **API通信**：tRPC + React Query (TanStack Query)
- **状态管理**：Zustand (全局状态) + React Hook Form (表单状态)
- **本地存储**：Expo SQLite + Drizzle ORM + MMKV (react-native-mmkv)
- **路由导航**：Expo Router (基于 React Navigation)
- **国际化**：i18next + react-i18next + expo-localization
- **UI 框架**：NativeWind (Tailwind CSS for RN)
- **地图服务**：react-native-maps (Google/Apple Maps)
- **图片处理**：expo-image (原生性能) + expo-image-picker
- **动画效果**：Reanimated 4 + React Native Gesture Handler
- **认证系统**：Better Auth + expo-secure-store

### 2.2 选型理由

1. **Expo + React Native**：
   - 成熟的跨平台框架，JavaScript/TypeScript 生态强大
   - Expo SDK 提供开箱即用的原生功能，无需手动配置
   - EAS (Expo Application Services) 简化构建、部署和 OTA 更新
   - 活跃的社区和丰富的第三方库
   - 热重载和快速迭代开发体验
   - Expo Go 支持快速预览，development builds 支持自定义原生代码

2. **Zustand**：
   - 极简 API，学习成本低，仅 ~1KB gzip
   - 无需 Context Provider 包裹，避免不必要的重渲染
   - TypeScript 支持优秀，类型推断强大
   - 中间件支持（persist、immer、devtools）
   - 可与 React Query 完美配合处理服务端状态
   - 测试友好，不依赖 React 上下文

3. **tRPC + React Query**：
   - 端到端类型安全，前后端共享 TypeScript 类型
   - 无需手写 API 客户端代码，自动补全和类型检查
   - React Query 提供强大的缓存、重试、乐观更新能力
   - 支持实时订阅（WebSocket），适合协同编辑
   - 与 Monorepo 架构完美配合（create-t3-turbo）
   - 比 REST 更简洁，比 GraphQL 更轻量

4. **Expo SQLite + Drizzle ORM**：
   - 强大的关系型数据库，支持复杂查询和事务
   - Drizzle 提供类型安全的查询构建器
   - 与后端 PostgreSQL 共享相同的 ORM，降低学习成本
   - 支持迁移管理，数据库版本控制
   - 适合离线优先架构，与 WatermelonDB 可选配合

5. **Expo Router**：
   - 基于文件系统的路由，类似 Next.js
   - TypeScript 类型安全路由和参数
   - 自动深度链接和通用链接配置
   - 支持 Layouts、嵌套路由、模态窗口
   - SEO 友好（Web 支持）

6. **react-native-maps**：
   - 跨平台统一 API，底层使用 Google Maps (Android) 和 Apple Maps (iOS)
   - 成熟稳定，社区支持强
   - 支持自定义标记、路线绘制、聚类
   - 与 Expo 完美集成，通过 Config Plugin 自动配置
   - **⚠️ 中国大陆用户预案**：
     - **Android**：Google Maps 在中国大陆无法使用（需要 GMS），考虑检测到中国用户时展示静态图片或跳转外部地图 App（高德/百度）
     - **iOS**：Apple Maps 在国内使用高德数据，体验尚可，但需注意坐标偏移问题（WGS-84 vs GCJ-02）
     - 建议在 `utils` 中集成 `gcoord` 库处理坐标转换

7. **i18next**：
   - React Native 最流行的国际化方案
   - 功能强大：命名空间、插值、复数、上下文
   - expo-localization 提供系统语言检测
   - 支持懒加载和异步语言包
   - 完善的 TypeScript 类型支持

## 3. 架构设计

### 3.1 整体架构

采用 **特性分片架构** (Feature-Sliced Design) + **清晰分层**：

```
Expo App
   │
   ├── app/              (路由层 - Expo Router)
   │    ├── (tabs)/      (底部 Tab 导航)
   │    ├── trip/        (行程相关路由)
   │    └── _layout.tsx  (根布局)
   │
   ├── features/       (特性模块)
   │    ├── trip/        (行程管理)
   │    ├── map/         (地图功能)
   │    └── auth/        (认证)
   │
   ├── shared/         (共享资源)
   │    ├── components/  (UI 组件)
   │    ├── hooks/       (自定义 Hooks)
   │    ├── utils/       (工具函数)
   │    └── stores/      (Zustand Stores)
   │
   └── api/            (tRPC 客户端)

分层逻辑：
UI 层 (app/ + features/*/ui)
      ↑↓
状态层 (Zustand Stores + React Query)
      ↑↓
数据层 (tRPC Client + Local DB)
      ↑↓
存储/网络 (Expo SQLite + AsyncStorage + tRPC Backend)
```

### 3.2 详细分层

1. **路由层 (app/)**
   - Expo Router 文件系统路由
   - 页面级组件，负责布局和数据获取
   - Layouts 定义公共结构（Header、Tab Bar）

2. **特性层 (features/)**
   - 按业务功能组织代码
   - 每个 feature 包含：
     - `ui/` - UI 组件
     - `hooks/` - 业务逻辑 Hooks
     - `stores/` - 特性独有状态
     - `types/` - TypeScript 类型定义
     - `utils/` - 特性工具函数

3. **共享层 (shared/)**
   - `components/` - 通用 UI 组件（Button、Card）
   - `hooks/` - 通用业务 Hooks
   - `stores/` - 全局 Zustand Stores
   - `utils/` - 工具函数库
   - `constants/` - 常量定义
   - `types/` - 全局类型

4. **API 层 (api/)**
   - tRPC 客户端配置
   - React Query 配置和 Hooks
   - API 类型定义（从后端导入）

5. **数据层 (db/)**
   - Drizzle ORM Schema
   - 数据库迁移脚本
   - 本地数据访问封装

### 3.3 关键技术模块

1. **离线功能模块**
   - 数据同步引擎：增量同步 + 冲突解决
   - React Query 持久化缓存层
   - Expo SQLite 本地数据库
   - expo-network 网络状态监听
   - expo-background-fetch 后台同步

2. **地图交互模块**
   - react-native-maps 自定义 Marker 和 Polyline
   - React Native Gesture Handler 手势处理
   - Reanimated 平滑动画和过渡
   - react-native-maps-super-cluster POI 聚类
   - expo-location 地理围栏和位置追踪

3. **协同编辑模块**
   - tRPC Subscriptions (WebSocket)
   - 乐观更新 (React Query Optimistic Updates)
   - CRDT 算法或 OT (Operational Transformation)
   - 冲突解决策略：Last-Write-Wins 或合并策略
   - 实时状态同步和冲突提示

4. **多媒体处理模块**
   - expo-image-picker 图片/视频选择
   - expo-image-manipulator 图片压缩和裁剪
   - expo-media-library 照片库访问
   - expo-av 视频播放和录制
   - expo-file-system 文件管理和缓存

5. **原生功能模块**
   - expo-notifications 本地和远程通知
     - **⚠️ 中国大陆限制**：Android 上 expo-notifications 强依赖 FCM (Firebase Cloud Messaging)，在中国大陆不可用
     - **替代方案**：
       - 使用 WebSocket 长连接实现"应用内通知"（App 在前台时弹出）
       - 放弃离线推送，或利用系统日历提醒作为替代
       - 如需完整推送功能，需接入极光/个推（需要原生代码和备案）
   - expo-live-activities iOS 锁屏实时活动
   - expo-task-manager 后台任务
   - expo-calendar 系统日历集成
   - expo-local-authentication 生物识别

## 4. UI/UX 设计系统

### 4.1 设计语言

采用 **NativeWind** (Tailwind CSS for React Native) 实现现代化设计系统，符合 Material Design 3 和 iOS HIG：

1. **核心设计原则**
   - 简洁直观：减少认知负担
   - 层次清晰：信息架构合理
   - 一致性：跨平台体验一致
   - 响应式：适应不同屏幕尺寸
   - 可访问性：适配屏幕阅读器和辅助功能

2. **视觉设计规范（基于 NativeWind）**
   - **色彩系统**：Tailwind 调色板 + 自定义主题
     ```js
     // tailwind.config.js
     colors: {
       primary: { ... },
       secondary: { ... },
       success/warning/error: { ... }
     }
     ```
   - **排版系统**：Tailwind 字体大小 (text-sm/base/lg/xl...)
   - **间距系统**：4px 基础网格 (p-2/4/6/8, m-2/4/6/8)
   - **圆角系统**：rounded-none/sm/md/lg/xl/full
   - **阴影系统**：shadow-sm/md/lg/xl
   - **深色模式**：dark: 前缀自动支持

### 4.2 组件库设计

1. **基础组件 (shared/components/ui)**
   ```tsx
   // 使用 NativeWind 样式
   <Button className="bg-primary-500 px-6 py-3 rounded-lg" />
   <Input className="border border-gray-300 rounded-md p-3" />
   <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md" />
   ```
   - **Button**: Primary/Secondary/Outline/Ghost 变体
   - **Input/TextArea**: 表单输入组件
   - **Select/Picker**: 选择器（iOS/Android 原生样式）
   - **Switch/Checkbox/Radio**: 开关和选项
   - **Modal/BottomSheet**: 弹窗和底部抽屉
   - **Toast/Alert**: 轻提示和警告

2. **业务组件 (features/*/ui)**
   - **TripCard**: 行程卡片（封面图 + 标题 + 日期）
   - **POICard**: 地点卡片（图片 + 名称 + 评分 + 距离）
   - **Timeline**: 行程时间轴（可拖拽）
   - **PackingList**: 行李清单（复选框 + 分类）
   - **WeatherCard**: 天气卡片（图标 + 温度 + 降水）
   - **MapMarker**: 自定义地图标记

3. **交互模式**
   - **拖拽排序**: react-native-draggable-flatlist
   - **手势操作**: React Native Gesture Handler
     - 滑动删除 (Swipeable)
     - 长按编辑 (LongPress)
     - 双击放大 (DoubleTap)
   - **动画**: Reanimated 共享元素过渡
   - **反馈**: ActivityIndicator + 动画 Toast

### 4.3 适配策略

1. **响应式布局**
   ```tsx
   import { useWindowDimensions } from 'react-native';
   
   // NativeWind 断点
   <View className="w-full sm:w-1/2 lg:w-1/3" />
   
   // 安全区域
   import { SafeAreaView } from 'react-native-safe-area-context';
   <SafeAreaView edges={['top', 'bottom']} />
   ```
   - Flexbox 弹性布局（flex-1, flex-row, justify-center）
   - NativeWind 断点：sm/md/lg/xl
   - 安全区域自动适配刘海屏/岛屏

2. **平台适配**
   ```tsx
   import { Platform } from 'react-native';
   
   // 条件渲染
   {Platform.OS === 'ios' ? <IOSComponent /> : <AndroidComponent />}
   
   // 样式适配
   <View className={`p-4 ${Platform.OS === 'ios' ? 'shadow-lg' : 'elevation-4'}`} />
   ```
   - iOS: Cupertino 风格组件
   - Android: Material Design 组件
   - 深色模式: useColorScheme() + dark: 前缀

## 5. 前端模块划分

### 5.1 核心功能模块 (features/)

1. **features/auth** - 用户认证
   - Better Auth 集成
   - 登录/注册/忘记密码
   - 生物识别登录 (Face ID/Touch ID)
   - 用户信息管理
   - 设置与偏好

2. **features/inspiration** - 灵感收集
   - 收件箱（快速录入）
   - 目的地分类
   - 智能解析（链接/地址）
   - 系统分享接收 (expo-sharing)

3. **features/trip** - 行程管理
   - 行程创建向导
   - 智能路线生成
   - 时间轴编辑（拖拽排序）
   - 协同编辑 (tRPC Subscriptions)
   - 行程分享（链接/图片）

4. **features/map** - 地图功能
   - react-native-maps 集成
   - POI 搜索和显示
   - 路线规划和绘制
   - 聚类算法 (Supercluster)
   - 地理围栏 (expo-location)
   - 离线地图缓存
   - **中国大陆地图服务适配**：
     - 用户地区检测（基于 IP 或设备语言）
     - Android：检测到中国用户时展示静态地图或跳转高德/百度地图
     - 坐标系转换工具（WGS-84 ↔ GCJ-02，使用 `gcoord` 库）
     - iOS：Apple Maps 使用高德数据，需处理坐标偏移

5. **features/resources** - 资料库
   - 笔记管理（Markdown 编辑器）
   - 文件上传/下载
   - 照片管理 (expo-media-library)
   - 关联到行程点

6. **features/assistant** - 行程助手
   - 行李清单（模板 + 自定义）
   - 天气预报集成
   - 提醒服务 (expo-notifications)
   - 日历同步 (expo-calendar)

7. **features/community** - 社区
   - 模板浏览和搜索
   - 模板分享（去隐私）
   - 评分与评论
   - 关注和收藏

8. **features/memory** - 旅行回忆
   - 智能游记生成
   - 照片/视频管理
   - 旅行足迹地图
   - 多格式导出（PDF/长图/视频）
   - 纪念日提醒

### 5.2 页面路由结构 (Expo Router)

```
app/
├── _layout.tsx              # 根布局（认证检查）
├── index.tsx                # 首页重定向
│
├── (auth)/                  # 认证组
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
│
├── (tabs)/                  # 主应用 Tab 导航
│   ├── _layout.tsx          # Tab 配置
│   ├── index.tsx            # 首页/今日行程
│   ├── trips.tsx            # 行程列表
│   ├── map.tsx              # 地图
│   ├── community.tsx        # 社区
│   └── profile.tsx          # 个人中心
│
├── trip/                    # 行程相关路由
│   ├── [id].tsx             # 行程详情
│   ├── [id]/edit.tsx        # 编辑行程
│   ├── create.tsx           # 创建行程
│   └── share/[id].tsx       # 分享页面
│
├── inspiration/             # 灵感收集
│   ├── inbox.tsx
│   ├── destinations.tsx
│   └── [id].tsx             # 灵感详情
│
├── resources/               # 资料库
│   ├── notes/
│   ├── documents/
│   └── checklists/
│
├── memory/                  # 旅行回忆
│   ├── index.tsx            # 回忆列表
│   ├── [id].tsx             # 游记详情
│   └── create/[tripId].tsx  # 生成游记
│
└── +not-found.tsx           # 404 页面

# 深度链接示例
seagull://trip/123
seagull://trip/123/edit
seagull://trip/share/456
```

## 6. tRPC 与 React Query 实现

### 6.1 tRPC 架构设计

**Monorepo 结构** (create-t3-turbo)
```
packages/
  ├── api/                   # tRPC 后端
  │   ├── src/
  │   │   ├── root.ts        # 根 Router
  │   │   └── router/        # 分模块 Router
  │   │       ├── auth.ts    # 认证
  │   │       ├── trip.ts    # 行程
  │   │       ├── poi.ts     # 地点
  │   │       └── sync.ts    # 同步
  │   └── index.ts           # 导出 AppRouter 类型
  │
  └── db/                    # Drizzle ORM Schema
      ├── schema/
      │   ├── user.ts
      │   ├── trip.ts
      │   └── poi.ts
      └── index.ts

apps/expo/
  ├── api/                   # tRPC 客户端
  │   ├── provider.tsx       # React Query Provider
  │   └── trpc.tsx           # tRPC Hooks
  └── app/                   # 路由页面
```

**类型安全流**
```
后端 Router 定义
      ↓
自动推导类型 (AppRouter)
      ↓
前端 tRPC Client (完整类型提示)
      ↓
React Query Hooks (自动缓存/重试)
```

### 6.2 tRPC 客户端设置

**1. Provider 配置** (`api/provider.tsx`)
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@acme/api';

export const api = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,  // 5分钟
          retry: 2,
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: process.env.EXPO_PUBLIC_API_URL + '/api/trpc',
          transformer: superjson,
          headers: async () => {
            const token = await getAuthToken();
            return { authorization: token ? `Bearer ${token}` : '' };
          },
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}
```

**2. 使用示例**
```tsx
// 查询行程列表
const { data: trips, isLoading } = api.trip.list.useQuery();

// 创建行程
const createTrip = api.trip.create.useMutation({
  onSuccess: () => {
    // 自动失效列表缓存
    api.useUtils().trip.list.invalidate();
  },
});

// 订阅实时更新
api.trip.onUpdate.useSubscription(
  { tripId: '123' },
  { onData: (data) => console.log(data) }
);
```

### 6.3 React Query 集成与优化

**1. 缓存策略**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 缓存策略
      staleTime: 5 * 60 * 1000,        // 5分钟内视为新鲜
      cacheTime: 10 * 60 * 1000,       // 10分钟后回收
      
      // 重试策略
      retry: (failureCount, error) => {
        if (error.data?.code === 'UNAUTHORIZED') return false;
        return failureCount < 3;
      },
      
      // 离线支持
      networkMode: 'offlineFirst',
      
      // 自动重新验证
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});
```

**2. 乐观更新**
```tsx
const updateTrip = api.trip.update.useMutation({
  onMutate: async (newData) => {
    // 取消正在进行的查询
    await api.useUtils().trip.get.cancel({ id: newData.id });
    
    // 保存快照
    const previous = api.useUtils().trip.get.getData({ id: newData.id });
    
    // 乐观更新
    api.useUtils().trip.get.setData({ id: newData.id }, newData);
    
    return { previous };
  },
  
  onError: (err, newData, context) => {
    // 回滚
    api.useUtils().trip.get.setData(
      { id: newData.id },
      context?.previous
    );
  },
  
  onSettled: (data, error, variables) => {
    // 重新验证
    api.useUtils().trip.get.invalidate({ id: variables.id });
  },
});
```

**3. 持久化缓存**
```tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { MMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const storage = new MMKV();

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  throttleTime: 1000,
});

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister }}
>
  <App />
</PersistQueryClientProvider>
```

### 6.4 tRPC 错误处理

**1. 错误类型分类**
```tsx
import { TRPCClientError } from '@trpc/client';

// tRPC 错误码 (HTTP 状态码)
type ErrorCode =
  | 'BAD_REQUEST'           // 400
  | 'UNAUTHORIZED'          // 401
  | 'FORBIDDEN'             // 403
  | 'NOT_FOUND'             // 404
  | 'CONFLICT'              // 409
  | 'INTERNAL_SERVER_ERROR' // 500
  | 'TIMEOUT';              // 408
```

**2. 错误处理 Hook**
```tsx
export function useErrorHandler() {
  const showToast = useToast();
  
  return useCallback((error: unknown) => {
    if (error instanceof TRPCClientError) {
      const code = error.data?.code;
      
      switch (code) {
        case 'UNAUTHORIZED':
          // 自动跳转登录
          router.push('/auth/login');
          break;
          
        case 'NOT_FOUND':
          showToast({ type: 'error', message: '资源不存在' });
          break;
          
        case 'CONFLICT':
          showToast({ type: 'warning', message: '数据冲突，请刷新后重试' });
          break;
          
        default:
          showToast({ type: 'error', message: error.message });
      }
    } else {
      // 网络错误
      showToast({ type: 'error', message: '网络连接失败' });
    }
  }, [showToast]);
}
```

**3. 全局错误边界**
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-xl font-bold mb-4">出错了</Text>
      <Text className="text-gray-600 mb-4">{error.message}</Text>
      <Button onPress={resetErrorBoundary}>重试</Button>
    </View>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```
**4. 自动重试和回退**
```tsx
const { data, error } = api.trip.get.useQuery(
  { id: tripId },
  {
    retry: (failureCount, error) => {
      // UNAUTHORIZED 不重试
      if (error.data?.code === 'UNAUTHORIZED') return false;
      // 最多重试 3 次
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => 
      Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
  }
);
```

**5. 网络状态监控**
```tsx
import * as Network from 'expo-network';
import { useOnlineManager } from '@tanstack/react-query';

export function useNetworkStatus() {
  const onlineManager = useOnlineManager();
  
  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      onlineManager.setOnline(state.isConnected ?? false);
    };
    
    const subscription = Network.addNetworkStateListener(checkNetwork);
    return () => subscription.remove();
  }, [onlineManager]);
}
```

### 6.5 tRPC Subscriptions 实时通信

**1. WebSocket 订阅设置**
```tsx
// 后端 Router
export const tripRouter = router({
  onUpdate: publicProcedure
    .input(z.object({ tripId: z.string() }))
    .subscription(({ input }) => {
      return observable<TripUpdate>((emit) => {
        // 监听数据库变化
        const unsubscribe = db.trip.subscribe(
          input.tripId,
          (data) => emit.next(data)
        );
        return unsubscribe;
      });
    }),
});

// 前端订阅
api.trip.onUpdate.useSubscription(
  { tripId },
  {
    onData: (data) => {
      // 更新本地缓存
      queryClient.setQueryData(['trip', tripId], data);
    },
    onError: (err) => console.error(err),
  }
);
```

**2. 协同编辑实现**
```tsx
export function CollaborativeEditor({ tripId }: { tripId: string }) {
  const [localChanges, setLocalChanges] = useState<Change[]>([]);
  
  // 订阅其他用户的更新
  api.trip.onCollabUpdate.useSubscription(
    { tripId },
    {
      enabled: true,
      onData: (update) => {
        // 应用远程变化
        applyRemoteChange(update);
      },
    }
  );
  
  // 发送本地更新
  const sendUpdate = api.trip.sendUpdate.useMutation();
  
  const handleChange = (change: Change) => {
    setLocalChanges((prev) => [...prev, change]);
    sendUpdate.mutate({ tripId, change });
  };
  
  return <Editor onChange={handleChange} />;
}
```

**3. 自动重连机制**
```tsx
import { wsLink } from '@trpc/client';
import { createWSClient } from '@trpc/client/links/wsClient';

const wsClient = createWSClient({
  url: 'ws://localhost:3000/trpc',
  onClose: () => console.log('断开连接'),
  onOpen: () => console.log('已连接'),
  // 自动重连
  retryDelayMs: (attemptIndex) => 
    Math.min(1000 * 2 ** attemptIndex, 10000),
});

const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    wsLink({ client: wsClient }),
    // 回退到 HTTP
    httpBatchLink({ url: 'http://localhost:3000/trpc' }),
  ],
});
```

## 7. 状态管理策略 (Zustand)

### 7.1 状态分类

**1. 服务端状态** (由 React Query 管理)
   - API 数据缓存
   - 加载/错误状态
   - 乐观更新
   - 后后台同步

**2. 客户端状态** (由 Zustand 管理)
   - **UI 状态**: 临时视图状态、模态窗口、动画
   - **应用状态**: 认证信息、全局配置、主题模式
   - **业务状态**: 草稿数据、离线队列、编辑器状态

**3. 组件局部状态** (由 useState/useReducer 管理)
   - 表单输入
   - 动画进度
   - 临时 UI 状态

### 7.2 Zustand Store 设计

**1. 基础 Store 结构**
```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { immer } from 'zustand/middleware/immer';

// 创建 MMKV 实例
const storage = new MMKV();

// Zustand MMKV 存储适配器
const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

// 认证 Store
interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
      storage: mmkvStorage,
    }
  )
);
```

**2. Immer 中间件（复杂状态）**
```tsx
import { immer } from 'zustand/middleware/immer';

interface TripEditorState {
  draft: Trip | null;
  history: Trip[];
  historyIndex: number;
  updateDay: (dayIndex: number, day: Partial<Day>) => void;
  undo: () => void;
  redo: () => void;
}

export const useTripEditorStore = create<TripEditorState>()(  immer((set) => ({
    draft: null,
    history: [],
    historyIndex: -1,
    
    updateDay: (dayIndex, day) =>
      set((state) => {
        // Immer 允许直接修改
        if (state.draft) {
          state.draft.days[dayIndex] = {
            ...state.draft.days[dayIndex],
            ...day,
          };
          // 保存历史
          state.history.push(state.draft);
          state.historyIndex++;
        }
      }),
    
    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.draft = state.history[state.historyIndex];
        }
      }),
    
    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.draft = state.history[state.historyIndex];
        }
      }),
  }))
);
```

**3. Devtools 中间件**
```tsx
import { devtools } from 'zustand/middleware';

export const useAppStore = create<AppState>()(  devtools(
    persist(
      (set) => ({
        // state
      }),
      { name: 'app-storage' }
    ),
    { name: 'AppStore' }
  )
);
```

**4. Slice Pattern（拆分大型 Store）**
```tsx
// slices/tripSlice.ts
export const createTripSlice: StateCreator<AppState, [], [], TripSlice> = (
  set
) => ({
  trips: [],
  addTrip: (trip) => set((state) => ({ trips: [...state.trips, trip] })),
});

// slices/mapSlice.ts
export const createMapSlice: StateCreator<AppState, [], [], MapSlice> = (
  set
) => ({
  region: null,
  markers: [],
  setRegion: (region) => set({ region }),
});

// store.ts
export const useAppStore = create<AppState>()((...a) => ({
  ...createTripSlice(...a),
  ...createMapSlice(...a),
}));
```

## 8. 数据管理

### 8.1 本地存储策略

**存储方案选型**
| 场景           | 方案                      | 特点                                             |
| -------------- | ------------------------- | ------------------------------------------------ |
| **结构化数据** | Expo SQLite + Drizzle ORM | 关系型、事务、复杂查询                           |
| **键值存储**   | MMKV (react-native-mmkv)  | 同步存储、比 AsyncStorage 快 30 倍、避免状态闪烁 |
| **安全数据**   | expo-secure-store         | Token、密码等敏感信息                            |
| **文件存储**   | expo-file-system          | 图片、视频、离线地图缓存                         |
| **照片库**     | expo-media-library        | 用户相册访问                                     |

**为什么选择 MMKV 而非 AsyncStorage：**
- **性能优势**：MMKV 是同步存储，读写速度比 AsyncStorage 快 30 倍
- **避免状态闪烁**：在 Zustand 中使用异步存储（AsyncStorage）会导致应用启动时出现"状态闪烁"（先显示初始值，几百毫秒后才恢复缓存值）。MMKV 是同步的，App 启动渲染第一帧时状态就已经恢复，用户体验更好
- **Expo 社区推荐**：Expo 社区现在基本都推荐使用 MMKV 替代 AsyncStorage
- **更好的 TypeScript 支持**：MMKV 提供了完善的类型定义

### 8.2 Expo SQLite + Drizzle ORM

**1. Schema 定义**
```tsx
// db/schema/trip.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  syncStatus: text('sync_status').$type<'synced' | 'pending' | 'conflict'>(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // 软删除标记
});

export const days = sqliteTable('days', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  pois: text('pois', { mode: 'json' }).$type<POI[]>(),
});
```

**2. 数据库初始化**
```tsx
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations';

const expoDb = openDatabaseSync('seagull.db');
export const db = drizzle(expoDb);

// 在 App 启动时运行迁移
export function useDatabaseMigrations() {
  const { success, error } = useMigrations(db, migrations);
  
  if (error) {
    console.error('数据库迁移失败:', error);
  }
  
  return { success, error };
}
```

**3. CRUD 操作**
```tsx
import { eq } from 'drizzle-orm';

// 查询所有行程
export async function getAllTrips() {
  return await db.select().from(trips);
}

// 查询单个行程及其天数
export async function getTripWithDays(tripId: string) {
  const trip = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .get();
  
  const tripDays = await db
    .select()
    .from(days)
    .where(eq(days.tripId, tripId));
  
  return { ...trip, days: tripDays };
}

// 创建行程
export async function createTrip(data: NewTrip) {
  return await db.insert(trips).values({
    ...data,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  });
}

// 更新行程
export async function updateTrip(id: string, data: Partial<Trip>) {
  return await db
    .update(trips)
    .set({ ...data, updatedAt: new Date(), syncStatus: 'pending' })
    .where(eq(trips.id, id));
}
```

**4. 离线同步策略（含软删除机制）**

**为什么需要软删除？**
- 问题：用户在离线时删除了一个行程，如果直接从 SQLite 删除（`DELETE FROM trips WHERE id=1`），同步时服务器不知道要删除它
- 解决：引入软删除（Soft Delete）机制，标记 `deleted_at` 而不是物理删除，同步完成后再清理

```tsx
import { useEffect } from 'react';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { isNull, isNotNull } from 'drizzle-orm';

const SYNC_TASK = 'background-sync';

// 后台同步任务
TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    // 1. 获取所有待同步的数据（包括新增、修改、软删除）
    const pendingTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.syncStatus, 'pending'));
    
    // 2. 同步到服务器
    for (const trip of pendingTrips) {
      if (trip.deletedAt) {
        // 软删除的数据：通知服务器删除
        await api.trip.delete.mutate({ id: trip.id });
        // 同步成功后，物理删除本地数据
        await db.delete(trips).where(eq(trips.id, trip.id));
      } else {
        // 新增或修改的数据
        await api.trip.sync.mutate(trip);
        await db
          .update(trips)
          .set({ syncStatus: 'synced' })
          .where(eq(trips.id, trip.id));
      }
    }
    
    // 3. 清理已同步的软删除数据（超过30天）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db
      .delete(trips)
      .where(
        and(
          eq(trips.syncStatus, 'synced'),
          isNotNull(trips.deletedAt),
          lt(trips.deletedAt, thirtyDaysAgo)
        )
      );
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('同步失败', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 软删除函数（替代直接删除）
export async function softDeleteTrip(tripId: string) {
  await db
    .update(trips)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending', // 标记为待同步
    })
    .where(eq(trips.id, tripId));
}

// 查询时排除软删除的数据
export async function getAllActiveTrips() {
  return await db
    .select()
    .from(trips)
    .where(isNull(trips.deletedAt)); // 只查询未删除的数据
}

// 注册后台任务
export async function registerBackgroundSync() {
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 分钟
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

**软删除最佳实践**
1. **所有查询都要过滤 `deleted_at IS NULL`**，避免显示已删除数据
2. **UI 删除操作调用 `softDeleteTrip()`**，而非直接 `DELETE`
3. **同步成功后物理删除**，释放存储空间
4. **保留一定时间**（如30天）以支持误删恢复功能

**5. 数据库迁移与 OTA 更新的非破坏性策略**

**⚠️ 风险**
- EAS Update (OTA 热更新) 发布新 JS 代码时，如果新代码依赖新的数据库字段，但原生层的 SQLite 结构还没变（或迁移脚本在热更中执行失败），App 会白屏崩溃

**解决方案：非破坏性迁移策略**

**原则**：
- ✅ **热更新永远不要包含 Breaking Database Changes**
- ✅ **破坏性变更必须发应用商店版本（Native Build）**
- ✅ **在启动页进行版本检查和数据库升级**

**实现示例**

```tsx
// db/migrations/manager.ts
import { MMKV } from 'react-native-mmkv';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';

const storage = new MMKV();
const DB_VERSION_KEY = 'db_version';
const CURRENT_DB_VERSION = 3; // 当前数据库版本

export async function checkAndMigrateDatabase() {
  const currentVersion = storage.getNumber(DB_VERSION_KEY) ?? 0;
  
  if (currentVersion < CURRENT_DB_VERSION) {
    // 需要升级数据库
    const appVersion = Updates.manifest?.version;
    const minRequiredAppVersion = '1.2.0'; // 需要的最低应用版本
    
    if (compareVersions(appVersion, minRequiredAppVersion) < 0) {
      // 应用版本过低，无法执行迁移
      showUpdateRequiredDialog();
      return false;
    }
    
    // 执行增量迁移
    await runMigrations(currentVersion, CURRENT_DB_VERSION);
    storage.set(DB_VERSION_KEY, CURRENT_DB_VERSION);
  }
  
  return true;
}

async function runMigrations(from: number, to: number) {
  // 增量迁移，逐步升级
  for (let version = from + 1; version <= to; version++) {
    console.log(`执行迁移: v${from} -> v${version}`);
    await executeMigration(version);
  }
}

async function executeMigration(version: number) {
  switch (version) {
    case 1:
      // 迁移 v0 -> v1: 添加 sync_status 字段
      await db.run(`ALTER TABLE trips ADD COLUMN sync_status TEXT DEFAULT 'synced'`);
      break;
    
    case 2:
      // 迁移 v1 -> v2: 添加 deleted_at 字段（非破坏性）
      await db.run(`ALTER TABLE trips ADD COLUMN deleted_at INTEGER`);
      break;
    
    case 3:
      // 迁移 v2 -> v3: 添加索引（非破坏性）
      await db.run(`CREATE INDEX idx_trips_sync_status ON trips(sync_status)`);
      await db.run(`CREATE INDEX idx_trips_deleted_at ON trips(deleted_at)`);
      break;
    
    // ❌ 不要在热更新中执行破坏性操作，如：
    // - 删除字段: DROP COLUMN
    // - 修改字段类型: ALTER COLUMN TYPE
    // - 重命名字段: RENAME COLUMN
    // 这些操作必须在 Native Build 中完成
  }
}

function showUpdateRequiredDialog() {
  Alert.alert(
    '需要更新应用',
    '当前版本过低，请前往应用商店更新到最新版本',
    [
      {
        text: '去更新',
        onPress: () => {
          // iOS App Store / Android Play Store 链接
          const storeUrl = Platform.select({
            ios: 'https://apps.apple.com/app/seagull/idXXXXXXXXXX',
            android: 'https://play.google.com/store/apps/details?id=com.seagull',
          });
          Linking.openURL(storeUrl);
        },
      },
      { text: '退出', onPress: () => BackHandler.exitApp(), style: 'cancel' },
    ],
    { cancelable: false }
  );
}

// App 启动时检查
export function App() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    async function prepare() {
      const canProceed = await checkAndMigrateDatabase();
      if (canProceed) {
        setIsReady(true);
      }
    }
    prepare();
  }, []);
  
  if (!isReady) {
    return <SplashScreen />;
  }
  
  return <RootNavigator />;
}
```

**迁移类型分类**

| 迁移类型         | 是否破坏性 | 可否热更新 | 示例                                     |
| ---------------- | ---------- | ---------- | ---------------------------------------- |
| **添加字段**     | ❌ 非破坏   | ✅ 可以     | `ADD COLUMN deleted_at INTEGER`          |
| **添加索引**     | ❌ 非破坏   | ✅ 可以     | `CREATE INDEX idx_name ON table(column)` |
| **添加表**       | ❌ 非破坏   | ✅ 可以     | `CREATE TABLE new_table (...)`           |
| **删除字段**     | ⚠️ 破坏性   | ❌ 禁止     | `DROP COLUMN old_field`                  |
| **修改字段类型** | ⚠️ 破坏性   | ❌ 禁止     | `ALTER COLUMN type`                      |
| **重命名字段**   | ⚠️ 破坏性   | ❌ 禁止     | `RENAME COLUMN old TO new`               |

**最佳实践**
1. **版本号管理**：在 MMKV 中存储当前数据库版本
2. **增量迁移**：从旧版本逐步升级到新版本，而不是跨版本迁移
3. **版本检查**：在启动时检查应用版本是否满足数据库要求
4. **降级兼容**：旧代码能兼容新数据库结构（添加的字段有默认值）
5. **迁移日志**：记录迁移过程，便于排查问题

### 8.3 国际化方案 (i18next)

**1. 配置 i18next**
```tsx
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { MMKV } from 'react-native-mmkv';

import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

const storage = new MMKV();
const LANGUAGE_KEY = 'user-language';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ja: { translation: ja },
    },
    lng: Localization.getLocales()[0].languageCode ?? 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React 已经转义
    },
    react: {
      useSuspense: false, // RN 不需要 Suspense
    },
  });

// 持久化语言选择（同步读取，避免闪烁）
function loadSavedLanguage() {
  const saved = storage.getString(LANGUAGE_KEY);
  if (saved) {
    i18n.changeLanguage(saved);
  }
}

loadSavedLanguage();

export default i18n;
```

**2. 语言文件结构**
```json
// locales/zh.json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "loading": "加载中..."
  },
  "trip": {
    "title": "行程标题",
    "create": "创建行程",
    "edit": "编辑行程",
    "days_count": "{{count}} 天",
    "days_count_plural": "{{count}} 天"
  },
  "map": {
    "search_placeholder": "搜索地点...",
    "no_results": "未找到结果"
  }
}
```

**3. 使用示例**
```tsx
import { useTranslation } from 'react-i18next';

export function TripScreen() {
  const { t, i18n } = useTranslation();
  
  return (
    <View>
      <Text>{t('trip.title')}</Text>
      <Text>{t('trip.days_count', { count: 5 })}</Text>
      
      <Button onPress={() => i18n.changeLanguage('zh')}>
        {t('common.save')}
      </Button>
    </View>
  );
}
```

**4. 语言切换**
```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    storage.set('user-language', lang);
  };
  
  return (
    <View>
      <Button onPress={() => changeLanguage('en')}>English</Button>
      <Button onPress={() => changeLanguage('zh')}>中文</Button>
      <Button onPress={() => changeLanguage('ja')}>日本語</Button>
    </View>
  );
}
```

**5. TypeScript 类型安全**
```tsx
// types/i18next.d.ts
import 'i18next';
import zh from '../i18n/locales/zh.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof zh;
    };
  }
}

// 现在有自动补全和类型检查
t('trip.title'); // ✅ 有效
t('invalid.key'); // ❌ TypeScript 错误
```

**6. 格式化工具**
```tsx
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import { format } from 'date-fns';
import { zhCN, enUS, ja } from 'date-fns/locale';

const localeMap = { zh: zhCN, en: enUS, ja };

export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = localeMap[i18n.language] ?? enUS;
  
  return {
    // 日期格式化
    formatDate: (date: Date) => format(date, 'PPP', { locale }),
    
    // 货币格式化
    formatCurrency: (amount: number) =>
      new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: 'USD',
      }).format(amount),
    
    // 数字格式化
    formatNumber: (num: number) =>
      new Intl.NumberFormat(i18n.language).format(num),
  };
}
```

## 9. 开发规范

### 9.1 代码规范

**1. TypeScript/React 命名规范**
   - 组件名：PascalCase (`TripCard.tsx`)
   - Hook 函数：use 前缀 camelCase (`useTripData`)
   - 变量/函数：camelCase (`getTripById`)
   - 常量：UPPER_SNAKE_CASE (`API_BASE_URL`)
   - 类型/接口：PascalCase (`interface Trip`)
   - 文件名：kebab-case (`trip-list.tsx`) 或 PascalCase

**2. 代码组织**
```tsx
// 1. React/React Native imports
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. 第三方库
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

// 3. 项目内部 - 结对路径
import { api } from '~/api/trpc';
import { Button } from '~/shared/components/ui/button';
import { useTripStore } from '~/shared/stores/trip';

// 4. 类型
import type { Trip } from '~/shared/types';
```

**3. 注释规范**
```tsx
/**
 * 行程卡片组件
 * @param trip - 行程数据
 * @param onPress - 点击回调
 */
export function TripCard({ trip, onPress }: TripCardProps) {
  // 复杂逻辑注释
  const isUpcoming = trip.startDate > new Date();
  
  // TODO: 添加分享功能
  // FIXME: 修复日期显示问题
  
  return ...;
}
```

### 9.2 项目配置

**1. ESLint 配置**
```json
// .eslintrc.js
module.exports = {
  extends: '@acme/eslint-config',
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-inline-styles': 'error',
  },
};
```

**2. Prettier 配置**
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80,
  "tabWidth": 2
}
```

**3. TypeScript 配置**
```json
// tsconfig.json
{
  "extends": "@acme/tsconfig/base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "~/*": ["./*"]
    },
    "strict": true,
    "skipLibCheck": true
  }
}
```

### 9.3 目录结构

```
apps/expo/
├── app/                     # Expo Router 路由
│   ├── (auth)/              # 认证组
│   ├── (tabs)/              # 主应用 Tab
│   ├── trip/                # 行程路由
│   ├── _layout.tsx          # 根布局
│   └── index.tsx            # 首页
│
├── features/                # 业务功能模块
│   ├── auth/
│   │   ├── ui/              # UI 组件
│   │   ├── hooks/           # 业务 Hooks
│   │   ├── stores/          # Zustand Stores
│   │   └── types/           # 类型定义
│   ├── trip/
│   ├── map/
│   └── community/
│
├── shared/                  # 共享资源
│   ├── components/          # 通用 UI 组件
│   │   ├── ui/              # 基础组件
│   │   └── layout/          # 布局组件
│   ├── hooks/               # 通用 Hooks
│   ├── stores/              # 全局 Stores
│   ├── utils/               # 工具函数
│   ├── constants/           # 常量
│   └── types/               # 全局类型
│
├── api/                     # tRPC 客户端
│   ├── provider.tsx         # React Query Provider
│   └── trpc.tsx             # tRPC Hooks
│
├── db/                      # 本地数据库
│   ├── schema/              # Drizzle Schema
│   ├── migrations/          # 数据库迁移
│   └── client.ts            # 数据库客户端
│
├── i18n/                    # 国际化
│   ├── locales/
│   │   ├── en.json
│   │   ├── zh.json
│   │   └── ja.json
│   └── index.ts
│
├── assets/                  # 静态资源
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── index.ts                 # 应用入口
├── app.json                 # Expo 配置
├── tailwind.config.js       # NativeWind 配置
└── package.json
```

### 9.3 Git工作流

1. **分支策略**
   - main：稳定发布分支
   - develop：开发集成分支
   - feature/*：功能开发分支
   - bugfix/*：问题修复分支
   - release/*：发布准备分支

2. **提交规范**
   - 格式：`<type>(<scope>): <subject>`
   - 类型：feat, fix, docs, style, refactor, test, chore
   - 示例：`feat(map): add custom marker for selected POI`

3. **代码审查**
   - 功能完整性检查
   - 代码质量审查
   - UI/UX一致性验证
   - 性能影响评估

## 10. 测试策略

### 10.1 测试类型

1. **单元测试**
   - 业务逻辑测试
   - 工具函数测试
   - 状态管理测试

2. **Widget测试**
   - 组件渲染测试
   - 交互行为测试
   - 样式一致性测试

3. **集成测试**
   - 页面流程测试
   - 多组件协同测试
   - 数据流测试

4. **端到端测试**
   - 核心用户场景测试
   - 跨页面交互测试
   - 真机运行验证

### 10.2 测试工具

- 单元测试：test, mockito
- Widget测试：flutter_test
- 集成测试：integration_test
- 端到端测试：flutter_driver

### 10.3 测试策略

- 核心业务逻辑100%测试覆盖
- 关键UI组件有Widget测试
- 主要用户流程有集成测试
- 自动化CI测试与手动测试结合

### 10.4 gRPC服务测试

1. **Mock服务**
   - 使用mockito模拟gRPC服务端响应
   - 测试不同响应状态下的客户端行为
   - 模拟各种错误场景和边界条件

2. **端到端测试**
   - 使用grpc_mock服务器
   - 测试双向流通信场景
   - 验证协议兼容性和正确性

3. **性能测试**
   - 测量序列化/反序列化性能
   - 模拟弱网络环境下的性能
   - 大数据量传输的性能评估

## 11. 安全策略

### 11.1 通信安全

**1. HTTPS & TLS**
```tsx
// tRPC 客户端强制 HTTPS
const trpcClient = api.createClient({
  links: [
    httpBatchLink({
      url: process.env.EXPO_PUBLIC_API_URL,
      // 仅允许 HTTPS
      fetch: (url, options) => {
        if (!url.toString().startsWith('https://')) {
          throw new Error('仅允许 HTTPS 连接');
        }
        return fetch(url, options);
      },
    }),
  ],
});
```

**2. SSL Pinning** (expo-ssl-pinning)
```tsx
import { addPinnedCertificate } from 'expo-ssl-pinning';

// 在应用启动时配置
await addPinnedCertificate({
  hostname: 'api.seagull.com',
  certificate: require('./certs/api-cert.pem'),
});
```

**3. 安全存储 Token**
```tsx
import * as SecureStore from 'expo-secure-store';

// 存储 Token
export async function saveAuthToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

// 读取 Token
export async function getAuthToken() {
  return await SecureStore.getItemAsync('auth_token');
}

// 删除 Token
export async function deleteAuthToken() {
  await SecureStore.deleteItemAsync('auth_token');
}
```

**4. 生物识别认证**
```tsx
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics() {
  // 检查设备支持
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (!hasHardware || !isEnrolled) {
    return { success: false, error: '设备不支持生物识别' };
  }
  
  // 执行认证
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: '验证身份以继续',
    fallbackLabel: '使用密码',
    disableDeviceFallback: false,
  });
  
  return result;
}
```

### 11.2 数据安全

**1. SQLite 加密** (expo-sqlite + SQLCipher)
```tsx
import { openDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// 生成加密密钥
const encryptionKey = await SecureStore.getItemAsync('db_key') ||
  await Crypto.randomUUID();

await SecureStore.setItemAsync('db_key', encryptionKey);

// 打开加密数据库
const db = openDatabase('seagull.db', {
  enableCRSQLite: true,
  encryptionKey,
});
```

**2. 屏幕截图/录屏保护**
```tsx
import { preventScreenCapture, allowScreenCapture } from 'expo-screen-capture';

// 在敏感页面禁用截图
useEffect(() => {
  preventScreenCapture();
  return () => allowScreenCapture();
}, []);
```

**3. 应用后台隐藏内容**
```tsx
import { AppState } from 'react-native';
import { BlurView } from 'expo-blur';

export function SecureApp({ children }) {
  const [isBackground, setIsBackground] = useState(false);
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsBackground(state !== 'active');
    });
    return () => subscription.remove();
  }, []);
  
  return (
    <>
      {children}
      {isBackground && (
        <BlurView
          intensity={100}
          style={StyleSheet.absoluteFill}
        />
      )}
    </>
  );
}
```

**4. 权限最小化请求**
```tsx
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

// 仅在需要时请求权限
export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      '需要位置权限',
      '我们需要访问您的位置来提供行程规划功能',
      [
        { text: '取消', style: 'cancel' },
        { text: '去设置', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  
  return true;
}
```

### 11.3 代码安全

**1. 环境变量保护**
```bash
# .env.local (不要提交到版本控制)
EXPO_PUBLIC_API_URL=https://api.seagull.com
API_SECRET=your-secret-key  # 仅后端使用，不要用 EXPO_PUBLIC_ 前缀
```

```tsx
// app.config.ts - 构建时注入敏感配置
export default {
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    // 敏感配置通过 EAS Secrets 管理
  },
};
```

**2. 代码混淆** (Hermes + Metro)
```js
// metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      compress: {
        drop_console: true, // 移除 console.log
      },
      mangle: {
        toplevel: true, // 混淆顶层变量名
      },
    },
  },
};
```

**3. Root/越狱检测**
```tsx
import * as Device from 'expo-device';

export async function isDeviceSecure() {
  const isRooted = await Device.isRootedExperimentalAsync();
  
  if (isRooted) {
    Alert.alert(
      '安全警告',
      '检测到设备可能已被 Root/越狱，某些功能可能不可用',
      [{ text: '了解', style: 'default' }]
    );
    return false;
  }
  
  return true;
}
```

**4. 输入验证和 XSS 防护**
```tsx
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// 使用 Zod 验证输入
const TripSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(5000),
  startDate: z.date(),
});

// 清理用户输入的 HTML
function sanitizeHTML(dirty: string) {
  return DOMPurify.sanitize(dirty);
}
```

## 12. 性能优化

### 12.1 渲染性能

**1. React 组件优化**
```tsx
import { memo, useMemo, useCallback } from 'react';

// 使用 memo 避免不必要的重渲染
export const TripCard = memo(({ trip, onPress }: TripCardProps) => {
  // 使用 useCallback 缓存事件处理器
  const handlePress = useCallback(() => {
    onPress(trip.id);
  }, [trip.id, onPress]);
  
  // 使用 useMemo 缓存计算结果
  const formattedDate = useMemo(
    () => format(trip.startDate, 'PPP'),
    [trip.startDate]
  );
  
  return (
    <Pressable onPress={handlePress}>
      <Text>{trip.title}</Text>
      <Text>{formattedDate}</Text>
    </Pressable>
  );
});
```

**2. FlatList 虚拟化**
```tsx
import { FlatList } from 'react-native';

export function TripList({ trips }: { trips: Trip[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Trip }) => <TripCard trip={item} />,
    []
  );
  
  return (
    <FlatList
      data={trips}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      // 性能优化配置
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
      // 分隔线优化
      ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
      getItemLayout={(data, index) => ({
        length: 100,
        offset: 100 * index,
        index,
      })}
    />
  );
}
```

**3. Reanimated 高性能动画**
```tsx
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

export function AnimatedCard() {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };
  
  return (
    <Animated.View style={animatedStyle}>
      {/* content */}
    </Animated.View>
  );
}
```

**4. 图片优化**
```tsx
import { Image } from 'expo-image';

export function OptimizedImage({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      placeholder={blurhash}
      contentFit="cover"
      transition={200}
      // 自动缓存
      cachePolicy="memory-disk"
      // 图片压缩
      recyclingKey={uri}
    />
  );
}
```

### 12.2 内存管理

**1. useEffect 清理**
```tsx
export function LocationTracker() {
  useEffect(() => {
    let subscription: Location.LocationSubscription;
    
    const startTracking = async () => {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High },
        (location) => console.log(location)
      );
    };
    
    startTracking();
    
    // 清理订阅
    return () => {
      subscription?.remove();
    };
  }, []);
}
```

**2. 图片缓存管理**
```tsx
import { Image } from 'expo-image';

// 设置缓存限制
Image.setCacheLimit({
  memory: 100 * 1024 * 1024,  // 100MB
  disk: 500 * 1024 * 1024,    // 500MB
});

// 清理缓存
export async function clearImageCache() {
  await Image.clearDiskCache();
  await Image.clearMemoryCache();
}
```

**3. 图片本地存储垃圾回收策略**

**⚠️ 问题**
- 旅行 App 图片量巨大。expo-image 缓存很好，但用户拍摄的原始图片如果一直存在 `FileSystem.documentDirectory`，会让 App 体积迅速膨胀到几 GB
- 用户体验问题：占用大量存储空间，可能导致手机存储不足

**解决方案**

```tsx
// shared/utils/image-cleanup.ts
import * as FileSystem from 'expo-file-system';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const LAST_CLEANUP_KEY = 'last_image_cleanup';
const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7天

/**
 * 图片存储策略
 * 1. 用户拍摄的原图 -> 压缩后上传到云端
 * 2. 上传成功后 -> 本地保留缩略图（低分辨率）或直接删除
 * 3. 显示时 -> 优先从云端 CDN 加载（expo-image 自动缓存）
 * 4. 定期清理 -> 删除已上传图片的本地原图
 */

export interface LocalImage {
  id: string;
  localUri: string;
  cloudUrl?: string;
  uploadedAt?: number;
  fileSize: number;
}

// 1. 上传图片后清理本地原图
export async function uploadAndCleanupImage(
  localUri: string,
  tripId: string
): Promise<string> {
  // 压缩图片
  const compressedUri = await compressImage(localUri);
  
  // 上传到云端
  const cloudUrl = await uploadToCloud(compressedUri);
  
  // 保存云端 URL 到数据库
  await saveImageRecord({
    localUri,
    cloudUrl,
    uploadedAt: Date.now(),
  });
  
  // 选择策略：
  // 策略 A: 完全删除本地原图（节省空间，依赖网络）
  await FileSystem.deleteAsync(localUri, { idempotent: true });
  await FileSystem.deleteAsync(compressedUri, { idempotent: true });
  
  // 策略 B: 保留低分辨率缩略图（离线可用）
  // const thumbnailUri = await createThumbnail(localUri);
  // await FileSystem.deleteAsync(localUri);
  // return thumbnailUri;
  
  return cloudUrl;
}

// 2. 定期清理已上传图片的本地副本
export async function scheduleImageCleanup() {
  const lastCleanup = storage.getNumber(LAST_CLEANUP_KEY) ?? 0;
  const now = Date.now();
  
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return; // 未到清理时间
  }
  
  console.log('开始图片垃圾回收...');
  
  // 获取所有已上传的图片
  const uploadedImages = await db
    .select()
    .from(images)
    .where(isNotNull(images.cloudUrl));
  
  let cleanedSize = 0;
  let cleanedCount = 0;
  
  for (const image of uploadedImages) {
    if (image.localUri && image.uploadedAt) {
      const uploadAge = now - image.uploadedAt;
      
      // 已上传超过 24 小时的图片，删除本地副本
      if (uploadAge > 24 * 60 * 60 * 1000) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(image.localUri);
          if (fileInfo.exists) {
            cleanedSize += fileInfo.size || 0;
            await FileSystem.deleteAsync(image.localUri, { idempotent: true });
            cleanedCount++;
          }
        } catch (error) {
          console.error('删除图片失败:', error);
        }
      }
    }
  }
  
  storage.set(LAST_CLEANUP_KEY, now);
  
  console.log(
    `图片清理完成: 删除 ${cleanedCount} 个文件，释放 ${formatBytes(cleanedSize)}`
  );
  
  return { cleanedCount, cleanedSize };
}

// 3. 检查缓存文件夹大小
export async function getCacheSize(): Promise<number> {
  const cacheDir = FileSystem.cacheDirectory;
  const documentDir = FileSystem.documentDirectory + 'images/';
  
  const cacheSize = await getFolderSize(cacheDir);
  const documentSize = await getFolderSize(documentDir);
  
  return cacheSize + documentSize;
}

async function getFolderSize(dir: string): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return 0;
    
    const files = await FileSystem.readDirectoryAsync(dir);
    let totalSize = 0;
    
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(dir + file);
      totalSize += fileInfo.size || 0;
    }
    
    return totalSize;
  } catch (error) {
    console.error('计算文件夹大小失败:', error);
    return 0;
  }
}

// 4. 手动清理缓存（用户设置页面）
export async function manualCleanup() {
  // 清理 expo-image 缓存
  await clearImageCache();
  
  // 清理已上传图片的本地副本
  const { cleanedCount, cleanedSize } = await scheduleImageCleanup();
  
  // 清理临时文件
  const tempFiles = await FileSystem.readDirectoryAsync(
    FileSystem.cacheDirectory!
  );
  for (const file of tempFiles) {
    if (file.endsWith('.tmp') || file.endsWith('.temp')) {
      await FileSystem.deleteAsync(FileSystem.cacheDirectory + file, {
        idempotent: true,
      });
    }
  }
  
  return { cleanedCount, cleanedSize };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

// 5. 在 App 启动时/进入后台时自动清理
export function useAutoImageCleanup() {
  useEffect(() => {
    // App 启动时检查
    scheduleImageCleanup();
    
    // App 进入后台时清理
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        scheduleImageCleanup();
      }
    });
    
    return () => subscription.remove();
  }, []);
}
```

**UI 示例：存储管理页面**

```tsx
// features/settings/StorageManagement.tsx
export function StorageManagementScreen() {
  const [cacheSize, setCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  
  useEffect(() => {
    loadCacheSize();
  }, []);
  
  async function loadCacheSize() {
    const size = await getCacheSize();
    setCacheSize(size);
  }
  
  async function handleClearCache() {
    setIsClearing(true);
    try {
      const { cleanedCount, cleanedSize } = await manualCleanup();
      
      Alert.alert(
        '清理完成',
        `已清理 ${cleanedCount} 个文件，释放 ${formatBytes(cleanedSize)} 空间`
      );
      
      await loadCacheSize();
    } catch (error) {
      Alert.alert('清理失败', error.message);
    } finally {
      setIsClearing(false);
    }
  }
  
  return (
    <View className="flex-1 p-4">
      <Card className="mb-4">
        <Text className="text-lg font-semibold mb-2">缓存大小</Text>
        <Text className="text-3xl font-bold text-blue-500">
          {formatBytes(cacheSize)}
        </Text>
      </Card>
      
      <Button
        onPress={handleClearCache}
        disabled={isClearing}
        className="bg-red-500"
      >
        {isClearing ? '清理中...' : '清理缓存'}
      </Button>
      
      <View className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <Text className="text-sm text-gray-600">
          💡 提示：已上传到云端的图片，本地副本会在 24 小时后自动清理
        </Text>
      </View>
    </View>
  );
}
```

**最佳实践**
1. **上传即删**：图片上传成功后立即删除本地高清原图
2. **保留策略**：可选择保留缩略图用于离线浏览
3. **定期清理**：App 后台运行时自动清理已上传图片
4. **用户控制**：提供存储管理页面，让用户手动清理
5. **监控告警**：缓存超过阈值（如 1GB）时提示用户清理

**3. React Query 缓存管理**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 10 * 60 * 1000, // 10分钟后回收未使用的数据
      staleTime: 5 * 60 * 1000,  // 5分钟内视为新鲜
    },
  },
});

// 手动清理缓存
queryClient.clear();
```

### 12.3 启动优化

**1. Hermes 引擎**
```json
// app.json
{
  "expo": {
    "jsEngine": "hermes",  // 启用 Hermes
    "android": {
      "enableProguardInReleaseBuilds": true
    }
  }
}
```

**2. 启动屏优化**
```tsx
import * as SplashScreen from 'expo-splash-screen';

// 阻止自动隐藏
SplashScreen.preventAutoHideAsync();

export function App() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    async function prepare() {
      try {
        // 预加载关键资源
        await Font.loadAsync({
          'custom-font': require('./assets/fonts/custom.ttf'),
        });
        
        // 初始化数据库
        await initDatabase();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }
    
    prepare();
  }, []);
  
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);
  
  if (!isReady) return null;
  
  return <RootNavigator />;
}
```

**3. 骨架屏**
```tsx
import { Skeleton } from 'moti/skeleton';

export function TripListSkeleton() {
  return (
    <View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} height={100} width="100%" />
      ))}
    </View>
  );
}

// 使用
export function TripListScreen() {
  const { data, isLoading } = api.trip.list.useQuery();
  
  if (isLoading) return <TripListSkeleton />;
  
  return <TripList trips={data} />;
}
```

### 12.4 网络优化

**1. tRPC Batching**
```tsx
import { httpBatchLink } from '@trpc/client';

const trpcClient = api.createClient({
  links: [
    httpBatchLink({
      url: API_URL,
      // 批量请求，减少网络调用
      maxURLLength: 2083,
    }),
  ],
});
```

**2. React Query 预取**
```tsx
export function TripListScreen() {
  const queryClient = useQueryClient();
  const { data: trips } = api.trip.list.useQuery();
  
  // 鼠标悬停时预取详情
  const handleHover = (tripId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['trip', tripId],
      queryFn: () => api.trip.get.fetch({ id: tripId }),
    });
  };
  
  return <TripList trips={trips} onItemHover={handleHover} />;
}
```

**3. 图片压缩和 CDN**
```tsx
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

// 使用 CDN 加速
<Image
  source={{
    uri: `https://cdn.seagull.com/images/${imageId}?w=400&q=80`,
  }}
/>
```

**4. 离线缓存策略**
```tsx
import NetInfo from '@react-native-community/netinfo';

// 监控网络状态
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);
  
  return isOnline;
}

// React Query 离线模式
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // 离线优先
    },
  },
});
```

## 13. 多平台适配

### 13.1 平台检测和条件渲染

**1. 平台检测**
```tsx
import { Platform } from 'react-native';
import * as Device from 'expo-device';

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const isWeb = Platform.OS === 'web';

// 设备类型检测
const isTablet = Device.deviceType === Device.DeviceType.TABLET;
const isPhone = Device.deviceType === Device.DeviceType.PHONE;
```

**2. 条件样式**
```tsx
const styles = StyleSheet.create({
  container: {
    padding: Platform.select({
      ios: 20,
      android: 16,
      default: 12,
    }),
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});
```

**3. 平台特定组件**
```tsx
export function PlatformSpecificButton({ onPress, title }) {
  if (Platform.OS === 'ios') {
    return (
      <Pressable
        onPress={onPress}
        style={{ padding: 12, borderRadius: 8 }}
      >
        <Text>{title}</Text>
      </Pressable>
    );
  }
  
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#ccc' }}
      style={{ padding: 16 }}
    >
      <Text>{title}</Text>
    </Pressable>
  );
}
```

### 13.2 iOS 特性

**1. Safe Area 适配**
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export function IOSScreen({ children }) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}
```

**2. Haptic Feedback**
```tsx
import * as Haptics from 'expo-haptics';

export function handleButtonPress() {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  // 执行操作
}
```

**3. iOS Live Activities**
```tsx
import { startLiveActivity } from 'expo-live-activities';

export async function startTripTracking(tripId: string) {
  if (Platform.OS === 'ios') {
    await startLiveActivity({
      activityType: 'trip-tracking',
      attributes: { tripId },
      contentState: { status: 'active' },
    });
  }
}
```

### 13.3 Android 特性

**1. Android Back Handler**
```tsx
import { BackHandler } from 'react-native';

export function useAndroidBackButton(onBack: () => boolean) {
  useEffect(() => {
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBack
      );
      return () => subscription.remove();
    }
  }, [onBack]);
}
```

**2. Android 状态栏**
```tsx
import { StatusBar } from 'expo-status-bar';

export function App() {
  return (
    <>
      <StatusBar
        style={Platform.OS === 'android' ? 'dark' : 'auto'}
        backgroundColor="#fff"
      />
      {/* content */}
    </>
  );
}
```

**3. Android 权限**
```tsx
import { PermissionsAndroid } from 'react-native';

export async function requestAndroidPermissions() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]);
    return granted;
  }
}
```

### 13.4 响应式布局

**1. 屏幕尺寸适配**
```tsx
import { useWindowDimensions } from 'react-native';

export function ResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  
  return (
    <View style={{ flexDirection: isTablet ? 'row' : 'column' }}>
      <Sidebar />
      <MainContent />
    </View>
  );
}
```

**2. iPad/平板优化**
```tsx
export function useDeviceLayout() {
  const { width } = useWindowDimensions();
  
  return {
    isPhone: width < 600,
    isTablet: width >= 600 && width < 1024,
    isDesktop: width >= 1024,
    columns: width < 600 ? 1 : width < 1024 ? 2 : 3,
  };
}
```

### 13.5 Web 支持 (Expo Web)

**1. Web 特定优化**
```tsx
export function WebOptimizedComponent() {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Web 特定内容 */}
      </div>
    );
  }
  
  return <View>{/* 移动端内容 */}</View>;
}
```

**2. SEO 优化** (Next.js/Expo Web)
```tsx
import Head from 'expo-router/head';

export function TripDetailPage({ trip }) {
  return (
    <>
      <Head>
        <title>{trip.title} - Seagull</title>
        <meta name="description" content={trip.description} />
      </Head>
      <View>{/* 内容 */}</View>
    </>
  );
}
```

## 14. 中国大陆用户支持方案

由于网络环境和服务可用性限制，应用如果要支持中国大陆用户，需要针对性地做技术预案。

### 14.1 地图服务适配

**问题分析**
- **Android**：`react-native-maps` 默认使用 Google Maps。在中国大陆，没有 GMS (Google Mobile Services) 的手机（华为、小米等）如果不翻墙完全无法加载地图，甚至会导致 App 崩溃
- **iOS**：Apple Maps 在国内使用的是高德数据，体验尚可，但存在坐标偏移问题（WGS-84 vs GCJ-02）

**解决方案**

**方案 A (简单，推荐 MVP 阶段)**
```tsx
// shared/utils/region-detector.ts
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';

export function isChinaMainland(): boolean {
  const locale = Localization.getLocales()[0];
  // 检测地区码是否为中国大陆
  return locale.regionCode === 'CN' || locale.languageCode === 'zh-Hans-CN';
}

// features/map/components/MapView.tsx
import { Linking, Image, View, Text, Pressable } from 'react-native';
import { isChinaMainland } from '~/shared/utils/region-detector';

export function AdaptiveMapView({ location, poi }) {
  const isCN = isChinaMainland();
  
  if (Platform.OS === 'android' && isCN) {
    // Android + 中国大陆：展示静态地图，点击跳转外部地图
    return (
      <View className="relative">
        <Image
          source={{ uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${location.lng},${location.lat},12,0/600x400@2x?access_token=YOUR_TOKEN` }}
          className="w-full h-64"
        />
        <Pressable
          className="absolute bottom-4 right-4 bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => {
            // 跳转高德地图或百度地图
            const amap = `amapuri://route/plan/?dlat=${location.lat}&dlon=${location.lng}&dname=${poi.name}&dev=0`;
            const baidu = `baidumap://map/direction?destination=latlng:${location.lat},${location.lng}|name:${poi.name}&mode=driving`;
            
            Linking.canOpenURL(amap)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(amap);
                }
                return Linking.openURL(baidu);
              })
              .catch((err) => console.error('无法打开地图', err));
          }}
        >
          <Text className="text-white font-semibold">在地图中查看</Text>
        </Pressable>
      </View>
    );
  }
  
  // iOS 或非中国大陆用户：使用 react-native-maps
  return (
    <MapView
      region={location}
      // iOS 自动使用 Apple Maps（国内为高德数据）
    >
      <Marker coordinate={convertCoordinates(location)} />
    </MapView>
  );
}
```

**方案 B (完美，需要 Development Build)**
```tsx
// 集成 react-native-amap3d (高德地图) 作为 fallback
// ⚠️ 注意：需要 Development Build，无法在 Expo Go 中使用

// app.json - 添加 Config Plugin
{
  "expo": {
    "plugins": [
      [
        "react-native-amap3d",
        {
          "android_api_key": "YOUR_AMAP_ANDROID_KEY",
          "ios_api_key": "YOUR_AMAP_IOS_KEY"
        }
      ]
    ]
  }
}

// 根据地区动态选择地图组件
import MapView from 'react-native-maps'; // Google/Apple Maps
import { MapView as AmapView } from 'react-native-amap3d'; // 高德地图

export function AdaptiveMapView(props) {
  const isCN = isChinaMainland();
  const MapComponent = (Platform.OS === 'android' && isCN) ? AmapView : MapView;
  
  return <MapComponent {...props} />;
}
```

**坐标系转换（必需）**
```tsx
// shared/utils/coordinate-converter.ts
import gcoord from 'gcoord';

/**
 * 后端存储使用 WGS-84（GPS标准坐标系）
 * 国内地图显示使用 GCJ-02（火星坐标系，高德/腾讯）或 BD-09（百度坐标系）
 */

// WGS-84 → GCJ-02 (用于高德地图显示)
export function wgs84ToGcj02(lng: number, lat: number) {
  return gcoord.transform(
    [lng, lat],
    gcoord.WGS84,
    gcoord.GCJ02
  );
}

// GCJ-02 → WGS-84 (用于保存到后端)
export function gcj02ToWgs84(lng: number, lat: number) {
  return gcoord.transform(
    [lng, lat],
    gcoord.GCJ02,
    gcoord.WGS84
  );
}

// 使用示例
const location = { lng: 116.404, lat: 39.915 }; // 后端返回的 WGS-84
const [gcjLng, gcjLat] = wgs84ToGcj02(location.lng, location.lat);

<Marker coordinate={{ longitude: gcjLng, latitude: gcjLat }} />
```

**依赖包**
```json
{
  "gcoord": "^0.3.2",
  "react-native-amap3d": "^3.0.0" // 可选，仅方案B需要
}
```

### 14.2 推送通知适配

**问题分析**
- `expo-notifications` 在 Android 上强依赖 FCM (Firebase Cloud Messaging)
- FCM 在中国大陆是完全不可用的（Google 服务被墙）

**解决方案**

**方案 A (应用内通知，推荐)**
```tsx
// shared/hooks/useInAppNotifications.ts
import { useEffect } from 'react';
import { api } from '~/api/trpc';
import Toast from 'react-native-toast-message';

export function useInAppNotifications() {
  // 使用 tRPC Subscriptions (WebSocket) 接收通知
  api.notification.onNew.useSubscription(
    undefined,
    {
      onData: (notification) => {
        // 应用在前台时，显示 Toast
        Toast.show({
          type: 'info',
          text1: notification.title,
          text2: notification.body,
          onPress: () => {
            // 导航到相关页面
            router.push(notification.targetUrl);
          },
        });
      },
    }
  );
}

// App.tsx
export function App() {
  useInAppNotifications(); // 全局监听
  return <RootNavigator />;
}
```

**方案 B (系统日历提醒作为替代)**
```tsx
import * as Calendar from 'expo-calendar';

export async function scheduleCalendarReminder(trip: Trip) {
  // 请求日历权限
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return;
  
  // 创建日历事件作为提醒
  const calendarId = await getDefaultCalendarId();
  await Calendar.createEventAsync(calendarId, {
    title: `行程提醒：${trip.destination}`,
    startDate: trip.startDate,
    endDate: trip.endDate,
    alarms: [
      { relativeOffset: -24 * 60 }, // 提前1天
      { relativeOffset: -60 },      // 提前1小时
    ],
  });
}
```

**方案 C (完整推送，需要原生集成)**
```tsx
// 集成第三方推送服务（极光推送、个推等）
// ⚠️ 需要：
// 1. Development Build
// 2. 企业备案和ICP许可
// 3. 原生代码集成
// 4. 后端支持多推送通道

// 示例：极光推送
import JPush from 'jpush-react-native';

JPush.init({
  appKey: 'your-jpush-key',
  channel: 'default',
});

JPush.addNotificationListener((notification) => {
  console.log('收到推送', notification);
});
```

**推荐策略**
- **MVP 阶段**：方案 A（应用内通知）+ 方案 B（日历提醒）
- **正式运营**：如需完整离线推送，接入极光/个推，但需要原生开发和备案

### 14.3 其他服务适配

**1. CDN 和静态资源**
```tsx
// 使用国内 CDN 加速
const CDN_BASE_URL = isChinaMainland()
  ? 'https://cdn.example.cn'  // 国内 CDN（阿里云、腾讯云）
  : 'https://cdn.example.com'; // 国际 CDN（Cloudflare、AWS CloudFront）

<Image source={{ uri: `${CDN_BASE_URL}/images/${imageId}` }} />
```

**2. API 域名切换**
```tsx
// .env.production
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_API_URL_CN=https://api.example.cn

// api/trpc.tsx
import { isChinaMainland } from '~/shared/utils/region-detector';

const API_URL = isChinaMainland()
  ? process.env.EXPO_PUBLIC_API_URL_CN
  : process.env.EXPO_PUBLIC_API_URL;
```

**3. 分析和监控服务**
```tsx
// 国际用户：Firebase Analytics
// 中国用户：友盟、神策、或自建

import * as Analytics from 'expo-firebase-analytics';
import Umeng from 'react-native-umeng'; // 友盟

export function logEvent(name: string, params: object) {
  if (isChinaMainland()) {
    Umeng.onEvent(name, params);
  } else {
    Analytics.logEvent(name, params);
  }
}
```

## 15. 持续集成与部署

### 15.1 CI流程

- GitHub Actions/Jenkins 自动化流程
- 代码质量检查：lint, analyzer
- 自动化测试：单元测试、Widget测试
- 构建验证：确保无编译错误
- Proto文件同步与代码生成自动化
- gRPC服务契约测试

### 15.2 版本发布

- 语义化版本管理：major.minor.patch
- 渐进式发布：内测->公测->全量
- A/B测试：新功能分组测试

### 15.3 监控与分析

- 崩溃报告：Firebase Crashlytics
- 性能监控：Firebase Performance
- 用户行为分析：Firebase Analytics
- 远程配置：Firebase Remote Config

## 16. 迭代规划

### 16.1 MVP 阶段（第一期 - 2-3个月）

**核心功能**
- 用户认证（Better Auth + expo-secure-store）
- tRPC + React Query 基础框架
- 行程 CRUD（创建、编辑、删除）
- 基础地图功能（显示、搜索、标记）
- 本地数据库（Expo SQLite + Drizzle）
- 离线优先架构基础
- 国际化（中英双语）

**技术里程碑**
- Expo development builds 配置
- EAS Build 流程搭建
- Zustand 状态管理集成
- NativeWind UI 组件库

### 16.2 增强阶段（第二期 - 3-4个月）

**提升体验**
- 协同编辑（tRPC Subscriptions + WebSocket）
- 智能路线规划（聚类算法）
- 地理围栏提醒 (expo-location)
- 行李清单与天气集成
- 复杂动画（Reanimated Shared Element）
- 后台同步任务

**原生功能**
- iOS Live Activities
- 推送通知 (expo-notifications)
- 系统日历集成
- 生物识别登录

### 16.3 完善阶段（第三期 - 2-3个月）

**生态建设**
- 社区模板分享
- 智能游记生成
- 多格式导出（PDF/长图）
- 旅行足迹地图
- AI 智能推荐

**扩展支持**
- Web 版本（Expo Web）
- iPad 优化
- 深度离线支持
- 高级数据分析

---

## 总结

本文档描述了基于 **Expo + React Native + tRPC + Zustand + i18next** 技术栈的 Seagull 旅行规划应用前端实现方案。相比传统 React Native 开发，Expo 提供了：

- 🚀 **更快的开发迭代**：Expo Go 快速预览 + 热更新
- 📦 **开箱即用的原生功能**：50+ Expo SDK 模块
- 🏗️ **简化的构建部署**：EAS Build/Update 云服务
- 🔒 **端到端类型安全**：tRPC + TypeScript Monorepo
- 📊 **轻量状态管理**：Zustand 极简 API
- 🌍 **完善的国际化**：i18next 成熟方案

通过遵循本文档的架构设计和最佳实践，可以构建一个高质量、高性能、易维护的跨平台移动应用。

---

## 17. 风险评估与应对

### 17.1 技术风险

**1. Expo SDK 更新**
   - **风险**：SDK 版本升级带来 Breaking Changes
   - **应对**：
     - 锁定 SDK 版本，渐进升级
     - 关注 Expo Changelog
     - 充分测试后再发布

**2. 原生模块兼容性**
   - **风险**：部分第三方库需要 custom development build
   - **应对**：
     - 优先使用 Expo 原生 SDK
     - 使用 Config Plugins 自动配置
     - 必要时使用 development builds

**3. 性能问题**
   - **风险**：大量 POI 标记、复杂动画导致卡顿
   - **应对**：
     - 使用 Reanimated worklets
     - POI 聚类算法
     - FlatList 虚拟化
     - 图片懒加载和缓存

**4. tRPC 类型安全**
   - **风险**：后端 API 变更导致类型不匹配
   - **应对**：
     - Monorepo 保证类型同步
     - 严格的 TypeScript 配置
     - API 版本管理策略
     - 自动化集成测试

### 17.2 业务风险

1. **离线功能完整性**
   - 风险：离线状态下功能受限
   - 应对：关键功能优先离线化、智能数据预加载

2. **多设备同步**
   - 风险：数据冲突与不一致
   - 应对：冲突解决策略、版本控制、差异合并算法

3. **用户体验一致性**
   - 风险：不同设备体验差异大
   - 应对：设计系统统一、适配测试覆盖、平台特性平衡

## 18. 附录

### 18.1 依赖包清单

**核心框架**
```json
{
  "expo": "~54.0.29",
  "react": "^19.0.0",
  "react-native": "~0.81.5",
  "expo-router": "~6.0.19"
}
```

**状态管理**
```json
{
  "zustand": "^5.0.2",
  "@tanstack/react-query": "^5.62.11",
  "react-native-mmkv": "^3.1.0"
}
```

**API 通信**
```json
{
  "@trpc/client": "^11.0.0",
  "@trpc/server": "^11.0.0",
  "@trpc/react-query": "^11.0.0",
  "superjson": "^2.2.3"
}
```

**数据库**
```json
{
  "expo-sqlite": "~16.0.3",
  "drizzle-orm": "^0.36.4",
  "drizzle-kit": "^0.28.1"
}
```

**UI & 样式**
```json
{
  "nativewind": "^5.0.0-preview.2",
  "tailwindcss": "^3.4.17",
  "react-native-reanimated": "~4.1.3",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-safe-area-context": "~5.6.1"
}
```

**国际化**
```json
{
  "i18next": "^24.0.0",
  "react-i18next": "^15.1.0",
  "expo-localization": "~16.0.9",
  "date-fns": "^4.1.0"
}
```

**地图 & 位置**
```json
{
  "react-native-maps": "~2.4.3",
  "expo-location": "~19.0.7",
  "react-native-maps-super-cluster": "^1.6.0",
  "gcoord": "^0.3.2"
}
```

**图片 & 媒体**
```json
{
  "expo-image": "~2.1.8",
  "expo-image-picker": "~17.0.11",
  "expo-image-manipulator": "~14.0.11",
  "expo-media-library": "~17.2.3",
  "expo-av": "~16.0.10"
}
```

**认证 & 安全**
```json
{
  "better-auth": "^1.1.7",
  "@better-auth/expo": "^1.1.7",
  "expo-secure-store": "~15.0.8",
  "expo-local-authentication": "~16.0.11"
}
```

**原生功能**
```json
{
  "expo-notifications": "~0.30.21",
  "expo-task-manager": "~13.0.6",
  "expo-background-fetch": "~14.0.8",
  "expo-live-activities": "~1.0.0",
  "expo-calendar": "~14.0.10",
  "expo-file-system": "~19.0.10",
  "expo-sharing": "~14.0.7",
  "expo-network": "~9.0.8"
}
```

**开发工具**
```json
{
  "@types/react": "^19.0.0",
  "typescript": "^5.7.2",
  "eslint": "^9.17.0",
  "prettier": "^3.4.2",
  "@tanstack/react-query-devtools": "^5.62.11"
}
```
### 18.2 参考文档

**核心框架**
- Expo 官方文档: https://docs.expo.dev/
- React Native 文档: https://reactnative.dev/docs/getting-started
- Expo Router: https://docs.expo.dev/router/introduction/
- EAS (Expo Application Services): https://docs.expo.dev/eas/

**状态管理**
- Zustand: https://zustand-demo.pmnd.rs/
- React Query (TanStack Query): https://tanstack.com/query/latest/docs/react/overview
- tRPC: https://trpc.io/docs

**数据库 & ORM**
- Drizzle ORM: https://orm.drizzle.team/docs/overview
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/

**UI & 样式**
- NativeWind: https://www.nativewind.dev/
- Tailwind CSS: https://tailwindcss.com/docs
- Reanimated: https://docs.swmansion.com/react-native-reanimated/
- React Native Gesture Handler: https://docs.swmansion.com/react-native-gesture-handler/

**地图**
- react-native-maps: https://github.com/react-native-maps/react-native-maps
- Expo Location: https://docs.expo.dev/versions/latest/sdk/location/

**国际化**
- i18next: https://www.i18next.com/
- react-i18next: https://react.i18next.com/

**设计规范**
- Material Design 3: https://m3.material.io/
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- React Native Best Practices: https://reactnative.dev/docs/performance

### 18.3 术语表

- **POI**: Point of Interest，兴趣点
- **MVP**: Minimum Viable Product，最小可行产品
- **Expo**: React Native 开发平台和工具集
- **EAS**: Expo Application Services，云构建和部署服务
- **tRPC**: TypeScript RPC 框架，端到端类型安全
- **Zustand**: 轻量级 React 状态管理库
- **React Query**: 强大的服务端状态管理库
- **Drizzle ORM**: TypeScript ORM，类型安全的数据库操作
- **NativeWind**: React Native 的 Tailwind CSS
- **Reanimated**: React Native 高性能动画库
- **Hot Reload**: 快速刷新开发中的代码变化
- **OTA**: Over-The-Air，无需应用商店审核的热更新
- **Monorepo**: 单仓库多包管理，如 Turborepo
- **Config Plugin**: Expo 的原生配置自动化工具
- **Development Build**: 包含自定义原生代码的 Expo 应用
