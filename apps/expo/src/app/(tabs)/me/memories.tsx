import { Stack } from "expo-router";
import { Text, View } from "react-native";

import { Card, EmptyState, Screen, SectionHeader } from "~/components";
import { memoriesMock } from "~/mocks";

export default function MemoriesScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: "回忆" }} />

      <SectionHeader title="回忆列表（占位）" />
      <View className="gap-3">
        {memoriesMock.length ? (
          memoriesMock.map((m) => (
            <Card key={m.id} className="gap-1">
              <Text className="text-foreground text-base font-semibold">
                {m.title}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {m.date} · {m.summary}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="还没有回忆"
            description="占位：后续会支持从行程/打卡/照片一键生成游记与回忆。"
          />
        )}
      </View>
    </Screen>
  );
}

