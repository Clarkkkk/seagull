export type TripStatus = "ongoing" | "upcoming" | "past";

export type TripActivity = {
  id: string;
  title: string;
  time: string; // "09:30"
  place?: string;
  note?: string;
};

export type TripDay = {
  date: string; // "YYYY-MM-DD"
  activities: TripActivity[];
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  status: TripStatus;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  days: TripDay[];
};

export const tripsMock: Trip[] = [
  {
    id: "trip_2026_japan_winter",
    title: "关西冬日慢游",
    destination: "大阪 · 京都",
    status: "ongoing",
    startDate: "2026-01-18",
    endDate: "2026-01-24",
    days: [
      {
        date: "2026-01-20",
        activities: [
          { id: "a1", time: "08:30", title: "早餐：咖啡与面包", place: "梅田" },
          { id: "a2", time: "10:00", title: "出发：前往京都", note: "JR 约 30-40 分钟" },
          { id: "a3", time: "11:30", title: "清水寺周边散步", place: "东山" },
          { id: "a4", time: "14:00", title: "午餐：乌冬", place: "祇园" },
          { id: "a5", time: "16:30", title: "日落：鸭川", place: "鸭川河畔" },
        ],
      },
    ],
  },
  {
    id: "trip_2026_sanya",
    title: "海风周末",
    destination: "三亚",
    status: "upcoming",
    startDate: "2026-03-08",
    endDate: "2026-03-10",
    days: [
      {
        date: "2026-03-08",
        activities: [
          { id: "b1", time: "12:00", title: "抵达酒店并入住" },
          { id: "b2", time: "16:30", title: "海边散步" },
        ],
      },
    ],
  },
  {
    id: "trip_2025_shanghai",
    title: "城市漫步",
    destination: "上海",
    status: "past",
    startDate: "2025-10-01",
    endDate: "2025-10-03",
    days: [
      {
        date: "2025-10-02",
        activities: [
          { id: "c1", time: "09:00", title: "武康路咖啡" },
          { id: "c2", time: "14:00", title: "西岸散步" },
        ],
      },
    ],
  },
];

export const getOngoingTrips = () =>
  tripsMock.filter((t) => t.status === "ongoing");
export const getUpcomingTrips = () =>
  tripsMock.filter((t) => t.status === "upcoming");
export const getPastTrips = () => tripsMock.filter((t) => t.status === "past");
export const getTripById = (tripId: string) =>
  tripsMock.find((t) => t.id === tripId);

export const getTodayTrip = (todayISO: string) =>
  tripsMock.find(
    (t) => t.status === "ongoing" && t.days.some((d) => d.date === todayISO),
  );

export const getNextActivity = (trip: Trip | undefined, todayISO: string) => {
  if (!trip) return undefined;
  const day = trip.days.find((d) => d.date === todayISO);
  if (!day) return undefined;
  return day.activities[0];
};

