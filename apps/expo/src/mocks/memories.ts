export type Memory = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  summary: string;
};

export const memoriesMock: Memory[] = [
  {
    id: "mem_kyoto_2024",
    title: "京都的清晨与傍晚",
    date: "2024-11-03",
    summary: "一段慢节奏的散步与寺社巡礼，照片很多，心也很安静。",
  },
  {
    id: "mem_shanghai_2025",
    title: "上海：城市的呼吸",
    date: "2025-10-03",
    summary: "咖啡、街景和夜色，像是把周末折叠进一张地图里。",
  },
];

