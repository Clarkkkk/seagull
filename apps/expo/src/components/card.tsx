import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";

type Props = PropsWithChildren<ViewProps>;

export function Card({ children, className, style, ...props }: Props) {
  return (
    <View
      className={[
        "bg-card/90 border-border/70 rounded-2xl border p-4 shadow-sm dark:bg-card/60",
        className,
      ].join(" ")}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

