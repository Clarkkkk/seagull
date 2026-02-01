import { createNavigationContainerRef, StackActions } from "@react-navigation/native";

import type { RootStackParamList } from "./types";
import type { PickLocationParams } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function runWhenReady(fn: () => void) {
  if (!navigationRef.isReady()) return;
  fn();
}

export const nav = {
  back() {
    runWhenReady(() => {
      if (navigationRef.canGoBack()) navigationRef.goBack();
    });
  },

  openPickLocation(params: PickLocationParams) {
    runWhenReady(() => {
      navigationRef.navigate("PickLocation", params);
    });
  },

  replaceToTripEdit(tripId: string) {
    runWhenReady(() => {
      navigationRef.dispatch(
        StackActions.replace("AppTabs", {
          screen: "TripsTab",
          params: { screen: "TripEdit", params: { tripId } },
        }),
      );
    });
  },

  replaceToWishlistDetail(jarId: string) {
    runWhenReady(() => {
      navigationRef.dispatch(
        StackActions.replace("AppTabs", {
          screen: "WishlistTab",
          params: { screen: "WishlistDetail", params: { jarId } },
        }),
      );
    });
  },

  toLogin(email?: string) {
    runWhenReady(() => {
      navigationRef.navigate("AuthStack", {
        screen: "Login",
      });
      if (email) {
        navigationRef.navigate("AuthStack", {
          screen: "Verify",
          params: { email },
        });
      }
    });
  },
};

