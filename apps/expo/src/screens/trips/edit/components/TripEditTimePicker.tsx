import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useTripEditItems } from "~/business/trip/edit/items/hooks";
import { useTripEditPlan } from "~/business/trip/edit/plan/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";
import { formatRange } from "~/business/trip/edit/utils";

export function TripEditTimePicker() {
  const [timeDuration, setTimeDuration] = useState<60 | 90 | 120>(90);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const persistedDayIndexes = useTripEditStore((state) => state.persistedDayIndexes);
  const timeModalItemId = useTripEditStore((state) => state.timeModalItemId);
  const setTimeModalItemId = useTripEditStore((state) => state.setTimeModalItemId);
  const { freeSlots, timeItem } = useTripEditPlan();
  const { setItemTimeRange, clearItemTimeRange } = useTripEditItems();
  const persistedDay = selectedDayIndex !== null && persistedDayIndexes.includes(selectedDayIndex);

  const onClose = () => setTimeModalItemId(null);
  const onSelectSlot = (s: number, e: number) => {
    if (!timeItem) return;
    setItemTimeRange(timeItem.localKey, s, e);
    setTimeModalItemId(null);
  };

  const onClear = () => {
    if (!timeItem) return;
    clearItemTimeRange(timeItem.localKey);
    setTimeModalItemId(null);
  };

  return (
    <Modal visible={!!timeModalItemId} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", padding: 16, justifyContent: "center" }}>
        <View className="bg-background border-border rounded-2xl border p-4">
          <Text className="text-foreground text-base font-semibold">选择时间段</Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            仅展示当日空闲时间段内的可选项（30min 步进）。选择后会写入条目时间段。
          </Text>

          <View className="mt-3 flex flex-row gap-2">
            {[60, 90, 120].map((d) => (
              <Pressable
                key={d}
                onPress={() => setTimeDuration(d as 60 | 90 | 120)}
                className={`rounded-full border px-3 py-1 ${timeDuration === d ? "bg-primary/10 border-primary/15" : "bg-secondary border-border/70"
                  }`}
              >
                <Text
                  className={`${timeDuration === d ? "text-primary" : "text-muted-foreground"
                    } text-xs font-semibold`}
                >
                  {d} 分钟
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-3 gap-2">
            {selectedDayIndex !== null && !persistedDay ? (
              <Text className="text-muted-foreground text-sm">请先保存当前 Day，再设置时间。</Text>
            ) : freeSlots.isFetching ? (
              <Text className="text-muted-foreground text-sm">加载空闲时间中...</Text>
            ) : selectedDayIndex === null ? (
              <Text className="text-muted-foreground text-sm">请先选择 Day。</Text>
            ) : freeSlots.data?.length ? (
              freeSlots.data.flatMap((slot) => {
                const start = Number(slot.startsMinute);
                const end = Number(slot.endsMinute);
                const opts: { s: number; e: number }[] = [];
                for (let s = start; s + timeDuration <= end; s += 30) {
                  opts.push({ s, e: s + timeDuration });
                }
                return opts.slice(0, 8).map((o) => (
                  <Pressable
                    key={`${o.s}-${o.e}`}
                    onPress={() => onSelectSlot(o.s, o.e)}
                    className="bg-muted border-border rounded-xl border px-4 py-3"
                  >
                    <Text className="text-foreground font-semibold">{formatRange(o.s, o.e)}</Text>
                  </Pressable>
                ));
              })
            ) : (
              <Text className="text-muted-foreground text-sm">当天暂无可用空闲时间段。</Text>
            )}
          </View>

          <View className="mt-4 flex flex-row gap-2">
            <Pressable className="flex-1 rounded-xl border border-border/70 px-4 py-3" onPress={onClose}>
              <Text className="text-center text-foreground font-semibold">关闭</Text>
            </Pressable>
            <Pressable className="flex-1 rounded-xl border border-border/70 px-4 py-3" onPress={onClear}>
              <Text className="text-center text-foreground font-semibold">清空时间</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

