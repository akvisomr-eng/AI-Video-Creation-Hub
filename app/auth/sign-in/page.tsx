"use client";

import Link from "next/link";
import { AuthView } from "@neondatabase/auth-ui";

export default function SignInPage() {
  return <main className="auth-shell"><Link href="/" className="brand auth-brand"><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link><section className="auth-card"><div className="eyebrow">WELCOME BACK</div><h1>Pick up where<br/><em>your ideas left off.</em></h1><p>Sign in to access your projects and storyboard drafts.</p><AuthView path="sign-in" /><div className="auth-foot">New to the Hub? <Link href="/auth/sign-up">Create an account</Link></div></section><p className="auth-legal">AI VIDEO CREATION HUB · PRIVATE CREATOR WORKSPACE</p></main>;
}
