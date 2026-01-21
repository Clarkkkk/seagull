import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { getTripById } from "~/mocks";

export default function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = tripId ? getTripById(tripId) : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: trip?.title ?? "行程详情" }} />

      {trip ? (
        <>
          <Card className="mb-6 gap-2">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-semibold">
                {trip.title}
              </Text>
              <Badge variant={trip.status === "ongoing" ? "success" : "muted"}>
                {trip.status === "ongoing"
                  ? "进行中"
                  : trip.status === "upcoming"
                    ? "即将开始"
                    : "已结束"}
              </Badge>
            </View>
            <Text className="text-muted-foreground text-sm">
              {trip.destination} · {trip.startDate} - {trip.endDate}
            </Text>
          </Card>

          <SectionHeader title="今日时间轴（占位）" />
          <View className="mb-6 gap-3">
            {(trip.days[0]?.activities ?? []).slice(0, 5).map((a) => (
              <Card key={a.id} className="gap-1">
                <Text className="text-foreground font-semibold">
                  {a.time} · {a.title}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {a.place ? `地点：${a.place}` : "地点：—"}
                  {a.note ? ` · ${a.note}` : ""}
                </Text>
              </Card>
            ))}
          </View>

          <SectionHeader title="地图（占位）" />
          <View className="bg-muted border-border rounded-xl border p-6">
            <Text className="text-muted-foreground text-sm">
              这里将展示路线/POI 标记/交通方式切换。当前为 mock 占位块。
            </Text>
          </View>
        </>
      ) : (
        <EmptyState title="找不到这个行程" description="可能是 mock 数据里不存在。" />
      )}
    </Screen>
  );
}

