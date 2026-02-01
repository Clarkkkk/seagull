import { useState } from "react";
import { Pressable, Text, TextInput, View, useColorScheme } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { TripsStackParamList } from "~/navigation/types";
import { Card, Screen } from "~/components";
import { queryClient, trpc } from "~/utils/api";

type Props = NativeStackScreenProps<TripsStackParamList, "TripNew">;

export function TripNewScreen({ navigation }: Props) {
  const colorScheme = useColorScheme();
  const createTrip = useMutation(
    trpc.trip.create.mutationOptions({
      onSuccess: async (created) => {
        await queryClient.invalidateQueries(trpc.trip.list.queryFilter());
        navigation.replace("TripEdit", { tripId: created.id });
      },
    }),
  );

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <Screen>
      <View className="mb-4 gap-2 px-1">
        <View className="flex flex-row items-start justify-between">
          <View className="gap-1">
            <Text className="text-foreground text-xl font-semibold">新建行程</Text>
            <Text className="text-muted-foreground text-sm">先定下方向，再慢慢填充日程。</Text>
          </View>
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">Ocean mode</Text>
          </View>
        </View>
      </View>

      <Card className="gap-3 p-5">
        <Text className="text-foreground text-base font-semibold">基本信息</Text>

        <View className="gap-2">
          <Text className="text-muted-foreground text-sm">标题</Text>
          <View className="border-input bg-background/80 rounded-2xl border px-3 py-3">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="例如：关西冬日慢游"
              className="text-foreground text-base"
              placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-muted-foreground text-sm">目的地（可选）</Text>
          <View className="border-input bg-background/80 rounded-2xl border px-3 py-3">
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="例如：大阪 · 京都"
              className="text-foreground text-base"
              placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-muted-foreground text-sm">开始日期（可选，YYYY-MM-DD）</Text>
          <View className="border-input bg-background/80 rounded-2xl border px-3 py-3">
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-01-18"
              autoCapitalize="none"
              className="text-foreground text-base"
              placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-muted-foreground text-sm">结束日期（可选，YYYY-MM-DD）</Text>
          <View className="border-input bg-background/80 rounded-2xl border px-3 py-3">
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2026-01-24"
              autoCapitalize="none"
              className="text-foreground text-base"
              placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
            />
          </View>
        </View>

        <Pressable
          disabled={createTrip.isPending || !title.trim()}
          onPress={() =>
            createTrip.mutate({
              title: title.trim(),
              destination: destination.trim() ? destination.trim() : undefined,
              startDate: startDate.trim() ? startDate.trim() : undefined,
              endDate: endDate.trim() ? endDate.trim() : undefined,
            })
          }
          className={`rounded-2xl px-4 py-3 ${createTrip.isPending || !title.trim() ? "bg-muted" : "bg-primary"
            }`}
        >
          <Text
            className={`text-center text-base font-semibold ${createTrip.isPending || !title.trim() ? "text-muted-foreground" : "text-primary-foreground"
              }`}
          >
            {createTrip.isPending ? "创建中..." : "创建并编辑"}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

