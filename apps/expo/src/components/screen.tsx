import type { PropsWithChildren } from "react";
import type { ScrollViewProps, ViewProps, ViewStyle } from "react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import clsx from "clsx";

import { OceanBackdrop } from "./ocean-backdrop";

type Props = PropsWithChildren<
  {
    scroll?: boolean;
    contentContainerClassName?: string;
    contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
    style?: ViewStyle;
    tone?: "ocean" | "plain";
  } & ViewProps &
  Pick<ScrollViewProps, "refreshControl">
>;

export function Screen({
  scroll = true,
  children,
  className,
  contentContainerClassName,
  contentContainerStyle,
  refreshControl,
  style,
  tone = "ocean",
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();
  // Avoid content being hidden behind the tab bar + home indicator.
  // This is a pragmatic default for tab screens; stack-only screens can override via `contentContainerStyle`.
  const defaultBottomPadding = 16 + 24 + insets.bottom + 56;

  if (!scroll) {
    return (
      <View
        style={[{ flex: 1 }, style]}
        className={clsx("bg-background", className)}
      >
        {tone === "ocean" ? <OceanBackdrop /> : null}
        <View style={{ flex: 1, padding: 16, paddingBottom: defaultBottomPadding }} {...rest}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[{ flex: 1 }, style]}
      className={clsx("bg-background", className)}
    >
      {tone === "ocean" ? <OceanBackdrop /> : null}
      <ScrollView
        style={{ flex: 1, height: "100%" }}
        className="flex-1"
        // On iOS, let the system adjust for navigation bars/safe areas so content isn't visually "cut".
        // contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName={clsx("p-0", contentContainerClassName)}
        contentContainerStyle={[
          { padding: 16, paddingBottom: defaultBottomPadding },
          contentContainerStyle,
        ]}
        refreshControl={refreshControl}
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
}

