import { useLayoutEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useWishlistList } from "~/business/wishlist/list/hooks";
import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { nav } from "~/navigation/nav";

export function WishlistListScreen() {
  const navigation = useNavigation<any>();
  const { jars, isAuthed } = useWishlistList();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isAuthed ? (
          <Pressable
            onPress={() => navigation.navigate("WishlistNew")}
            className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1"
          >
            <Text className="text-primary text-sm font-semibold">新建</Text>
          </Pressable>
        ) : null,
    });
  }, [isAuthed, navigation]);

  return (
    <Screen>
      <Card className="mb-6 gap-1 p-5">
        <Text className="text-foreground text-xl font-semibold">轻松收集灵感</Text>
        <Text className="text-muted-foreground text-sm">
          把景点、餐厅、链接都先放进来，等时间合适再组装行程。
        </Text>
        <View className="mt-3 flex flex-row gap-2">
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">{jars.length} 个罐子</Text>
          </View>
          <View className="bg-secondary border-border/70 rounded-full border px-3 py-1">
            <Text className="text-muted-foreground text-xs font-semibold">支持智能解析（占位）</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="正在收集" />

      {!isAuthed ? (
        <EmptyState
          title="需要登录"
          description="登录后才能查看和管理你的愿望罐子。"
          actionLabel="去登录"
          onAction={() => nav.toLogin()}
        />
      ) : jars.length ? (
        <View className="gap-3">
          {jars.map((j) => (
            <Pressable
              key={j.id}
              onPress={() => navigation.navigate("WishlistDetail", { jarId: j.id })}
            >
              <Card className="gap-2">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-foreground text-base font-semibold">{j.name}</Text>
                  <Badge variant={j.status === "in_trip" ? "success" : "muted"}>
                    {j.status === "in_trip" ? "行程中" : "未活跃"}
                  </Badge>
                </View>
                <Text className="text-muted-foreground text-sm">
                  {j.country}
                  {j.province ? ` · ${j.province}` : ""}
                  {j.city ? ` · ${j.city}` : ""}
                </Text>
              </Card>
            </Pressable>
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

