import { useLayoutEffect } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { TripsStackParamList } from "~/navigation/types";
import { useAuthSession } from "~/business/auth/hooks";
import { Card, EmptyState, Screen, SectionHeader } from "~/components";
import { trpc } from "~/utils/api";

type Props = NativeStackScreenProps<TripsStackParamList, "TripSnapshotDetail">;

export function TripSnapshotDetailScreen({ navigation, route }: Props) {
  const { tripId, version } = route.params;
  const { isAuthed, isLoading: sessionLoading } = useAuthSession();

  const v = Number(version ?? "0");

  const { data } = useQuery(
    trpc.trip.snapshots.get.queryOptions(
      { tripId: tripId ?? "", version: Number.isFinite(v) ? v : 0 },
      { enabled: isAuthed && !!tripId && Number.isFinite(v) && v > 0 && !sessionLoading },
    ),
  );

  const plan = (data?.data ?? null) as any;

  useLayoutEffect(() => {
    navigation.setOptions({ title: `版本 v${version ?? ""}` });
  }, [navigation, version]);

  const formatMinute = (m: number) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  const formatRange = (s: number | null | undefined, e: number | null | undefined) => {
    if (s === null || s === undefined || e === null || e === undefined) return "—";
    return `${formatMinute(Number(s))}-${formatMinute(Number(e))}`;
  };

  return (
    <Screen>
      {!isAuthed ? (
        <EmptyState title="需要登录" description="登录后才能查看历史版本。" />
      ) : !data ? (
        <EmptyState title="找不到该版本" description="版本不存在或你没有权限访问。" />
      ) : (
        <>
          <Card className="mb-4 gap-1">
            <Text className="text-foreground font-semibold">v{data.version}</Text>
            <Text className="text-muted-foreground text-sm">
              {data.createdAt instanceof Date ? data.createdAt.toLocaleString() : String(data.createdAt)}
              {data.createdBy ? ` · ${data.createdBy}` : ""}
            </Text>
          </Card>

          <SectionHeader title="按天预览" />
          <View className="gap-3">
            {(plan?.days ?? []).map((d: any) => (
              <Card key={d.id ?? `${d.dayIndex}`} className="gap-2">
                <Text className="text-foreground font-semibold">
                  Day {Number(d.dayIndex ?? 0) + 1} · {d.date ?? ""}
                </Text>
                <View className="gap-2">
                  {(d.items ?? []).slice(0, 6).map((it: any) => (
                    <Text key={it.id ?? `${it.order}`} className="text-muted-foreground text-sm">
                      {formatRange(it.startsMinute, it.endsMinute)} · {it.title ?? ""}
                    </Text>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

