"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();
type Project = { id: string; title: string; description: string | null; project_type: string; status: string; scene_count?: number; updated_at?: string };
type Scene = { id: string; scene_order: number; title: string | null; prompt: string; narration_text: string | null; duration_seconds: number | string; status: string };
const panel: React.CSSProperties = { border: "1px solid #292d36", borderRadius: 14, background: "#14161c", padding: 20 };
const field: React.CSSProperties = { width: "100%", background: "#0e1014", border: "1px solid #373b45", borderRadius: 8, color: "#f4f3ef", padding: "12px 13px", font: "13px 'DM Sans', sans-serif" };
const label: React.CSSProperties = { display: "grid", gap: 7, color: "#b7bac3", fontSize: 11, fontWeight: 600 };
const primary: React.CSSProperties = { border: 0, borderRadius: 8, padding: "11px 15px", background: "#d6f379", color: "#171a11", fontWeight: 700, cursor: "pointer" };
const secondary: React.CSSProperties = { border: "1px solid #414550", borderRadius: 8, padding: "9px 12px", background: "#202229", color: "#e8e9ed", cursor: "pointer" };

export function StoryboardHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await authClient.getSession();
        if (!session.data?.user) { window.location.assign("/auth/sign-in?next=/studio/storyboard"); return; }
        const response = await fetch("/api/projects", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load projects.");
        if (active) setProjects((data.projects ?? []).filter((p: Project) => ["video", "campaign"].includes(p.project_type)));
      } catch (e) { if (active) setMessage(e instanceof Error ? e.message : "Could not load storyboards."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), description: brief.trim(), projectType: "video" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create storyboard.");
      window.location.assign(`/studio/storyboard/${encodeURIComponent(data.project.id)}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create storyboard."); setBusy(false); }
  }
  return <main style={{ minHeight: "100vh", maxWidth: 1180, margin: "0 auto", padding: "28px 5% 70px", color: "#f4f3ef" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #292d36", paddingBottom: 22 }}>
      <Link href="/" className="brand" style={{ padding: 0 }}><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link><Link href="/" className="text-link">← Workspace overview</Link>
    </header>
    <div style={{ padding: "48px 0 30px" }}><div className="eyebrow">PRE-PRODUCTION · STORYBOARD STUDIO</div><h1 style={{ font: "600 clamp(34px,5vw,58px)/1.05 Manrope,sans-serif", letterSpacing: -2, margin: "15px 0" }}>See the story<br/><em style={{ color: "#d6f379", fontStyle: "normal" }}>before it moves.</em></h1><p style={{ maxWidth: 660, color: "#a1a4ae", lineHeight: 1.8 }}>A dedicated space to arrange scenes, control pacing, refine shot prompts, and shape the visual sequence. Your storyboard stays editable and private to your account.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, alignItems: "start" }}>
      <section style={panel}><div className="eyebrow">NEW STORYBOARD</div><h2 style={{ font: "600 21px Manrope,sans-serif", margin: "10px 0" }}>Start with a blank sequence.</h2><p style={{ color: "#9296a0", fontSize: 12, lineHeight: 1.7 }}>Create a project, then add and arrange up to 30 seconds of scenes. You can add visual direction and narration to every shot.</p>
        <form onSubmit={create} style={{ display: "grid", gap: 13, marginTop: 18 }}><label style={label}>Storyboard title<input style={field} required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. A day in the city"/></label><label style={label}>Story summary<textarea style={{...field, minHeight: 105, resize: "vertical"}} maxLength={1000} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="What happens, who is it for, and what should it feel like?"/></label><button style={primary} disabled={busy}>{busy ? "Creating…" : "Create storyboard →"}</button></form>
      </section>
      <section style={panel}><div className="eyebrow">YOUR WORK IN PROGRESS</div><h2 style={{ font: "600 21px Manrope,sans-serif", margin: "10px 0 17px" }}>Recent storyboards</h2>
        {loading ? <p style={{ color: "#999" }}>Loading your projects…</p> : projects.length ? <div style={{ display: "grid", gap: 9 }}>{projects.map(p=><Link key={p.id} href={`/studio/storyboard/${encodeURIComponent(p.id)}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 13, border: "1px solid #30343e", borderRadius: 9, background: "#101217" }}><span><b style={{ display: "block", fontSize: 13 }}>{p.title}</b><small style={{ color: "#9296a0" }}>{p.scene_count ?? 0} scenes · {p.status}</small></span><span style={{ color: "#d6f379" }}>↗</span></Link>)}</div> : <p style={{ color: "#9296a0", fontSize: 12 }}>No storyboards yet. Create your first sequence to begin.</p>}
      </section>
    </div>{message && <p role="alert" style={{ color: "#f3c98b", marginTop: 15 }}>{message}</p>}
    <p style={{ color: "#737782", fontSize: 11, marginTop: 28 }}>Storyboard planning and editing are available. AI video rendering and final export are not yet connected to a verified generation provider.</p>
  </main>;
}

export function StoryboardEditor({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [sceneTitle, setSceneTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [narration, setNarration] = useState("");
  const [duration, setDuration] = useState("5");
  const total = scenes.reduce((sum, scene) => sum + Number(scene.duration_seconds), 0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await authClient.getSession();
        if (!session.data?.user) { window.location.assign("/auth/sign-in"); return; }
        const [pRes, sRes] = await Promise.all([fetch("/api/projects", { cache: "no-store" }), fetch(`/api/projects/${encodeURIComponent(projectId)}/scenes`, { cache: "no-store" })]);
        const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
        if (!pRes.ok) throw new Error(pData.error ?? "Could not load projects.");
        if (!sRes.ok) throw new Error(sData.error ?? "Could not load storyboard.");
        const found = (pData.projects as Project[]).find(p => p.id === projectId);
        if (!found) throw new Error("Storyboard not found or access denied.");
        if (active) { setProject(found); setScenes(sData.scenes ?? []); }
      } catch (e) { if (active) setMessage(e instanceof Error ? e.message : "Could not load storyboard."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [projectId]);
  function resetForm() { setEditing(null); setSceneTitle(""); setPrompt(""); setNarration(""); setDuration("5"); }
  function beginEdit(scene: Scene) { setEditing(scene.id); setSceneTitle(scene.title ?? ""); setPrompt(scene.prompt); setNarration(scene.narration_text ?? ""); setDuration(String(Number(scene.duration_seconds))); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const url = editing ? `/api/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(editing)}` : `/api/projects/${encodeURIComponent(projectId)}/scenes`;
      const response = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: sceneTitle.trim(), prompt: prompt.trim(), narrationText: narration.trim(), durationSeconds: Number(duration) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not save scene.");
      setScenes(current => editing ? current.map(s => s.id === editing ? data.scene : s) : [...current, data.scene]); resetForm(); setMessage(editing ? "Scene updated." : "Scene added to storyboard.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save scene."); }
    finally { setBusy(false); }
  }
  async function remove(scene: Scene) {
    if (!window.confirm(`Delete ${scene.title || `Scene ${scene.scene_order+1}`}? This cannot be undone.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(scene.id)}`, { method: "DELETE" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not delete scene.");
      setScenes(current => current.filter(s => s.id !== scene.id).map((s,i)=>({...s,scene_order:i})));
      if (editing === scene.id) resetForm(); setMessage("Scene removed and sequence reordered.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not delete scene."); }
    finally { setBusy(false); }
  }
  if (loading) return <main style={{ minHeight: "100vh", padding: 40, color: "#eee" }}>Loading storyboard…</main>;
  if (!project) return <main style={{ minHeight: "100vh", padding: 40, color: "#eee" }}><Link href="/studio/storyboard">← Storyboards</Link><p>{message || "Storyboard unavailable."}</p></main>;
  return <main style={{ minHeight: "100vh", maxWidth: 1240, margin: "0 auto", padding: "25px 4% 70px", color: "#f4f3ef" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #292d36", paddingBottom: 20 }}><Link href="/studio/storyboard" className="brand" style={{ padding: 0 }}><span className="brand-mark">✳</span><span>Storyboard <b>Studio</b></span></Link><div style={{ display: "flex", gap: 15 }}><Link href={`/projects/${encodeURIComponent(projectId)}`} className="text-link">Open full production workspace ↗</Link><Link href="/studio/storyboard" className="text-link">All storyboards</Link></div></header>
    <div style={{ padding: "38px 0 22px" }}><div className="eyebrow">STORYBOARD · {project.project_type.toUpperCase()}</div><h1 style={{ font: "600 clamp(30px,4vw,48px)/1.1 Manrope,sans-serif", letterSpacing: -1.8, margin: "12px 0" }}>{project.title}</h1><p style={{ color: "#9da0aa", maxWidth: 650, lineHeight: 1.7 }}>Build the sequence one shot at a time. Review scene order, pacing, visual prompts, and narration before production.</p>
      <div style={{ maxWidth: 520, marginTop: 23 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11 }}><span style={{ color: "#9296a0" }}>SEQUENCE DURATION</span><b style={{ color: total > 30 ? "#ff9d91" : "#d6f379" }}>{total.toFixed(1)} / 30 seconds</b></div><div style={{ height: 6, borderRadius: 8, background: "#292d36", overflow: "hidden" }}><div style={{ width: `${Math.min(100,total/30*100)}%`, height: "100%", background: "#d6f379" }}/></div></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(290px,.65fr)", gap: 18, alignItems: "start" }}>
      <section style={panel}><div className="eyebrow">SHOT SEQUENCE · {scenes.length} SCENES</div><h2 style={{ font: "600 20px Manrope,sans-serif", margin: "9px 0 17px" }}>Your visual timeline</h2>
        {scenes.length ? <div style={{ display: "grid", gap: 10 }}>{scenes.map((scene,index)=><article key={scene.id} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, padding: 14, border: "1px solid #30343e", borderRadius: 10, background: "#101217" }}><div style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 9, background: "#292e1d", color: "#d6f379", font: "500 13px 'DM Mono',monospace" }}>{String(index+1).padStart(2,"0")}</div><div style={{ minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><b style={{ fontSize: 13 }}>{scene.title || `Scene ${index+1}`}</b><span style={{ color: "#d6f379", fontSize: 11, whiteSpace: "nowrap" }}>{Number(scene.duration_seconds).toFixed(1)}s</span></div><p style={{ color: "#a1a4ae", fontSize: 12, lineHeight: 1.65, margin: "8px 0" }}>{scene.prompt}</p>{scene.narration_text && <p style={{ color: "#c3b5ff", fontSize: 11, lineHeight: 1.6, margin: "7px 0" }}>“{scene.narration_text}”</p>}<div style={{ display: "flex", gap: 8, marginTop: 10 }}><button style={secondary} onClick={()=>beginEdit(scene)}>Edit shot</button><button style={{...secondary,color:"#ffaaa0"}} disabled={busy} onClick={()=>void remove(scene)}>Delete</button><small style={{ alignSelf: "center", color: "#747984" }}>{scene.status}</small></div></div></article>)}</div> : <div style={{ border: "1px dashed #3b404b", borderRadius: 10, padding: 30, textAlign: "center", color: "#9da0aa" }}><b style={{ color: "#eee" }}>Your timeline is empty</b><p style={{ fontSize: 12 }}>Add your first shot using the scene builder.</p></div>}
      </section>
      <section style={{...panel, position: "sticky", top: 18}}><div className="eyebrow">{editing ? "REFINE A SHOT" : "SCENE BUILDER"}</div><h2 style={{ font: "600 20px Manrope,sans-serif", margin: "9px 0 7px" }}>{editing ? "Edit scene" : "Add a scene"}</h2><p style={{ color: "#9296a0", fontSize: 11, lineHeight: 1.6 }}>Each scene needs a clear visual prompt. Keep the complete storyboard within 30 seconds.</p>
        <form onSubmit={save} style={{ display: "grid", gap: 12, marginTop: 15 }}><label style={label}>Shot title<input style={field} maxLength={120} value={sceneTitle} onChange={e=>setSceneTitle(e.target.value)} placeholder="e.g. Establishing sunrise"/></label><label style={label}>Visual prompt<textarea style={{...field,minHeight:120,resize:"vertical"}} required maxLength={4000} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe subject, action, setting, framing, camera, lighting, and mood…"/></label><label style={label}>Narration / dialogue<textarea style={{...field,minHeight:75,resize:"vertical"}} maxLength={2000} value={narration} onChange={e=>setNarration(e.target.value)} placeholder="Optional voice-over or dialogue"/></label><label style={label}>Duration<select style={field} value={duration} onChange={e=>setDuration(e.target.value)}>{["2","3","4","5","6","7","8","9","10","12","15","20","30"].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label><button style={primary} disabled={busy || total >= 30 && !editing}>{busy ? "Saving…" : editing ? "Save scene changes" : "＋ Add to timeline"}</button>{editing && <button type="button" style={secondary} onClick={resetForm}>Cancel editing</button>}</form>
        {message && <p role="status" style={{ color: "#d6f379", fontSize: 11, lineHeight: 1.5, marginTop: 12 }}>{message}</p>}
      </section>
    </div>
    <p style={{ color: "#747984", fontSize: 11, marginTop: 24 }}>This workspace edits production planning data only. It does not claim to render video or create generated frames.</p>
  </main>;
}
