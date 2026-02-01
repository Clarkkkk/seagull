import { createContext, useContext, type PropsWithChildren } from "react";

import { useAuthActions, useAuthSession } from "~/business/auth/hooks";

type SessionData = ReturnType<typeof useAuthSession>["session"];

type SessionValue = {
    signIn: () => void;
    signOut: () => Promise<void>;
    session: SessionData | null;
    isLoading: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
    const value = useContext(SessionContext);
    if (!value) {
        throw new Error("useSession must be used within SessionProvider");
    }

    return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
    const { session, isLoading } = useAuthSession();
    const { signOut } = useAuthActions();

    const signIn = () => {
        // Sign-in is handled by the (auth) routes.
    };

    return (
        <SessionContext.Provider
            value={{
                signIn,
                signOut,
                session,
                isLoading,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
}
