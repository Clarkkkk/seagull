export type LatLng = { lat: number; lng: number };

export type TripItemForPlanning = {
  id: string;
  title: string;
  lat: number | null;
  lng: number | null;
  startsMinute: number | null;
  endsMinute: number | null;
  dayIndex: number | null; // null => unassigned
};

export type TripDayForPlanning = {
  dayIndex: number;
};

export type OptimizeScope = "onlyUnscheduled" | "all";

export type OptimizeInput = {
  days: TripDayForPlanning[];
  items: TripItemForPlanning[];
  scope: OptimizeScope;
  defaultVisitMinutes: number;
  dayStartMinute: number;
  dayEndMinute: number;
};

export type PlannedPlacement = {
  itemId: string;
  dayIndex: number | null; // null => unassigned
};

export type DayPlan = {
  dayIndex: number;
  orderedItemIds: string[];
};

export type OptimizeResult = {
  dayPlans: DayPlan[];
  unassigned: Array<{ itemId: string; reason: string }>;
};

