import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { TripsStackParamList } from "~/navigation/types";
import { useAuthSession } from "~/business/auth/hooks";
import { Card, EmptyState, Screen, SectionHeader } from "~/components";
import { trpc } from "~/utils/api";

type Props = NativeStackScreenProps<TripsStackParamList, "TripSnapshots">;

export function TripSnapshotsListScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { isAuthed, isLoading: sessionLoading } = useAuthSession();

  const { data: snaps = [] } = useQuery(
    trpc.trip.snapshots.list.queryOptions(
      { tripId: tripId ?? "", limit: 50 },
      { enabled: isAuthed && !!tripId && !sessionLoading },
    ),
  );

  return (
    <Screen>
      {!isAuthed ? (
        <EmptyState title="需要登录" description="登录后才能查看历史版本。" />
      ) : snaps.length ? (
        <>
          <SectionHeader title="最近保存" />
          <View className="gap-3">
            {snaps.map((s) => (
              <Pressable
                key={s.id}
                onPress={() =>
                  navigation.navigate("TripSnapshotDetail", {
                    tripId: s.tripId,
                    version: String(s.version),
                  })
                }
              >
                <Card className="gap-1">
                  <Text className="text-foreground font-semibold">v{s.version}</Text>
                  <Text className="text-muted-foreground text-sm">
                    {s.createdAt instanceof Date ? s.createdAt.toLocaleString() : String(s.createdAt)}
                    {s.createdBy ? ` · ${s.createdBy}` : ""}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <EmptyState title="还没有历史版本" description="保存一次行程后，这里会出现版本记录。" />
      )}
    </Screen>
  );
}

