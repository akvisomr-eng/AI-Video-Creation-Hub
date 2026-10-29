"use client";

import { useEffect, useRef, useState } from "react";

type Motion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "cinematic-drift";
type Ratio = "16:9" | "9:16" | "1:1";
const motionOptions: { value: Motion; label: string; detail: string }[] = [
  { value: "zoom-in", label: "Slow push-in", detail: "Build focus on the subject" },
  { value: "zoom-out", label: "Reveal", detail: "Ease outward to reveal the scene" },
  { value: "pan-left", label: "Pan left", detail: "Create a gentle lateral move" },
  { value: "pan-right", label: "Pan right", detail: "Move across the composition" },
  { value: "cinematic-drift", label: "Cinematic drift", detail: "Combine a subtle zoom and drift" },
];

export default function VideoMotionStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [motion, setMotion] = useState<Motion>("cinematic-drift");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [duration, setDuration] = useState(5);
  const [loaded, setLoaded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Choose an image to start animating it.");
  const [progress, setProgress] = useState(0);

  function dimensions(selectedRatio: Ratio) {
    if (selectedRatio === "9:16") return { width: 540, height: 960 };
    if (selectedRatio === "1:1") return { width: 720, height: 720 };
    return { width: 960, height: 540 };
  }

  function drawFrame(progressValue: number) {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.naturalWidth || !image.naturalHeight) return;
    const { width, height } = dimensions(ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#090a0f";
    ctx.fillRect(0, 0, width, height);
    const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    let scale = coverScale;
    let x = (width - image.naturalWidth * scale) / 2;
    let y = (height - image.naturalHeight * scale) / 2;
    const t = Math.max(0, Math.min(1, progressValue));
    const zoom = motion === "zoom-in" ? 1 + 0.13 * t
      : motion === "zoom-out" ? 1.13 - 0.13 * t
      : motion === "cinematic-drift" ? 1.06 + 0.06 * t : 1.04;
    scale *= zoom;
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const baseX = (width - renderedWidth) / 2;
    const baseY = (height - renderedHeight) / 2;
    const travelX = Math.max(0, renderedWidth - width) * 0.8;
    const travelY = Math.max(0, renderedHeight - height) * 0.35;
    if (motion === "pan-left") x = baseX + travelX * (0.5 - t);
    else if (motion === "pan-right") x = baseX - travelX * (0.5 - t);
    else if (motion === "cinematic-drift") {
      x = baseX + Math.sin(t * Math.PI) * Math.min(24, travelX * 0.12);
      y = baseY - Math.sin(t * Math.PI) * Math.min(18, travelY * 0.12);
    } else {
      x = baseX;
      y = baseY;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, x, y, renderedWidth, renderedHeight);
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.18, width / 2, height / 2, width * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  useEffect(() => {
    if (!loaded) return;
    let start = performance.now();
    const animate = (now: number) => {
      const t = ((now - start) % (duration * 1000)) / (duration * 1000);
      drawFrame(t);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [loaded, motion, ratio, duration]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
  }, []);

  function loadImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("Please choose a valid image file."); return; }
    if (file.size > 25 * 1024 * 1024) { setStatus("Image limit is 25 MB."); return; }
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setFileName(file.name);
      setLoaded(true);
      setStatus("Ready. Preview motion, then export a WebM clip.");
    };
    image.onerror = () => setStatus("This image could not be opened by the browser.");
    image.src = url;
  }

  async function exportClip() {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || recording) return;
    if (!("MediaRecorder" in window) || !canvas.captureStream) {
      setStatus("This browser does not support local video recording. Try a recent Chrome or Edge.");
      return;
    }
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setStatus("No supported WebM recording format was found in this browser."); return; }
    setRecording(true);
    setProgress(0);
    setStatus("Rendering your image animation locally…");
    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setStatus("Recording failed. Try a shorter clip or another browser.");
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/\.[^.]+$/, "") || "image-motion"}-${ratio.replace(":", "x")}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setProgress(100);
      setStatus("Export complete. Your WebM clip was created in this browser; no image was uploaded.");
    };
    recorder.start(100);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / (duration * 1000));
      drawFrame(t);
      setProgress(Math.round(t * 100));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else recorder.stop();
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  return <main className="motion-studio">
    <header className="motion-header">
      <a href="/" className="motion-back">← Workspace</a>
      <div><span className="motion-eyebrow">AI VIDEO CREATION HUB</span><h1>Image to Motion</h1><p>Turn a still image into a moving video clip — privately, right in your browser.</p></div>
      <span className="motion-local"><span /> LOCAL MODE</span>
    </header>
    <div className="motion-layout">
      <section className="motion-preview-panel">
        <div className="motion-preview-top"><span>LIVE PREVIEW</span><span>{ratio} · {duration}s</span></div>
        <div className={`motion-canvas-wrap ratio-${ratio.replace(":", "-")}`}>
          <canvas ref={canvasRef} aria-label="Animated image preview" />
          {!loaded && <div className="motion-empty"><span>✧</span><h2>Give a still image a little life.</h2><p>Upload a photo, artwork, or product image to create a gentle camera move.</p></div>}
        </div>
        <div className="motion-preview-footer"><span>{loaded ? fileName : "No image selected"}</span><span>{recording ? `Rendering ${progress}%` : "Original file stays on your device"}</span></div>
        {recording && <div className="motion-progress"><span style={{ width: `${progress}%` }} /></div>}
      </section>
      <aside className="motion-controls">
        <div className="motion-step"><span>01</span><div><h2>Choose your image</h2><p>JPG, PNG, WebP or another browser-supported image · max 25 MB</p></div></div>
        <label className="motion-upload"><input type="file" accept="image/*" onChange={(event) => loadImage(event.target.files?.[0])} /><span>＋</span><b>{loaded ? "Replace image" : "Upload image"}</b><small>Choose a file from your device</small></label>
        <div className="motion-divider" />
        <div className="motion-step"><span>02</span><div><h2>Choose motion</h2><p>Camera movement is generated locally, not by a generative AI model.</p></div></div>
        <div className="motion-options">{motionOptions.map((option) => <button type="button" key={option.value} className={motion === option.value ? "motion-option selected" : "motion-option"} onClick={() => setMotion(option.value)}><span className={`motion-option-icon ${option.value}`}>↗</span><span><b>{option.label}</b><small>{option.detail}</small></span><span className="motion-radio">{motion === option.value ? "●" : "○"}</span></button>)}</div>
        <div className="motion-divider" />
        <div className="motion-step"><span>03</span><div><h2>Set the format</h2><p>Pick a destination aspect ratio and clip length.</p></div></div>
        <label className="motion-field">Aspect ratio<select value={ratio} onChange={(event) => setRatio(event.target.value as Ratio)}><option value="16:9">16:9 · YouTube / landscape</option><option value="9:16">9:16 · Reels / Shorts / TikTok</option><option value="1:1">1:1 · Square social post</option></select></label>
        <label className="motion-field">Duration <strong>{duration} seconds</strong><input type="range" min="3" max="10" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
        <button className="motion-export" type="button" disabled={!loaded || recording} onClick={exportClip}>{recording ? "Rendering clip…" : "Export video · WebM"} <span>↗</span></button>
        <p className="motion-status" role="status">{status}</p>
        <p className="motion-note">This creates a real WebM file using animated camera movement. It does not yet synthesize new subject motion, generate AI frames, or export MP4. Those require additional model/rendering integrations.</p>
      </aside>
    </div>
    <footer className="motion-footer"><span>IMAGE TO MOTION STUDIO</span><span>Hybrid by design · Local-first creative tools</span></footer>
  </main>;
}
