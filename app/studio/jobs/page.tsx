"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();
type Job = {
  id: string;
  projectId: string | null;
  jobType: string;
  provider: string | null;
  model: string | null;
  status: "queued" | "processing" | "succeeded" | "failed" | "cancelled" | string;
  progress: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  estimatedCostUsd: string | number | null;
  actualCostUsd: string | number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  purpose?: string | null;
  result?: unknown;
};

const panel: React.CSSProperties = { border: "1px solid #292d36", borderRadius: 14, background: "#14161c", padding: 20 };
const muted: React.CSSProperties = { color: "#9296a0", fontSize: 12 };
const statusColor: Record<string, string> = { succeeded: "#d6f379", failed: "#ff9b9b", processing: "#a8c8ff", queued: "#e8cb8c", cancelled: "#a5a7b0" };
const labels: Record<string, string> = { text_to_image: "Text to image", image_to_image: "Image to image", retouch: "Photo retouch", text_to_video: "Text to video", image_to_video: "Image to video", voiceover: "Voiceover", subtitle: "Subtitles", render: "Render", campaign: "Campaign" };

function date(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

function cost(value: string | number | null) {
  if (value === null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(amount)
    : "Unavailable";
}

export default function GenerationJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const session = await authClient.getSession();
      if (!session.data?.user) {
        window.location.assign("/auth/sign-in?next=/studio/jobs");
        return;
      }
      const response = await fetch("/api/generation-jobs?limit=100", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load generation history.");
      setJobs(data.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load generation history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <main style={{ minHeight: "100vh", maxWidth: 1180, margin: "0 auto", padding: "28px 5% 70px", color: "#f4f3ef" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: "1px solid #292d36", paddingBottom: 22 }}>
      <Link href="/" className="brand" style={{ padding: 0 }}><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link>
      <Link href="/" className="text-link">← Workspace overview</Link>
    </header>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 18, flexWrap: "wrap", padding: "42px 0 24px" }}>
      <div><div className="eyebrow">WORKSPACE · OPERATIONS</div><h1 style={{ font: "600 clamp(34px,5vw,54px)/1.05 Manrope,sans-serif", letterSpacing: -2, margin: "13px 0" }}>Generation history</h1><p style={{ ...muted, maxWidth: 650, lineHeight: 1.8 }}>Review the status and operational details of generation jobs associated with your account.</p></div>
      <button onClick={() => void load(true)} disabled={refreshing || loading} style={{ border: "1px solid #414550", borderRadius: 8, padding: "10px 14px", background: "#202229", color: "#e8e9ed", cursor: "pointer" }}>{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
    </div>
    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}><div><div className="eyebrow">LATEST ACTIVITY</div><h2 style={{ font: "600 21px Manrope,sans-serif", margin: "8px 0 0" }}>Your jobs <span style={muted}>({jobs.length})</span></h2></div><span style={muted}>Up to 100 records</span></div>
      {loading ? <p style={muted}>Loading your generation history…</p> : error ? <div role="alert" style={{ color: "#ffb2a8", fontSize: 13 }}>{error}<p><button onClick={() => void load(true)} style={{ marginTop: 8, ...{ border: "1px solid #414550", borderRadius: 8, padding: "8px 12px", background: "#202229", color: "#eee" } }}>Try again</button></p></div> : jobs.length === 0 ? <div style={{ padding: "32px 8px", textAlign: "center" }}><div style={{ fontSize: 28, color: "#d6f379" }}>◷</div><h3 style={{ margin: "12px 0 6px", font: "600 17px Manrope,sans-serif" }}>No generation jobs yet</h3><p style={muted}>When a supported generation workflow creates a job, its status will appear here.</p><Link href="/studio/storyboard" className="text-link" style={{ display: "inline-block", marginTop: 12 }}>Open Storyboard Studio ↗</Link></div> : <div style={{ display: "grid", gap: 10 }}>{jobs.map(job => <article key={job.id} className="job-card" style={{ border: "1px solid #30343e", borderRadius: 10, padding: 15, background: "#101217", display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(110px,.7fr) minmax(130px,1fr)", gap: 14, alignItems: "center" }}>
        <div><b style={{ display: "block", fontSize: 13 }}>{labels[job.jobType] ?? job.jobType.replaceAll("_", " ")}</b><span style={{ ...muted, display: "block", marginTop: 5 }}>Created {date(job.createdAt)}</span><span style={{ ...muted, display: "block", marginTop: 3 }}>{job.provider ? job.provider : "Provider not recorded"}{job.model ? ` · ${job.model}` : ""}</span>{job.projectId && <Link href={`/projects/${encodeURIComponent(job.projectId)}`} className="text-link" style={{ display: "inline-block", marginTop: 7 }}>Open project ↗</Link>}</div>
        <div><span style={{ color: statusColor[job.status] ?? "#c5c7ce", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{job.status}</span>{job.progress !== null && Number.isFinite(Number(job.progress)) && <div role="progressbar" aria-label="Job progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, Number(job.progress)))} style={{ marginTop: 7, height: 4, borderRadius: 9, background: "#30343e", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(0,Math.min(100,Number(job.progress)))}%`, background: "#d6f379" }}/></div>}{job.progress !== null && <small style={muted}>{job.progress}%</small>}</div>
        <div style={muted}>Updated {date(job.updatedAt)}{job.completedAt && <span style={{ display: "block", marginTop: 4 }}>Completed {date(job.completedAt)}</span>}{job.actualCostUsd !== null && <span style={{ display: "block", marginTop: 4 }}>Actual cost: {cost(job.actualCostUsd)}</span>}{job.errorCode && <span style={{ display: "block", marginTop: 5 }}>Error code: {job.errorCode}</span>}{job.errorMessage && <span style={{ display: "block", color: "#ffaaa0", marginTop: 6, overflowWrap: "anywhere" }}>{job.errorMessage}</span>}{Boolean(job.result) && <details style={{ marginTop: 9, color: "#d6f379" }}><summary style={{ cursor: "pointer", fontSize: 12 }}>View generated result</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#d4d6dc", fontSize: 11, lineHeight: 1.6, maxHeight: 360, overflow: "auto", marginTop: 8 }}>{JSON.stringify(job.result, null, 2)}</pre></details>}</div>
      </article>)}</div>}
    </section>
    <p style={{ ...muted, marginTop: 18, lineHeight: 1.7 }}>This page reports queued job status and completed text results. Image, video, audio, and MP4 rendering still require separate verified provider and media-processing integrations.</p>
    <style jsx>{`@media (max-width: 760px) { .job-card { grid-template-columns: minmax(0, 1fr) !important; gap: 10px !important; } }`}</style>
  </main>;
}
