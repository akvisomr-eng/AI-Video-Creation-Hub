import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AI Video Creation Hub — Create without limits", description: "Plan, create, and edit short-form videos with an AI-powered creative workspace." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
