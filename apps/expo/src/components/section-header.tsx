import { Pressable, Text, View } from "react-native";

export function SectionHeader({
  title,
  actionText,
  onAction,
}: {
  title: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-4 flex flex-row items-center justify-between">
      <View className="flex flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full bg-primary/60" />
        <View className="h-1.5 w-10 rounded-full bg-primary/15" />
        <Text className="text-foreground text-lg font-semibold">{title}</Text>
      </View>
      {onAction && actionText ? (
        <Pressable
          onPress={onAction}
          className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1"
        >
          <Text className="text-primary text-sm font-semibold">{actionText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

