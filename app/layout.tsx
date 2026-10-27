import type { Metadata } from "next";
import "@neondatabase/auth-ui/css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "AI Video Creation Hub — Create without limits",
  description: "Plan, create, and edit short-form videos with an AI-powered creative workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
