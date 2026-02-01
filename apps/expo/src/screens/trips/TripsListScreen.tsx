import { useLayoutEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "~/business/auth/hooks";
import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { trpc } from "~/utils/api";
import { nav } from "~/navigation/nav";

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

type Derived = "ongoing" | "upcoming" | "past";
function deriveStatus(trip: { startDate: string | null; endDate: string | null }): Derived {
  const today = isoToday();
  const s = trip.startDate;
  const e = trip.endDate;
  if (s && e) {
    if (s <= today && today <= e) return "ongoing";
    if (today < s) return "upcoming";
    return "past";
  }
  if (s && today < s) return "upcoming";
  return "upcoming";
}

export function TripsListScreen() {
  const navigation = useNavigation<any>();
  const { isAuthed, isLoading: sessionLoading } = useAuthSession();

  const { data: trips = [] } = useQuery(
    trpc.trip.list.queryOptions({ limit: 50 }, { enabled: isAuthed && !sessionLoading }),
  );

  const ongoing = trips.filter(
    (t) =>
      deriveStatus({ startDate: t.startDate ?? null, endDate: t.endDate ?? null }) === "ongoing",
  );
  const upcoming = trips.filter(
    (t) =>
      deriveStatus({ startDate: t.startDate ?? null, endDate: t.endDate ?? null }) === "upcoming",
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isAuthed ? (
          <Pressable
            onPress={() => navigation.navigate("TripNew")}
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
        <Text className="text-foreground text-xl font-semibold">从容地走在路上</Text>
        <Text className="text-muted-foreground text-sm">进行中行程优先展示，随时调整也不会慌。</Text>
        <View className="mt-3 flex flex-row gap-2">
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">{ongoing.length} 个进行中</Text>
          </View>
          <View className="bg-secondary border-border/70 rounded-full border px-3 py-1">
            <Text className="text-muted-foreground text-xs font-semibold">一键优化（占位）</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="正在进行中" />
      <View className="mb-6 gap-3">
        {!isAuthed ? (
          <EmptyState
            title="需要登录"
            description="登录后才能查看和管理你的行程。"
            actionLabel="去登录"
            onAction={() => nav.toLogin()}
          />
        ) : ongoing.length ? (
          ongoing.map((t) => (
            <Pressable key={t.id} onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}>
              <Card className="gap-2">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-foreground text-base font-semibold">{t.title}</Text>
                  <Badge variant="success">进行中</Badge>
                </View>
                <Text className="text-muted-foreground text-sm">
                  {(t.destination ?? "—")} · {t.startDate ?? "—"} - {t.endDate ?? "—"}
                </Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <EmptyState title="还没有进行中的行程" description="先创建一个行程，再把愿望罐子的地点慢慢装进去。" />
        )}
      </View>

      <SectionHeader title="即将开始" />
      <View className="gap-3">
        {isAuthed && upcoming.length ? (
          upcoming.map((t) => (
            <Pressable key={t.id} onPress={() => navigation.navigate("TripDetail", { tripId: t.id })}>
              <Card className="gap-1">
                <Text className="text-foreground text-base font-semibold">{t.title}</Text>
                <Text className="text-muted-foreground text-sm">
                  {(t.destination ?? "—")} · {t.startDate ?? "—"} - {t.endDate ?? "—"}
                </Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card>
            <Text className="text-muted-foreground text-sm">
              {isAuthed ? "暂无未来行程。" : "登录后查看你的未来行程。"}
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

