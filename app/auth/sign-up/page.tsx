"use client";

import Link from "next/link";
import { AuthView } from "@neondatabase/auth-ui";

export default function SignUpPage() {
  return <main className="auth-shell"><Link href="/" className="brand auth-brand"><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link><section className="auth-card"><div className="eyebrow">START CREATING</div><h1>Your next story<br/><em>starts here.</em></h1><p>Create an account to keep your projects and creative plans in one place.</p><AuthView path="sign-up" /><div className="auth-foot">Already have an account? <Link href="/auth/sign-in">Sign in</Link></div></section><p className="auth-legal">AI VIDEO CREATION HUB · PRIVATE CREATOR WORKSPACE</p></main>;
}
