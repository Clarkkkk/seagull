export type JarStatus = "active" | "archived";

export type Jar = {
  id: string;
  title: string;
  country: string;
  region?: string;
  city?: string;
  status: JarStatus;
  itemCount: number;
  updatedAt: string; // ISO
};

export const jarsMock: Jar[] = [
  {
    id: "jar_tokyo_food",
    title: "东京美食清单",
    country: "日本",
    region: "东京",
    city: "东京",
    status: "active",
    itemCount: 18,
    updatedAt: "2026-01-12T10:30:00.000Z",
  },
  {
    id: "jar_kyoto_shrines",
    title: "京都寺社散步",
    country: "日本",
    region: "京都",
    city: "京都",
    status: "active",
    itemCount: 12,
    updatedAt: "2026-01-10T08:10:00.000Z",
  },
  {
    id: "jar_hk_cafes",
    title: "香港咖啡馆与街景",
    country: "中国",
    region: "香港",
    city: "香港",
    status: "active",
    itemCount: 9,
    updatedAt: "2026-01-05T15:45:00.000Z",
  },
  {
    id: "jar_shanghai_weekend",
    title: "上海周末灵感",
    country: "中国",
    region: "上海",
    city: "上海",
    status: "archived",
    itemCount: 26,
    updatedAt: "2025-10-02T09:00:00.000Z",
  },
  {
    id: "jar_italy_roadtrip",
    title: "意大利公路旅行",
    country: "意大利",
    region: "托斯卡纳",
    status: "archived",
    itemCount: 34,
    updatedAt: "2025-07-18T12:20:00.000Z",
  },
];

export const getActiveJars = () => jarsMock.filter((j) => j.status === "active");
export const getArchivedJars = () =>
  jarsMock.filter((j) => j.status === "archived");
export const getJarById = (jarId: string) =>
  jarsMock.find((j) => j.id === jarId);

