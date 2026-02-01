import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { formatRange } from "~/business/trip/edit/utils";
import { useTripEditItems } from "~/business/trip/edit/items/hooks";
import { useTripEditPlan } from "~/business/trip/edit/plan/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";
import { Card, SectionHeader } from "~/components";

export function TripEditFooter() {
  const canEdit = useTripEditStore((state) => state.canEdit);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const items = useTripEditStore((state) => state.items);
  const { addEmptyItem, moveUnassignedToDay } = useTripEditItems();
  const { savePlanNow, savePlan } = useTripEditPlan();
  const unassignedItems = useMemo(
    () => items.filter((it) => it.dayIndex === null).sort((a, b) => a.order - b.order),
    [items],
  );

  return (
    <View className="gap-3 pb-6 pt-3">
      {selectedDayIndex !== null ? (
        <Pressable
          disabled={!canEdit}
          onPress={addEmptyItem}
          className={`rounded-xl px-4 py-3 ${canEdit ? "bg-secondary border-border/70 border" : "bg-muted"
            }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"
              }`}
          >
            + 添加条目
          </Text>
        </Pressable>
      ) : null}

      <SectionHeader title="待定区" />
      {unassignedItems.length ? (
        <View className="gap-2">
          {unassignedItems.slice(0, 20).map((it) => (
            <Card key={it.id ?? it.localKey} className="gap-1">
              <Text className="text-foreground font-semibold">{it.title || "未命名"}</Text>
              <Text className="text-muted-foreground text-xs">
                {formatRange(it.startsMinute, it.endsMinute)}
              </Text>
              <Pressable
                disabled={!canEdit || selectedDayIndex === null}
                onPress={() => moveUnassignedToDay(it)}
                className={`mt-2 rounded-xl border px-3 py-2 ${canEdit ? "bg-secondary border-border/70" : "bg-muted"
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"
                    }`}
                >
                  放到当前 Day
                </Text>
              </Pressable>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text className="text-muted-foreground text-sm">暂无待定地点。</Text>
        </Card>
      )}

      <Pressable
        disabled={!canEdit || savePlan.isPending}
        onPress={savePlanNow}
        className={`rounded-2xl px-4 py-3 ${!canEdit || savePlan.isPending ? "bg-muted" : "bg-primary"}`}
      >
        <Text
          className={`text-center text-base font-semibold ${!canEdit || savePlan.isPending ? "text-muted-foreground" : "text-primary-foreground"
            }`}
        >
          {savePlan.isPending ? "保存中..." : "保存并生成历史版本"}
        </Text>
      </Pressable>
    </View>
  );
}

