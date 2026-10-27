import type { Metadata } from "next";
import "@neondatabase/auth-ui/css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "AI Video Creator — Ideas into motion",
  description: "Plan, storyboard, and prepare short-form AI videos in a creator workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
