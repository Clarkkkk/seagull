import { Pressable, Text, View } from "react-native";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="bg-card/80 border-border/70 rounded-2xl border p-5 shadow-sm dark:bg-card/60">
      <View className="mb-3 flex flex-row items-center gap-2">
        <View className="h-2.5 w-2.5 rounded-full bg-primary/60" />
        <View className="h-1.5 w-14 rounded-full bg-primary/15" />
      </View>
      <Text className="text-foreground text-base font-semibold">{title}</Text>
      {description ? (
        <Text className="text-muted-foreground mt-2 text-sm">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="bg-primary/10 border-primary/15 mt-4 items-center rounded-md border px-3 py-2"
        >
          <Text className="text-primary text-sm font-semibold">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

