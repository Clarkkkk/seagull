import { useTripEditStore } from "../store";

export function useTripEditDays() {
  const days = useTripEditStore((state) => state.days);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const setDays = useTripEditStore((state) => state.setDays);
  const setSelectedDayIndex = useTripEditStore((state) => state.setSelectedDayIndex);

  // Business: add a new editable day and focus it immediately.
  const addDay = () => {
    const nextIndex = days.length ? Math.max(...days.map((d) => d.dayIndex)) + 1 : 0;
    setDays([...days, { dayIndex: nextIndex, date: null }]);
    setSelectedDayIndex(nextIndex);
  };

  return {
    days,
    selectedDayIndex,
    setSelectedDayIndex,
    addDay,
  };
}
