"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();
type Project = { id: string; title: string; description: string | null; project_type: string; status: string };
type Scene = { id: string; scene_order: number; title: string | null; prompt: string; narration_text: string | null; duration_seconds: string | number; status: string };

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [narration, setNarration] = useState("");
  const [duration, setDuration] = useState("5");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await authClient.getSession();
        if (!session.data?.user) { window.location.assign("/auth/sign-in"); return; }
        const projectsResponse = await fetch("/api/projects", { cache: "no-store" });
        const projectsData = await projectsResponse.json();
        if (!projectsResponse.ok) throw new Error(projectsData.error ?? "Could not load projects.");
        const found = (projectsData.projects as Project[]).find((item) => item.id === projectId);
        if (!found) throw new Error("Project not found, or you do not have access.");
        const sceneResponse = await fetch(`/api/projects/${encodeURIComponent(projectId)}/scenes`, { cache: "no-store" });
        const sceneData = await sceneResponse.json();
        if (!sceneResponse.ok) throw new Error(sceneData.error ?? "Could not load storyboard.");
        if (active) {
          setProject(found);
          setScenes(sceneData.scenes ?? []);
          setTotalSeconds(Number(sceneData.totalSeconds ?? 0));
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load this project.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [projectId]);

  async function addScene(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/scenes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || null, prompt, narrationText: narration, durationSeconds: Number(duration) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save scene.");
      setScenes((current) => [...current, data.scene]);
      setTotalSeconds(Number(data.totalSeconds));
      setTitle(""); setPrompt(""); setNarration("");
      setMessage("Storyboard scene saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save scene.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="project-page"><p className="muted">Loading project…</p></main>;
  if (!project) return <main className="project-page"><Link href="/" className="text-link">← Back to workspace</Link><div className="empty-state"><h3>Project unavailable</h3><p>{message || "Sign in to access this project."}</p><Link className="secondary-button" href="/auth/sign-in">Sign in</Link></div></main>;

  return <main className="project-page">
    <header className="project-page-header"><Link href="/" className="brand"><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link><Link href="/" className="text-link">← All projects</Link></header>
    <div className="project-intro"><div className="eyebrow">CREATIVE PROJECT · {project.project_type.toUpperCase()}</div><h1>{project.title}</h1><p>{project.description || "Plan the story first. Build your scene sequence, prompts, and narration here."}</p><div className="story-progress"><div><span>STORYBOARD LENGTH</span><b>{totalSeconds.toFixed(1)} / 30 seconds</b></div><div className="progress-track"><span style={{ width: `${Math.min(100, totalSeconds / 30 * 100)}%` }}/></div></div></div>
    <div className="story-layout"><section className="scene-list"><div className="section-heading"><div><div className="eyebrow">SEQUENCE</div><h2>Your scenes</h2></div><span className="muted">{scenes.length} scenes</span></div>
      {scenes.length ? scenes.map((scene) => <article className="scene-card" key={scene.id}><div className="scene-number">{String(scene.scene_order + 1).padStart(2, "0")}</div><div className="scene-body"><div className="scene-top"><h3>{scene.title || `Scene ${scene.scene_order + 1}`}</h3><span>{Number(scene.duration_seconds).toFixed(1)}s</span></div><p>{scene.prompt}</p>{scene.narration_text && <blockquote>{scene.narration_text}</blockquote>}<small>{scene.status}</small></div></article>) : <div className="empty-state compact"><div className="empty-icon">▤</div><h3>Start with scene one.</h3><p>Add a visual prompt and optional narration. Scene durations are validated so the complete storyboard stays within 30 seconds.</p></div>}
    </section>
    <aside className="scene-editor"><div className="eyebrow">SCENE BUILDER</div><h2>Shape the next moment.</h2><p className="editor-help">Write what the audience sees, then add narration if needed. You can plan the sequence before connecting a generation provider.</p><form onSubmit={addScene}><label>Scene title <span>OPTIONAL</span><input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Opening shot"/></label><label>Visual prompt<textarea required maxLength={4000} rows={5} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe subject, setting, movement, lighting, camera angle, and mood…"/></label><label>Narration / voiceover <span>OPTIONAL</span><textarea maxLength={2000} rows={3} value={narration} onChange={(event) => setNarration(event.target.value)} placeholder="Words spoken in this scene…"/></label><label>Scene duration<select value={duration} onChange={(event) => setDuration(event.target.value)}>{["2","3","4","5","6","7","8","10","12","15"].map((value) => <option key={value} value={value}>{value} seconds</option>)}</select></label><button type="submit" className="primary-button" disabled={saving || totalSeconds >= 30}>{saving ? "Saving scene…" : "Add scene"} <span>↗</span></button><div className="limit-note">{Math.max(0,30-totalSeconds).toFixed(1)} seconds remaining in this storyboard.</div></form></aside></div>
    {message && <p className="notice" role="status">{message}</p>}
    <section className="provider-warning"><span>✧</span><div><b>Generation is not yet connected</b><p>Scenes are saved as real database records. Rendering, image/video generation, and narration are intentionally disabled until a provider adapter and end-to-end test are in place.</p></div></section>
  </main>;
}
