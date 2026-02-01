import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AuthStackParamList } from "~/navigation/types";
import { useAuthActions } from "~/business/auth/hooks";
import { Card, Screen } from "~/components";

function isValidEmail(email: string) {
  // Simple practical check (not exhaustive RFC validation)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { sendLoginOtp } = useAuthActions();

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSend = normalizedEmail.length > 3 && isValidEmail(normalizedEmail);

  const send = async () => {
    if (!canSend || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      await sendLoginOtp(normalizedEmail);
      navigation.navigate("Verify", { email: normalizedEmail });
    } catch (e: any) {
      setError(e?.message ?? "发送验证码失败");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center">
        <Card className="gap-4 p-5">
          <View className="gap-3">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <View className="bg-primary/10 border-primary/15 rounded-2xl border p-2">
                  <Ionicons name="mail-outline" size={18} color="#1E88E5" />
                </View>
                <View>
                  <Text className="text-foreground text-xl font-semibold">登录 / 注册</Text>
                  <Text className="text-muted-foreground text-sm">轻松开始你的旅程</Text>
                </View>
              </View>
              <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
                <Text className="text-primary text-xs font-semibold">Ocean mode</Text>
              </View>
            </View>

            <Text className="text-muted-foreground text-sm">
              输入邮箱，我们会发送 6 位验证码。未注册邮箱会自动创建账号。
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">邮箱</Text>
            <View className="border-input bg-background/80 flex flex-row items-center gap-2 rounded-2xl border px-3 py-3">
              <Ionicons
                name="at-outline"
                size={18}
                color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                className="text-foreground flex-1 text-base"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
                returnKeyType="send"
                onSubmitEditing={send}
              />
            </View>
            <Text className="text-muted-foreground text-xs">
              我们只会把验证码发送到你的邮箱，不会向你推送垃圾信息。
            </Text>
          </View>

          {error ? (
            <View className="bg-destructive/10 border-destructive/20 rounded-2xl border px-3 py-2">
              <Text className="text-destructive text-sm font-medium">{error}</Text>
            </View>
          ) : null}

          <Pressable
            className={[
              "rounded-2xl px-4 py-3 shadow-sm",
              canSend && !isSending ? "bg-primary" : "bg-muted",
            ].join(" ")}
            disabled={!canSend || isSending}
            onPress={send}
          >
            <Text
              className={[
                "text-center font-semibold",
                canSend && !isSending ? "text-primary-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {isSending ? "发送中..." : "发送验证码"}
            </Text>
          </Pressable>

          <Text className="text-muted-foreground text-center text-xs">
            继续即表示你同意我们的服务条款与隐私政策（占位）。
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

