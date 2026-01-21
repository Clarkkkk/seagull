import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { getJarById } from "~/mocks";

export default function JarDetailScreen() {
  const { jarId } = useLocalSearchParams<{ jarId: string }>();
  const jar = jarId ? getJarById(jarId) : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: jar?.title ?? "罐子" }} />

      {jar ? (
        <>
          <Card className="mb-6 gap-2">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-semibold">
                {jar.title}
              </Text>
              <Badge variant={jar.status === "active" ? "success" : "muted"}>
                {jar.status === "active" ? "进行中" : "已归档"}
              </Badge>
            </View>
            <Text className="text-muted-foreground text-sm">
              {jar.country}
              {jar.region ? ` · ${jar.region}` : ""}
              {jar.city ? ` · ${jar.city}` : ""}
            </Text>
            <Text className="text-muted-foreground text-sm">
              条目数：{jar.itemCount}（mock 占位）
            </Text>
          </Card>

          <SectionHeader title="条目" />
          <EmptyState
            title="条目列表占位"
            description="后续会在这里展示景点/餐厅/笔记，并支持一键加入行程与排序。"
          />
        </>
      ) : (
        <EmptyState title="找不到这个罐子" description="可能是 mock 数据里不存在。" />
      )}
    </Screen>
  );
}

