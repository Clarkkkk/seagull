import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { getActiveJars } from "~/mocks";

export default function WishlistScreen() {
  const jars = getActiveJars();

  return (
    <Screen>
      <Stack.Screen options={{ title: "愿望罐子" }} />

      <Card className="mb-6 gap-1 p-5">
        <Text className="text-foreground text-xl font-semibold">
          轻松收集灵感
        </Text>
        <Text className="text-muted-foreground text-sm">
          把景点、餐厅、链接都先放进来，等时间合适再组装行程。
        </Text>
        <View className="mt-3 flex flex-row gap-2">
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">
              {jars.length} 个进行中
            </Text>
          </View>
          <View className="bg-secondary border-border/70 rounded-full border px-3 py-1">
            <Text className="text-muted-foreground text-xs font-semibold">
              支持智能解析（占位）
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="正在收集" />

      {jars.length ? (
        <View className="gap-3">
          {jars.map((j) => (
            <Link
              key={j.id}
              href={{ pathname: "/wishlist/[jarId]", params: { jarId: j.id } }}
              asChild
            >
              <Pressable>
                <Card className="gap-2">
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-foreground text-base font-semibold">
                      {j.title}
                    </Text>
                    <Badge variant="success">进行中</Badge>
                  </View>
                  <Text className="text-muted-foreground text-sm">
                    {j.country}
                    {j.region ? ` · ${j.region}` : ""}
                    {j.city ? ` · ${j.city}` : ""} · {j.itemCount} 条
                  </Text>
                </Card>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : (
        <EmptyState
          title="还没有愿望罐子"
          description="先从一个目的地开始：把看到的景点、餐厅、链接都放进来。"
        />
      )}
    </Screen>
  );
}

