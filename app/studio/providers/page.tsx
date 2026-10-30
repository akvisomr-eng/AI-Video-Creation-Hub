"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Provider = { id: string; label: string; model: string };
type ProviderResponse = {
  text: Provider[];
  image: { configured: boolean; status: string; note: string };
  video: { configured: boolean; status: string; note: string };
  speech: { configured: boolean; status: string; note: string };
  note: string;
};

export default function ProviderSettingsPage() {
  const [data, setData] = useState<ProviderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; provider?: string; model?: string; latencyMs?: number; error?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/providers", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not load provider settings.");
      setData(payload);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Could not load provider settings." });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function testProvider() {
    setTesting(true); setResult(null);
    try {
      const response = await fetch("/api/ai/providers/test", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Provider test failed.");
      setResult(payload);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Provider test failed." });
    } finally { setTesting(false); }
  }

  return <main style={{ minHeight: "100vh", background: "#0d0f13", color: "#f4f4f5", padding: "32px 20px", fontFamily: "Inter,system-ui,sans-serif" }}>
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <Link href="/workspace" style={{ color: "#c5d78c", textDecoration: "none", fontSize: 13 }}>← Workspace</Link>
      <div style={{ marginTop: 28, marginBottom: 26 }}>
        <div style={{ color: "#c5d78c", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>SYSTEM CONFIGURATION</div>
        <h1 style={{ fontSize: 32, margin: "10px 0" }}>AI provider readiness</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.7, maxWidth: 700 }}>Check which server-side text providers are allowlisted, then run a small connection test. Keys stay in Vercel environment variables and are never sent to the browser.</p>
      </div>

      <section style={{ border: "1px solid #30343e", background: "#151820", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Text generation</h2>
        {loading ? <p style={{ color: "#a1a1aa" }}>Checking configuration…</p> : data?.text.length ? <div style={{ display: "grid", gap: 10 }}>{data.text.map(provider => <div key={provider.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderTop: "1px solid #30343e", paddingTop: 12 }}><div><b>{provider.label}</b><div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 4 }}>{provider.id} · {provider.model}</div></div><span style={{ color: "#c5d78c", fontSize: 12 }}>Allowlisted & configured</span></div>)}</div> : <p style={{ color: "#f0b6a8" }}>No active provider key found in the current allowlist.</p>}
        <p style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>{data?.note ?? "Configured does not mean live-tested."}</p>
        <button type="button" onClick={() => void testProvider()} disabled={testing || loading || !data?.text.length} style={{ marginTop: 10, background: "#d8ee9c", color: "#171a12", border: 0, borderRadius: 9, padding: "11px 16px", fontWeight: 700, cursor: "pointer", opacity: testing || loading || !data?.text.length ? .5 : 1 }}>{testing ? "Testing provider…" : "Run text-provider test"}</button>
        {result && <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 9, background: "#20242d", color: result.ok ? "#c5d78c" : "#ffb6a8", fontSize: 13 }}>{result.ok ? `Connection passed: ${result.provider} / ${result.model} · ${result.latencyMs} ms` : result.error}</div>}
        <p style={{ color: "#777e8b", fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>A test sends one short request and consumes the selected provider's quota. The default route is OpenRouter's free-model selector; other providers must be explicitly added to AI_TEXT_PROVIDER_ORDER.</p>
      </section>

      <section style={{ border: "1px solid #30343e", background: "#151820", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Media providers</h2>
        {[{ label: "Image generation", item: data?.image }, { label: "Video generation", item: data?.video }, { label: "Text-to-speech", item: data?.speech }].map(({ label, item }) => <div key={label} style={{ borderTop: "1px solid #30343e", padding: "12px 0" }}><b>{label}</b><div style={{ color: "#f0b6a8", fontSize: 12, marginTop: 4 }}>Adapter pending · {item?.configured ? "key present" : "not configured"}</div><p style={{ color: "#a1a1aa", fontSize: 12, margin: "5px 0 0" }}>{item?.note}</p></div>)}
      </section>

      <section style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 1.7 }}>
        <b style={{ color: "#e4e4e7" }}>Free-tier setup</b>
        <p>Set <code>OPENROUTER_API_KEY</code> and <code>AI_TEXT_PROVIDER_ORDER=openrouter</code> in the Preview environment for this Git branch. Do not add a paid provider as fallback unless its billing mode and spend limit are explicitly approved.</p>
        <p>Reference: <a href="https://openrouter.ai/collections/free-models" target="_blank" rel="noreferrer" style={{ color: "#c5d78c" }}>OpenRouter free models</a>.</p>
      </section>
    </div>
  </main>;
}
