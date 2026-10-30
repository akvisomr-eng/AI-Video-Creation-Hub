"use client";

import Link from "next/link";
import { useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();

export default function TextToVideoEntry() {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await authClient.getSession();
      if (!session.data?.user) {
        window.location.assign("/auth/sign-in?next=/studio/text-to-video");
        return;
      }
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), projectType: "video", description: brief.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create your video project.");
      window.location.assign(`/projects/${encodeURIComponent(data.project.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start this project.");
      setBusy(false);
    }
  }

  return <main className="studio-entry">
    <header className="studio-entry-header">
      <Link href="/" className="brand"><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link>
      <Link href="/" className="text-link">← Back to overview</Link>
    </header>
    <div className="studio-entry-hero">
      <div className="eyebrow"><span className="spark">✦</span> TEXT TO VIDEO WORKSPACE</div>
      <h1>From a single idea<br/><em>to every scene.</em></h1>
      <p>A dedicated production space to shape your concept, build a scene-by-scene storyboard, direct each shot, and prepare your video workflow.</p>
    </div>
    <div className="studio-entry-grid">
      <section className="studio-entry-main">
        <div className="eyebrow">01 · START WITH THE IDEA</div>
        <h2>What story do you want to tell?</h2>
        <p>Start a project and continue into the full storyboard editor. Your idea and project title will be saved with the project.</p>
        <form onSubmit={start} className="studio-start-form">
          <label>Project name<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. The last light of Bali"/></label>
          <label>Your video idea<textarea required rows={5} maxLength={2000} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe the story, subject, setting, mood, and what the audience should feel…"/></label>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Preparing workspace…" : "Open video production workspace"} <span>↗</span></button>
          {error && <p className="notice" role="alert">{error}</p>}
        </form>
      </section>
      <aside className="studio-entry-steps">
        <div className="eyebrow">YOUR PRODUCTION FLOW</div>
        {[
          ["01","Concept & script","Define the story, audience, tone, and narration."],
          ["02","Scene breakdown","Turn the idea into a timed sequence of scenes."],
          ["03","Visual direction","Set aspect ratio, style, camera, lighting, and prompts."],
          ["04","Review & prepare","Refine the storyboard and organize source media."],
          ["05","Render & export","Connect a supported generation provider when available."]
        ].map(([n,t,d])=><div className="studio-step" key={n}><span>{n}</span><div><b>{t}</b><p>{d}</p></div></div>)}
        <div className="studio-capability-note"><b>Honest generation status</b><p>Storyboard planning and project saving are available. Generative video rendering is not yet connected, so this workspace will never present a mock render as a finished video.</p></div>
      </aside>
    </div>
  </main>;
}
