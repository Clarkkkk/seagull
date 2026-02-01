import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useSession } from "./session-context";

SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
    const { isLoading } = useSession();

    useEffect(() => {
        if (!isLoading) {
            void SplashScreen.hideAsync();
        }
    }, [isLoading]);

    return null;
}
