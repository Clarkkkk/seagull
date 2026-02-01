import { Pressable, Text, TextInput, View } from "react-native";

import type { EditItem } from "~/business/trip/edit/types";
import { formatRange } from "~/business/trip/edit/utils";
import { useTripEditStore } from "~/business/trip/edit/store";
import { Card } from "~/components";

interface TripEditItemCardProps {
  item: EditItem;
  isActive: boolean;
  placeholderTextColor: string;
  onTimePress: () => void;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onMoveToUnassigned: () => void;
  onDelete: () => void;
  onDrag: () => void;
}

export function TripEditItemCard({
  item,
  isActive,
  placeholderTextColor,
  onTimePress,
  onTitleChange,
  onNoteChange,
  onMoveToUnassigned,
  onDelete,
  onDrag,
}: TripEditItemCardProps) {
  const canEdit = useTripEditStore((state) => state.canEdit);

  return (
    <Pressable onLongPress={onDrag} disabled={!canEdit}>
      <Card className={`gap-2 ${isActive ? "opacity-80" : ""}`}>
        <View className="flex flex-row items-center gap-2">
          <Pressable disabled={!canEdit} onPress={onTimePress}>
            <View className="bg-muted border-border rounded-2xl border px-3 py-2">
              <Text className="text-muted-foreground text-xs font-semibold">
                {formatRange(item.startsMinute, item.endsMinute)}
              </Text>
            </View>
          </Pressable>

          <View className="border-input bg-background/80 flex-1 rounded-2xl border px-3 py-2">
            <TextInput
              editable={canEdit}
              value={item.title}
              onChangeText={onTitleChange}
              placeholder="标题"
              className="text-foreground text-sm"
              placeholderTextColor={placeholderTextColor}
            />
          </View>
        </View>

        <View className="border-input bg-background/80 rounded-2xl border px-3 py-2">
          <TextInput
            editable={canEdit}
            value={item.note ?? ""}
            onChangeText={onNoteChange}
            placeholder="备注（可选）"
            multiline
            className="text-foreground text-sm"
            placeholderTextColor={placeholderTextColor}
          />
        </View>

        <View className="flex flex-row gap-2">
          <Pressable
            disabled={!canEdit}
            onPress={onMoveToUnassigned}
            className={`rounded-xl border px-3 py-2 ${canEdit ? "bg-secondary border-border/70" : "bg-muted"}`}
          >
            <Text
              className={`text-xs font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"}`}
            >
              放入待定区
            </Text>
          </Pressable>
          <Pressable
            disabled={!canEdit}
            onPress={onDelete}
            className={`rounded-xl border px-3 py-2 ${canEdit ? "bg-secondary border-border/70" : "bg-muted"}`}
          >
            <Text
              className={`text-xs font-semibold ${canEdit ? "text-foreground" : "text-muted-foreground"}`}
            >
              删除
            </Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

