"use client";

import { createAuthClient } from "@neondatabase/auth/next";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";

const authClient = createAuthClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <NeonAuthUIProvider authClient={authClient} redirectTo="/">{children}</NeonAuthUIProvider>;
}
