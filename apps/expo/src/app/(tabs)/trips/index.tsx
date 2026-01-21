import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { getOngoingTrips, getUpcomingTrips } from "~/mocks";

export default function TripsScreen() {
  const ongoing = getOngoingTrips();
  const upcoming = getUpcomingTrips();

  return (
    <Screen>
      <Stack.Screen options={{ title: "行程" }} />

      <Card className="mb-6 gap-1 p-5">
        <Text className="text-foreground text-xl font-semibold">
          从容地走在路上
        </Text>
        <Text className="text-muted-foreground text-sm">
          进行中行程优先展示，随时调整也不会慌。
        </Text>
        <View className="mt-3 flex flex-row gap-2">
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">
              {ongoing.length} 个进行中
            </Text>
          </View>
          <View className="bg-secondary border-border/70 rounded-full border px-3 py-1">
            <Text className="text-muted-foreground text-xs font-semibold">
              一键优化（占位）
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="正在进行中" />
      <View className="mb-6 gap-3">
        {ongoing.length ? (
          ongoing.map((t) => (
            <Link
              key={t.id}
              href={{ pathname: "/trips/[tripId]", params: { tripId: t.id } }}
              asChild
            >
              <Pressable>
                <Card className="gap-2">
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-foreground text-base font-semibold">
                      {t.title}
                    </Text>
                    <Badge variant="success">进行中</Badge>
                  </View>
                  <Text className="text-muted-foreground text-sm">
                    {t.destination} · {t.startDate} - {t.endDate}
                  </Text>
                </Card>
              </Pressable>
            </Link>
          ))
        ) : (
          <EmptyState
            title="还没有进行中的行程"
            description="占位：后续这里会展示“从愿望罐子一键生成行程”的入口。"
          />
        )}
      </View>

      <SectionHeader title="即将开始" />
      <View className="gap-3">
        {upcoming.length ? (
          upcoming.map((t) => (
            <Link
              key={t.id}
              href={{ pathname: "/trips/[tripId]", params: { tripId: t.id } }}
              asChild
            >
              <Pressable>
                <Card className="gap-1">
                  <Text className="text-foreground text-base font-semibold">
                    {t.title}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {t.destination} · {t.startDate} - {t.endDate}
                  </Text>
                </Card>
              </Pressable>
            </Link>
          ))
        ) : (
          <Card>
            <Text className="text-muted-foreground text-sm">
              暂无未来行程（mock 占位）。
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

