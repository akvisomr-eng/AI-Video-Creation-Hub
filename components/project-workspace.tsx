"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();
type Project = { id: string; title: string; description: string | null; project_type: string; status: string };
type Scene = { id: string; scene_order: number; title: string | null; prompt: string; narration_text: string | null; duration_seconds: string | number; status: string };
type Asset = { id: string; asset_type: string; file_name: string; mime_type: string; file_size_bytes: number | string; moderation_state: string };

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [brief, setBrief] = useState("");
  const [language, setLanguage] = useState("id");
  const [targetDuration, setTargetDuration] = useState("30");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [targetPlatform, setTargetPlatform] = useState("auto");
  const [creativePreset, setCreativePreset] = useState("cinematic");
  const [visualStyle, setVisualStyle] = useState("naturalistic cinematic lighting, deliberate camera movement, coherent color grade");
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
        const assetResponse = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets`, { cache: "no-store" });
        const assetData = await assetResponse.json();
        if (!assetResponse.ok) throw new Error(assetData.error ?? "Could not load media library.");
        if (active) {
          setProject(found);
          setScenes(sceneData.scenes ?? []);
          setTotalSeconds(Number(sceneData.totalSeconds ?? 0));
          setAssets(assetData.assets ?? []);
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load this project.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [projectId]);

  async function generateStoryboard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneratingPlan(true); setMessage("");
    try {
      const response = await fetch("/api/agents/storyboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, brief, language, targetDuration: Number(targetDuration), aspectRatio, targetPlatform, creativePreset, visualStyle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI storyboard generation failed.");
      setScenes((current) => [...current, ...(data.scenes as Scene[])]);
      setTotalSeconds(Number(data.totalSeconds));
      setBrief("");
      setMessage(`Storyboard drafted by ${data.model} and saved. Prompt guidance: ${data.selectedPlatform ?? targetPlatform}. Review each scene before generating media.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI storyboard generation failed.");
    } finally { setGeneratingPlan(false); }
  }

  async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const prepared = await fetch("/api/assets/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSize: file.size, projectId }),
      });
      const uploadData = await prepared.json();
      if (!prepared.ok) throw new Error(uploadData.error ?? "Could not prepare file upload.");
      const transfer = await fetch(uploadData.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!transfer.ok) throw new Error("File transfer failed. Check Neon Object Storage access and bucket CORS configuration.");
      const completed = await fetch("/api/assets/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: uploadData.storageKey, fileName: file.name, mimeType: file.type, projectId }),
      });
      const result = await completed.json();
      if (!completed.ok) throw new Error(result.error ?? "Could not register uploaded media.");
      setAssets((current) => [result.asset, ...current]);
      setMessage("Media uploaded and registered.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally { setUploading(false); }
  }

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
    <div className="story-layout"><section className="scene-list"><form className="ai-plan-form" onSubmit={generateStoryboard}><div className="eyebrow">AI CREATIVE DIRECTOR</div><h2>Turn your idea into a storyboard.</h2><p>The multi-provider Creative Director builds model-aware prompts, consistent shot direction, and narration. This creates a text plan only; it does not render media yet.</p><label>What is the video about?<textarea required rows={3} maxLength={2000} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="A 30-second cinematic travel reel about sunrise in Bali, from quiet rice fields to waves on the beach…"/></label><div className="ai-plan-options"><label>Narration language<select value={language} onChange={(event) => setLanguage(event.target.value)}>{[["id","Bahasa Indonesia"],["en","English"],["ms","Bahasa Melayu"],["ja","Japanese"],["ko","Korean"],["zh","Chinese"],["fr","French"],["es","Spanish"],["de","German"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Target duration<select value={targetDuration} onChange={(event) => setTargetDuration(event.target.value)}><option value="10">10 seconds</option><option value="15">15 seconds</option><option value="20">20 seconds</option><option value="30">30 seconds</option></select></label><label>Creative preset<select value={creativePreset} onChange={(event) => setCreativePreset(event.target.value)}><option value="auto">Auto select</option><option value="cinematic">Cinematic film</option><option value="commercial">Commercial / advertising</option><option value="anime">Anime / animation</option><option value="documentary">Documentary / naturalistic</option><option value="product-hero">Product hero</option><option value="music-video">Music video</option><option value="social-reel">Social reel</option></select></label><label>Target platform<select value={targetPlatform} onChange={(event) => setTargetPlatform(event.target.value)}><option value="auto">Auto recommend</option><option value="google-veo">Google Veo</option><option value="kling">Kling</option><option value="runway">Runway</option><option value="seedance">Seedance</option><option value="flux">Flux</option><option value="midjourney">Midjourney</option><option value="stable-diffusion">Stable Diffusion</option></select></label><label>Aspect ratio<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}><option value="16:9">16:9 · Landscape</option><option value="9:16">9:16 · Vertical</option><option value="1:1">1:1 · Square</option><option value="4:5">4:5 · Portrait</option><option value="2.39:1">2.39:1 · Cinema</option></select></label><label>Visual direction<input maxLength={120} value={visualStyle} onChange={(event) => setVisualStyle(event.target.value)} placeholder="Lighting, mood, camera and color style"/></label></div><button type="submit" className="primary-button" disabled={generatingPlan || totalSeconds >= 30}>{generatingPlan ? "Planning scenes…" : "Draft storyboard with AI"} <span>✦</span></button><small>Uses any configured text provider (Gemini, Groq, Cerebras, OpenRouter). Provider quotas and billing rules apply. Platform selection guides prompts only; media generation adapters are still pending.</small></form><div className="media-panel"><div><div className="eyebrow">PROJECT ASSETS</div><h2>Media library</h2><p>Upload source footage, images, audio, or subtitle files (up to 50 MB each).</p></div><label className="upload-button">{uploading ? "Uploading…" : "＋ Upload media"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,text/vtt,application/x-subrip,text/plain" disabled={uploading} onChange={uploadFile}/></label>{assets.length ? <div className="asset-list">{assets.map((asset) => <div className="asset-row" key={asset.id}><span className="asset-icon">{asset.asset_type === "video" ? "▶" : asset.asset_type === "audio" ? "♫" : asset.asset_type === "subtitle" ? "CC" : "▧"}</span><div className="asset-info"><b>{asset.file_name}</b><small>{asset.asset_type.toUpperCase()} · {(Number(asset.file_size_bytes) / (1024 * 1024)).toFixed(2)} MB · {asset.moderation_state}</small></div><a className="asset-download" href={`/api/assets/${encodeURIComponent(asset.id)}/download-url`} title="Download private asset">↓</a></div>)}</div> : <p className="asset-empty">No media uploaded to this project yet.</p>}</div><div className="section-heading"><div><div className="eyebrow">SEQUENCE</div><h2>Your scenes</h2></div><span className="muted">{scenes.length} scenes</span></div>
      {scenes.length ? scenes.map((scene) => <article className="scene-card" key={scene.id}><div className="scene-number">{String(scene.scene_order + 1).padStart(2, "0")}</div><div className="scene-body"><div className="scene-top"><h3>{scene.title || `Scene ${scene.scene_order + 1}`}</h3><span>{Number(scene.duration_seconds).toFixed(1)}s</span></div><p>{scene.prompt}</p>{scene.narration_text && <blockquote>{scene.narration_text}</blockquote>}<small>{scene.status}</small></div></article>) : <div className="empty-state compact"><div className="empty-icon">▤</div><h3>Start with scene one.</h3><p>Add a visual prompt and optional narration. Scene durations are validated so the complete storyboard stays within 30 seconds.</p></div>}
    </section>
    <aside className="scene-editor"><div className="eyebrow">SCENE BUILDER</div><h2>Shape the next moment.</h2><p className="editor-help">Write what the audience sees, then add narration if needed. You can plan the sequence before connecting a generation provider.</p><form onSubmit={addScene}><label>Scene title <span>OPTIONAL</span><input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Opening shot"/></label><label>Visual prompt<textarea required maxLength={4000} rows={5} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe subject, setting, movement, lighting, camera angle, and mood…"/></label><label>Narration / voiceover <span>OPTIONAL</span><textarea maxLength={2000} rows={3} value={narration} onChange={(event) => setNarration(event.target.value)} placeholder="Words spoken in this scene…"/></label><label>Scene duration<select value={duration} onChange={(event) => setDuration(event.target.value)}>{["2","3","4","5","6","7","8","10","12","15"].map((value) => <option key={value} value={value}>{value} seconds</option>)}</select></label><button type="submit" className="primary-button" disabled={saving || totalSeconds >= 30}>{saving ? "Saving scene…" : "Add scene"} <span>↗</span></button><div className="limit-note">{Math.max(0,30-totalSeconds).toFixed(1)} seconds remaining in this storyboard.</div></form></aside></div>
    {message && <p className="notice" role="status">{message}</p>}
    <section className="provider-warning"><span>✧</span><div><b>Media generation is not yet connected</b><p>Project, storyboard, and media metadata are saved as real database records. AI storyboard drafting can use Gemini when configured; image/video generation, narration audio, and final rendering remain disabled until their provider adapters and end-to-end tests are in place.</p></div></section>
  </main>;
}
