import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function SectionHeader({
  title,
  actionText,
  href,
}: {
  title: string;
  actionText?: string;
  href?: Href;
}) {
  return (
    <View className="mb-4 flex flex-row items-center justify-between">
      <View className="flex flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full bg-primary/60" />
        <View className="h-1.5 w-10 rounded-full bg-primary/15" />
        <Text className="text-foreground text-lg font-semibold">{title}</Text>
      </View>
      {href && actionText ? (
        <Link href={href} asChild>
          <Pressable className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-sm font-semibold">
              {actionText}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

