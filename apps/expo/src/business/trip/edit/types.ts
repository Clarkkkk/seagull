export interface EditDay {
  dayIndex: number;
  date: string | null;
}

export interface EditItem {
  id?: string;
  localKey: string;
  dayIndex: number | null;
  type: "poi" | "transport" | "lodging" | "note" | "free";
  order: number;
  title: string;
  startsMinute: number | null;
  endsMinute: number | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
  jarId: string | null;
}

export type TripMeta = {
  title: string;
  startDate: string | null;
  endDate: string | null;
} | null;

export type TripPlanItem = {
  id: string;
  type: string;
  order: number;
  title: string;
  startsMinute?: number | null;
  endsMinute?: number | null;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
  jarId?: string | null;
};

export type TripPlanDay = {
  dayIndex: number;
  date?: string | null;
  items: TripPlanItem[];
};

export type TripPlan = {
  days: TripPlanDay[];
  unassignedItems: TripPlanItem[];
} | null;
