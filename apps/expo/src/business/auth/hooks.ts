import { useCallback } from "react";

import { authClient } from "~/utils/auth";

type AuthSession = ReturnType<typeof authClient.useSession>["data"];
type AuthUser = NonNullable<AuthSession>["user"];

export function useAuthSession() {
  const { data: session, isPending: isLoading } = authClient.useSession();
  const user = session?.user ?? null;

  return {
    session: session ?? null,
    user,
    userId: user?.id ?? null,
    isAuthed: !!user,
    isLoading,
  };
}

export function useAuthActions() {
  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const sendLoginOtp = useCallback(async (email: string) => {
    await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  }, []);

  const verifyLoginOtp = useCallback(async (email: string, otp: string) => {
    await authClient.signIn.emailOtp({ email, otp });
  }, []);

  return {
    signOut,
    sendLoginOtp,
    verifyLoginOtp,
  };
}

export type { AuthSession, AuthUser };
