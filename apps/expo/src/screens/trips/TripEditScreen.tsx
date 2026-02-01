import { useLayoutEffect } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { TripsStackParamList } from "~/navigation/types";
import { Card, EmptyState, Screen } from "~/components";
import { useTripEditBusiness } from "~/business/trip/edit/hooks";
import { useTripEditItems } from "~/business/trip/edit/items/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";
import type { EditItem } from "~/business/trip/edit/types";

import { TripEditFooter } from "./edit/components/TripEditFooter";
import { TripEditHeader } from "./edit/components/TripEditHeader";
import { TripEditItemCard } from "./edit/components/TripEditItemCard";
import { TripEditJarPicker } from "./edit/components/TripEditJarPicker";
import { TripEditTimePicker } from "./edit/components/TripEditTimePicker";

type Props = NativeStackScreenProps<TripsStackParamList, "TripEdit">;

export function TripEditScreen({ navigation, route }: Props) {
  const tripId = route.params.tripId;

  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const placeholderTextColor = colorScheme === "dark" ? "#64748B" : "#94A3B8";

  const { data, isAuthed, userId, lockInfo, errorMessage } = useTripEditBusiness(tripId ?? null);
  const canEdit = useTripEditStore((state) => state.canEdit);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const {
    selectedItems,
    openTimePicker,
    updateItemTitle,
    updateItemNote,
    removeItem,
    moveItemToUnassigned,
    reorderSelectedItems,
  } = useTripEditItems();

  useLayoutEffect(() => {
    if (!data?.trip) {
      navigation.setOptions({ title: "编辑行程" });
      return;
    }
    navigation.setOptions({ title: `编辑：${data.trip.title}` });
  }, [data?.trip, navigation]);

  if (!isAuthed) {
    return (
      <Screen>
        <EmptyState title="需要登录" description="登录后才能编辑行程。" />
      </Screen>
    );
  }

  if (!data?.trip) {
    return (
      <Screen>
        <EmptyState title="找不到这个行程" description="行程不存在或你没有权限访问。" />
      </Screen>
    );
  }

  const listHeader = <TripEditHeader />;
  const listFooter = <TripEditFooter />;
  const listEmpty = (
    <View className="gap-3">
      {listHeader}
      {listFooter}
    </View>
  );

  return (
    <Screen scroll={false}>
      <View className="mb-4 gap-2 px-1">
        <View className="flex flex-row items-start justify-between">
          <View className="gap-1">
            <Text className="text-foreground text-xl font-semibold">编辑行程</Text>
            <Text className="text-muted-foreground text-sm">把愿望慢慢排进日程里。</Text>
          </View>
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">Ocean mode</Text>
          </View>
        </View>
      </View>

      {errorMessage ? (
        <Card className="mb-4 gap-1">
          <Text className="text-foreground font-semibold">保存失败</Text>
          <Text className="text-muted-foreground text-sm">{errorMessage}</Text>
        </Card>
      ) : null}

      {!canEdit ? (
        <Card className="mb-4 gap-2">
          <Text className="text-foreground font-semibold">只读模式</Text>
          <Text className="text-muted-foreground text-sm">
            {lockInfo && !lockInfo.isExpired
              ? `当前由 ${lockInfo.userId === userId ? "你" : lockInfo.userId} 编辑中，暂时无法编辑。`
              : "暂时无法获取编辑锁，请稍后再试。"}
          </Text>
        </Card>
      ) : (
        <Card className="mb-4 gap-1">
          <Text className="text-foreground font-semibold">可编辑</Text>
          <Text className="text-muted-foreground text-sm">你已获取编辑锁，保存时会生成历史版本。</Text>
        </Card>
      )}

      <View style={{ flex: 1 }}>
        <DraggableFlatList
          data={selectedDayIndex === null ? [] : selectedItems}
          keyExtractor={(item) => item.id ?? item.localKey}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 + 24 + insets.bottom + 56 }}
          onDragEnd={({ data: next }) => reorderSelectedItems(next)}
          renderItem={({ item, drag, isActive }: RenderItemParams<EditItem>) => (
            <TripEditItemCard
              item={item}
              isActive={isActive}
              placeholderTextColor={placeholderTextColor}
              onTimePress={() => openTimePicker(item.localKey)}
              onTitleChange={(v) => updateItemTitle(item.localKey, v)}
              onNoteChange={(v) => updateItemNote(item.localKey, v)}
              onMoveToUnassigned={() => moveItemToUnassigned(item)}
              onDelete={() => removeItem(item.localKey)}
              onDrag={drag}
            />
          )}
          ListHeaderComponent={selectedItems.length ? listHeader : undefined}
          ListFooterComponent={selectedItems.length ? listFooter : undefined}
          ListEmptyComponent={listEmpty}
        />
      </View>
      <TripEditJarPicker />
      <TripEditTimePicker />
    </Screen>
  );
}

