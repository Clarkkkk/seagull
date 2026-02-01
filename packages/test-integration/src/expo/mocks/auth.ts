import { vi } from "vitest";

type Session = null | { user: { id: string } };

let currentSession: Session = null;
let currentPending = false;
let currentCookie: string | null = null;

export function __setAuthSession(session: Session, opts?: { isPending?: boolean }) {
  currentSession = session;
  currentPending = opts?.isPending ?? false;
}

export function __setAuthCookie(cookie: string | null) {
  currentCookie = cookie;
}

export const authClient = {
  useSession() {
    return { data: currentSession, isPending: currentPending } as const;
  },
  getCookie() {
    return currentCookie;
  },
  signOut: vi.fn(async () => undefined),
  emailOtp: {
    sendVerificationOtp: vi.fn(async (_args: { email: string; type: "sign-in" }) => undefined),
  },
  signIn: {
    emailOtp: vi.fn(async (_args: { email: string; otp: string }) => undefined),
  },
};

