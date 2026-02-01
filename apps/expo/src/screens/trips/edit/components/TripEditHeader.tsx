import { Pressable, Text, TextInput, View, useColorScheme } from "react-native";

import { useTripEditDays } from "~/business/trip/edit/days/hooks";
import { useTripEditItems } from "~/business/trip/edit/items/hooks";
import { useTripEditMeta } from "~/business/trip/edit/meta/hooks";
import { useTripEditPlan } from "~/business/trip/edit/plan/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";
import { Card, EmptyState, SectionHeader } from "~/components";

export function TripEditHeader() {
  const colorScheme = useColorScheme();
  const placeholderTextColor = colorScheme === "dark" ? "#64748B" : "#94A3B8";
  const metaStartDate = useTripEditStore((state) => state.metaStartDate);
  const metaEndDate = useTripEditStore((state) => state.metaEndDate);
  const setMetaStartDate = useTripEditStore((state) => state.setMetaStartDate);
  const setMetaEndDate = useTripEditStore((state) => state.setMetaEndDate);
  const canEdit = useTripEditStore((state) => state.canEdit);
  const setShowJarPicker = useTripEditStore((state) => state.setShowJarPicker);
  const { updateMetaRange, updateMeta } = useTripEditMeta();
  const { optimizePlanNow, optimizePlan } = useTripEditPlan();
  const { openMapPicker } = useTripEditItems();
  const { days, selectedDayIndex, setSelectedDayIndex, addDay } = useTripEditDays();

  return (
    <View className="gap-3">
      <Card className="gap-3 p-5">
        <Text className="text-foreground text-base font-semibold">日期范围（可选）</Text>
        <Text className="text-muted-foreground text-sm">
          v1 简化：输入 YYYY-MM-DD，点“更新日期范围”。{"\n"}未填写时可用虚拟 Day 规划。
        </Text>

        <View className="gap-2">
          <Text className="text-muted-foreground text-sm">开始日期</Text>
          <View className="border-input bg-background/80 rounded-2xl border px-3 py-3">
            <TextInput
              editable={canEdit}
              value={metaStartDate}
              onChangeText={setMetaStartDate}
              placeholder="2026-01-18"
              autoCapitalize="none"
              className="text-foreground text-base"
              placeholderTextColor={placeholderTextColor}
            />
          </View>
        </View>
        <View className="gap-2">
          <Text className="text-muted-foreground text-sm">结束日期</Text>
          <View className="border-input bg-background/80 rounded-2xl border px-3 py-3">
            <TextInput
              editable={canEdit}
              value={metaEndDate}
              onChangeText={setMetaEndDate}
              placeholder="2026-01-24"
              autoCapitalize="none"
              className="text-foreground text-base"
              placeholderTextColor={placeholderTextColor}
            />
          </View>
        </View>

        <Pressable
          disabled={!canEdit || updateMeta.isPending}
          onPress={() => updateMetaRange(metaStartDate, metaEndDate)}
          className={`rounded-2xl px-4 py-3 ${!canEdit || updateMeta.isPending ? "bg-muted" : "bg-secondary border border-border/70"
            }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${!canEdit || updateMeta.isPending ? "text-muted-foreground" : "text-foreground"
              }`}
          >
            {updateMeta.isPending ? "更新中..." : "更新日期范围"}
          </Text>
        </Pressable>
      </Card>

      <SectionHeader title="选择 Day" />
      <View className="flex flex-row flex-wrap gap-2">
        {days.map((d) => (
          <Pressable
            key={d.dayIndex}
            onPress={() => setSelectedDayIndex(d.dayIndex)}
            className={`rounded-full border px-3 py-1 ${selectedDayIndex === d.dayIndex
                ? "bg-primary/10 border-primary/15"
                : "bg-secondary border-border/70"
              }`}
          >
            <Text
              className={`${selectedDayIndex === d.dayIndex ? "text-primary" : "text-muted-foreground"
                } text-xs font-semibold`}
            >
              Day {d.dayIndex + 1}
              {d.date ? ` · ${d.date}` : ""}
            </Text>
          </Pressable>
        ))}
        <Pressable
          disabled={!canEdit}
          onPress={addDay}
          className={`rounded-full border px-3 py-1 ${canEdit ? "bg-secondary border-border/70" : "bg-muted"}`}
        >
          <Text className={`text-xs font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"}`}>
            + Day
          </Text>
        </Pressable>
      </View>

      <View className="flex flex-row flex-wrap gap-2">
        <Pressable
          disabled={!canEdit}
          onPress={() => setShowJarPicker(true)}
          className={`rounded-xl border px-3 py-2 ${canEdit ? "bg-secondary border-border/70" : "bg-muted"}`}
        >
          <Text className={`text-sm font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"}`}>
            从愿望罐子加入
          </Text>
        </Pressable>
        <Pressable
          disabled={!canEdit}
          onPress={openMapPicker}
          className={`rounded-xl border px-3 py-2 ${canEdit ? "bg-secondary border-border/70" : "bg-muted"}`}
        >
          <Text className={`text-sm font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"}`}>
            地图选点加入
          </Text>
        </Pressable>
        <Pressable
          disabled={!canEdit || optimizePlan.isPending}
          onPress={optimizePlanNow}
          className={`rounded-xl px-3 py-2 ${!canEdit || optimizePlan.isPending ? "bg-muted" : "bg-primary/10 border border-primary/15"}`}
        >
          <Text className={`text-sm font-semibold ${!canEdit || optimizePlan.isPending ? "text-muted-foreground" : "text-primary"}`}>
            {optimizePlan.isPending ? "规划中..." : "智能规划"}
          </Text>
        </Pressable>
      </View>

      {selectedDayIndex === null ? (
        <EmptyState title="请选择一个 Day" description="选择一个 Day 后才能编辑当天条目。" />
      ) : null}
    </View>
  );
}

