"use client";

import { useCallback, useEffect, useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();
type Project = { id: string; title: string; description: string | null; project_type: string; status: string; updated_at: string; scene_count?: number; asset_count?: number; job_count?: number };
const tools = [
  { icon: "✦", title: "Storyboard planner", detail: "Build an AI-assisted scene plan; video rendering is not enabled yet", tag: "TEXT AI", type: "video" },
  { icon: "▧", title: "Photo retouch", detail: "Browser-local image editing with PNG/JPEG export; no AI image generation", tag: "LOCAL EDIT", type: "image" },
  { icon: "▶", title: "Motion preview", detail: "Add camera motion to a still image and export WebM; no generative video", tag: "WEBM", type: "motion" },
  { icon: "◖", title: "Voice & captions", detail: "Prepare narration and subtitle direction; audio synthesis is pending", tag: "AUDIO PLAN", type: "edit" },
  { icon: "⚙", title: "AI provider readiness", detail: "Check free-tier text provider setup and run a safe connection test", tag: "SYSTEM", type: "providers" },
];

export default function WorkspaceClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("video");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const session = await authClient.getSession();
      const sessionUser = session.data?.user;
      if (!sessionUser) { setUser(null); setProjects([]); return; }
      setUser({ name: sessionUser.name, email: sessionUser.email });
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load projects.");
      setProjects(data.projects ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, projectType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create project.");
      setProjects((current) => [data.project, ...current]);
      setTitle(""); setCreating(false);
      setMessage("Project draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return <main className="shell">
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-mark">✳</span><span>AI Video <b>Creator</b></span></a>
      <div className="side-label">WORKSPACE</div>
      <a className="nav-item active" href="#home"><span>⌂</span> Overview</a>
      <a className="nav-item" href="#projects"><span>▧</span> My projects <small>{projects.length}</small></a>
      <a className="nav-item" href="#studio"><span>✦</span> Create studio</a>
      <a className="nav-item" href="/video-studio"><span>▶</span> Image to video</a>
      <a className="nav-item" href="/retouch"><span>▧</span> Photo retouch <small>NEW</small></a>
      <a className="nav-item" href="#projects"><span>▤</span> Media library</a>
      <a className="nav-item" href="/studio/jobs"><span>◷</span> Generation history</a>
      <a className="nav-item" href="/studio/providers"><span>⚙</span> AI provider readiness</a>
      <div className="side-label second">MANAGE</div>
      <a className="nav-item" href="#usage"><span>◷</span> Usage & credits</a>
      <a className="nav-item" href="#settings"><span>⚙</span> Settings</a>
      <div className="sidebar-bottom"><div className="plan-card"><span className="plan-icon">✧</span><b>Free workspace</b><p>AI generation stays disabled until a real provider is configured and tested. No fake output or hidden charges.</p><a href="#usage">View usage →</a></div><div className="profile"><div className="profile-avatar">{user?.name?.[0]?.toUpperCase() ?? "C"}</div><div><b>{user?.name || "Creator workspace"}</b><small>{user?.email || "Sign in to save projects"}</small></div><button className="dots" onClick={user ? signOut : () => window.location.assign("/auth/sign-in")} aria-label={user ? "Sign out" : "Sign in"}>{user ? "↗" : "→"}</button></div></div>
    </aside>
    <section className="content" id="home">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> Overview</div><div className="top-actions"><span className="status-dot"/><span className="status-text">{user ? "Signed in" : "Preview workspace"}</span>{user ? <button className="top-link" onClick={signOut}>Sign out</button> : <a className="top-link" href="/auth/sign-in">Sign in</a>}</div></header>
      <div className="welcome"><div><div className="eyebrow"><span className="spark">✳</span> YOUR CREATIVE SPACE</div><h1>Make something<br/><em>extraordinary.</em></h1><p>From a spark of an idea to a story worth sharing.<br className="desktop-break"/> Your creative workflow starts here.</p><button className="primary-button" onClick={() => user ? setCreating(true) : window.location.assign("/auth/sign-in")}><span>＋</span> Start a new creation <span className="arrow">↗</span></button></div><div className="hero-art" aria-label="Abstract creative gradient artwork"><div className="orb orb-one"/><div className="orb orb-two"/><div className="orb orb-three"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-caption"><span>CREATIVE ENGINE</span><b>Ideas into motion.</b></div></div></div>
      <div className="section-heading" id="studio"><div><div className="eyebrow">CREATE YOUR WAY</div><h2>What are we making today?</h2></div><a className="text-link" href="#projects">All projects <span>↗</span></a></div>
      <div className="tool-grid">{tools.map((tool) => <button className="tool-card" onClick={() => { const destinations: Record<string,string> = { video: "/studio/text-to-video", image: "/retouch", motion: "/video-studio", edit: "/studio/voice", storyboard: "/studio/storyboard", providers: "/studio/providers" }; window.location.assign(destinations[tool.type] ?? "/studio/text-to-video"); }} key={tool.title}><div className="tool-top"><span className="tool-icon">{tool.icon}</span><span className="tool-tag">{tool.tag}</span></div><h3>{tool.title}</h3><p>{tool.detail}</p><span className="card-arrow">↗</span></button>)}</div>
      {creating && <form className="create-form" onSubmit={createProject}><div><div className="eyebrow">NEW PROJECT</div><h3>Give your idea a home.</h3></div><label>Project title<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. A quiet morning in Bali"/></label><label>Project type<select value={projectType} onChange={(event) => setProjectType(event.target.value)}><option value="video">Video</option><option value="image">Image</option><option value="campaign">Campaign</option><option value="edit">Editing</option></select></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save project draft"} <span>↗</span></button></div></form>}
      {message && <p className="notice" role="status">{message}</p>}
      <section className="project-section" id="projects"><div className="section-heading"><div><div className="eyebrow">YOUR CANVAS</div><h2>Recent projects</h2></div><span className="muted">{projects.length} projects</span></div>
      {loading ? <div className="empty-state"><div className="empty-icon">◌</div><h3>Loading your workspace…</h3><p>Checking your session and saved project drafts.</p></div> : projects.length ? <div className="project-grid">{projects.map((project) => <a className="project-link" href={`/projects/${encodeURIComponent(project.id)}`} key={project.id}><article className="project-card"><div className="project-art"><span>{project.project_type === "image" ? "▧" : project.project_type === "edit" ? "◖" : "✦"}</span><small>{project.project_type.toUpperCase()}</small></div><h3>{project.title}</h3><p>{project.description || "A new creative project, ready for your storyboard."}</p><div className="project-meta"><span>{project.scene_count ?? 0} scenes</span><span>{project.asset_count ?? 0} assets</span><span>{project.status}</span></div></article></a>)}</div> : <div className="empty-state"><div className="empty-icon">▧</div><h3>{user ? "Your next idea belongs here." : "Sign in to save your ideas."}</h3><p>{user ? "Create a project to organize prompts, storyboards, assets, and generation jobs in one place." : "Your projects are private to your account. Sign in or create an account to begin."}</p><button onClick={() => user ? setCreating(true) : window.location.assign("/auth/sign-in")} className="secondary-button">{user ? "Create your first project" : "Sign in to get started"} <span>↗</span></button></div>}</section>
      <section className="project-section" id="usage"><div className="section-heading"><div><div className="eyebrow">TRANSPARENT BY DESIGN</div><h2>Generation status</h2></div><span className="muted">Provider setup required</span></div><div className="status-panel"><div className="status-icon">✳</div><div><h3>Creative planning is ready to build on.</h3><p>Image, video, and voice generation will stay unavailable until provider credentials are configured and end-to-end tests pass. This protects you from fake results and unexpected costs.</p><a href="/api/health" target="_blank" rel="noreferrer">View service health ↗</a></div></div></section>
      <footer><span>AI VIDEO CREATOR</span><span>Ideas into motion · <a href="#settings">Settings</a></span></footer>
    </section>
  </main>;
}
