import { useLayoutEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { TripsStackParamList } from "~/navigation/types";
import { useAuthSession } from "~/business/auth/hooks";
import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";
import { trpc } from "~/utils/api";

type Props = NativeStackScreenProps<TripsStackParamList, "TripDetail">;

export function TripDetailScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { isAuthed, userId, isLoading: sessionLoading } = useAuthSession();

  const { data } = useQuery(
    trpc.trip.getById.queryOptions(
      { id: tripId ?? "" },
      { enabled: isAuthed && !!tripId && !sessionLoading },
    ),
  );

  const trip = data?.trip;
  const plan = data?.plan;
  const lock = data?.lock;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: trip?.title ?? "行程详情",
      headerRight: () =>
        trip ? (
          <View className="flex flex-row gap-2">
            <Pressable
              onPress={() => navigation.navigate("TripSnapshots", { tripId: trip.id })}
              className="bg-secondary border-border/70 rounded-full border px-3 py-1"
            >
              <Text className="text-muted-foreground text-sm font-semibold">历史</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("TripEdit", { tripId: trip.id })}
              className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1"
            >
              <Text className="text-primary text-sm font-semibold">编辑</Text>
            </Pressable>
          </View>
        ) : null,
    });
  }, [navigation, trip]);

  const formatMinute = (m: number) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  const formatRange = (s: number | null, e: number | null) => {
    if (s === null || e === null) return "—";
    return `${formatMinute(s)}-${formatMinute(e)}`;
  };

  return (
    <Screen>
      {!isAuthed ? (
        <EmptyState title="需要登录" description="登录后才能查看这个行程。" />
      ) : trip && plan ? (
        <>
          <Card className="mb-6 gap-2">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-semibold">{trip.title}</Text>
              <Badge variant={trip.status === "active" ? "success" : "muted"}>
                {trip.status === "active"
                  ? "进行中"
                  : trip.status === "planning"
                    ? "规划中"
                    : trip.status === "completed"
                      ? "已结束"
                      : "已归档"}
              </Badge>
            </View>
            <Text className="text-muted-foreground text-sm">
              {(trip.destination ?? "—")} · {trip.startDate ?? "—"} - {trip.endDate ?? "—"}
            </Text>
            {lock ? (
              <View className="mt-2">
                <Text className="text-muted-foreground text-xs">
                  {lock.isExpired ? "编辑锁已过期" : `当前由 ${lock.userId === userId ? "你" : lock.userId} 编辑中`}
                </Text>
              </View>
            ) : null}
          </Card>

          <SectionHeader title="时间轴" />
          <View className="mb-6 gap-3">
            {(plan.days[0]?.items ?? []).slice(0, 8).map((a) => (
              <Card key={a.id} className="gap-1">
                <Text className="text-foreground font-semibold">
                  {formatRange(a.startsMinute ?? null, a.endsMinute ?? null)} · {a.title}
                </Text>
                <Text className="text-muted-foreground text-sm">{a.note ? a.note : "—"}</Text>
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
        <EmptyState title="找不到这个行程" description="行程不存在或你没有权限访问。" />
      )}
    </Screen>
  );
}

