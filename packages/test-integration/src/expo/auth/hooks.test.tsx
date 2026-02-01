import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import { __setAuthSession } from "../mocks/auth";
import { useAuthActions, useAuthSession } from "~/business/auth/hooks";
import { authClient } from "~/utils/auth";

describe("expo/business/auth/hooks", () => {
  it("useAuthSession：未登录", () => {
    __setAuthSession(null);
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.isAuthed).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
  });

  it("useAuthSession：已登录", () => {
    __setAuthSession({ user: { id: "user_1" } });
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.isAuthed).toBe(true);
    expect(result.current.userId).toBe("user_1");
  });

  it("useAuthActions：会调用 authClient 对应方法", async () => {
    const { result } = renderHook(() => useAuthActions());

    await result.current.sendLoginOtp("a@example.com");
    expect(authClient.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
      email: "a@example.com",
      type: "sign-in",
    });

    await result.current.verifyLoginOtp("a@example.com", "123456");
    expect(authClient.signIn.emailOtp).toHaveBeenCalledWith({
      email: "a@example.com",
      otp: "123456",
    });

    await result.current.signOut();
    expect(authClient.signOut).toHaveBeenCalledTimes(1);
  });
});

