import type { TextProps } from "react-native";
import { Text, View } from "react-native";

export function Badge({
  children,
  variant = "default",
  className,
  ...props
}: TextProps & {
  variant?: "default" | "success" | "muted";
  className?: string;
}) {
  const styles =
    variant === "success"
      ? "bg-primary/10 border-primary/20 text-primary"
      : variant === "muted"
        ? "bg-muted border-border text-muted-foreground"
        : "bg-secondary border-border text-foreground";

  return (
    <View className={["rounded-full border px-2 py-1", styles].join(" ")}>
      <Text className={["text-xs font-medium", className].join(" ")} {...props}>
        {children}
      </Text>
    </View>
  );
}

