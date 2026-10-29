"use client";

import { useEffect, useRef, useState } from "react";

type Preset = "natural" | "portrait" | "product" | "vintage" | "mono";
type Ratio = "original" | "1:1" | "4:5" | "3:2" | "16:9" | "9:16";

const PRESETS: { id: Preset; name: string; description: string; values: { brightness: number; contrast: number; saturation: number; warmth: number; sharpness: number; grayscale: number; sepia: number } }[] = [
  { id: "natural", name: "Natural", description: "Balanced everyday enhancement", values: { brightness: 0, contrast: 4, saturation: 5, warmth: 1, sharpness: 8, grayscale: 0, sepia: 0 } },
  { id: "portrait", name: "Portrait", description: "Soft, warm portrait finish", values: { brightness: 5, contrast: -3, saturation: 3, warmth: 8, sharpness: 4, grayscale: 0, sepia: 0 } },
  { id: "product", name: "Product", description: "Crisp contrast and clean color", values: { brightness: 3, contrast: 12, saturation: 8, warmth: 0, sharpness: 16, grayscale: 0, sepia: 0 } },
  { id: "vintage", name: "Vintage", description: "Warm faded film character", values: { brightness: 4, contrast: -8, saturation: -12, warmth: 16, sharpness: 0, grayscale: 0, sepia: 22 } },
  { id: "mono", name: "Monochrome", description: "Black-and-white tonal treatment", values: { brightness: 2, contrast: 8, saturation: -100, warmth: 0, sharpness: 5, grayscale: 100, sepia: 0 } },
];

const DEFAULTS = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0, grayscale: 0, sepia: 0 };

export default function PhotoRetouchStudio() {
  const [source, setSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState("retouched-photo");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [preset, setPreset] = useState<Preset>("natural");
  const [values, setValues] = useState(DEFAULTS);
  const [ratio, setRatio] = useState<Ratio>("original");
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"image/png" | "image/jpeg">("image/jpeg");
  const [message, setMessage] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const cssFilter = useMemo(() => `brightness(${Math.max(0.1, 1 + values.brightness / 100)}) contrast(${Math.max(0.1, 1 + values.contrast / 100)}) saturate(${Math.max(0, 1 + values.saturation / 100)}) grayscale(${values.grayscale}%) sepia(${values.sepia}%)`, [values]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!source || !imageLoaded || !image || !canvas || !image.complete || !image.naturalWidth) return;
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const rotated = Math.abs(rotation % 180) === 90;
    const orientedWidth = rotated ? sourceHeight : sourceWidth;
    const orientedHeight = rotated ? sourceWidth : sourceHeight;
    let cropWidth = orientedWidth;
    let cropHeight = orientedHeight;
    const targetRatio = ratio === "original" ? orientedWidth / orientedHeight : ratio === "1:1" ? 1 : ratio === "4:5" ? 4 / 5 : ratio === "3:2" ? 3 / 2 : ratio === "16:9" ? 16 / 9 : 9 / 16;
    if (orientedWidth / orientedHeight > targetRatio) cropWidth = orientedHeight * targetRatio;
    else cropHeight = orientedWidth / targetRatio;
    canvas.width = Math.max(1, Math.round(cropWidth));
    canvas.height = Math.max(1, Math.round(cropHeight));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, 1);
    ctx.filter = `brightness(${Math.max(0.1, 1 + values.brightness / 100)}) contrast(${Math.max(0.1, 1 + values.contrast / 100)}) saturate(${Math.max(0, 1 + values.saturation / 100)}) grayscale(${values.grayscale}%) sepia(${values.sepia}%)`;
    const drawWidth = rotated ? sourceHeight : sourceWidth;
    const drawHeight = rotated ? sourceWidth : sourceHeight;
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.filter = "none";
    if (values.warmth !== 0) {
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = values.warmth > 0 ? `rgba(255, 157, 64, ${Math.abs(values.warmth) / 180})` : `rgba(65, 151, 255, ${Math.abs(values.warmth) / 180})`;
      ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    }
    if (values.sharpness > 0) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.min(0.18, values.sharpness / 500);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    setPreview(canvas.toDataURL("image/jpeg", 0.92));
  }, [source, imageLoaded, values, ratio, rotation, flipX]);

  function loadFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Choose an image file such as JPG, PNG, or WebP."); return; }
    if (file.size > 25 * 1024 * 1024) { setMessage("This browser-based editor supports files up to 25 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setImageLoaded(false);\n      setSource(String(reader.result));
      setFileName(file.name.replace(/\.[^.]+$/, "") || "retouched-photo");
      setPreset("natural"); setValues(DEFAULTS); setRatio("original"); setRotation(0); setFlipX(false); setMessage("Photo loaded locally. Your original file remains unchanged.");
    };
    reader.readAsDataURL(file);
  }

  function applyPreset(nextPreset: Preset) {
    const selected = PRESETS.find((item) => item.id === nextPreset);
    if (!selected) return;
    setPreset(nextPreset); setValues(selected.values);
  }

  function resetEdits() {
    setPreset("natural"); setValues(DEFAULTS); setRatio("original"); setRotation(0); setFlipX(false); setMessage("Edits reset. Your source photo is unchanged.");
  }

  function exportImage() {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const mime = exportFormat;
    const link = document.createElement("a");
    link.href = canvas.toDataURL(mime, 0.94);
    link.download = `${fileName}-retouched.${mime === "image/png" ? "png" : "jpg"}`;
    link.click();
    setMessage("Retouched image exported to your device.");
  }

  function updateValue(key: keyof typeof DEFAULTS, value: number) {
    setPreset("natural");
    setValues((current) => ({ ...current, [key]: value }));
  }

  return <main className="retouch-page">
    <header className="retouch-header">
      <a className="brand" href="/"><span className="brand-mark">✳</span><span>AI Video <b>Creator</b></span></a>
      <nav><a href="/">Workspace</a><span>/</span><strong>Photo retouch</strong></nav>
      <span className="retouch-local"><i /> LOCAL EDITING</span>
    </header>
    <section className="retouch-intro">
      <div><div className="eyebrow"><span className="spark">✳</span> IMAGE STUDIO / RETOUCH</div><h1>Make every detail<br/><em>feel intentional.</em></h1><p>Refine color, tone, crop, and composition with a lightweight photo editor. Your photo stays in this browser until you export it.</p></div>
      <div className="retouch-stats"><span>01 <small>OPEN</small></span><span>02 <small>REFINE</small></span><span>03 <small>EXPORT</small></span></div>
    </section>

    {!source ? <section className="retouch-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]); }}>
      <div className="retouch-upload-icon">↥</div><h2>Bring a photo into the studio</h2><p>JPG, PNG, or WebP · up to 25 MB · processing happens locally in your browser</p>
      <label className="primary-button">Choose photo <span>↗</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => loadFile(event.target.files?.[0])} hidden /></label>
      <span className="retouch-drop-hint">or drag and drop an image here</span>
    </section> : <section className="retouch-workspace">
      <div className="retouch-preview-panel">
        <div className="retouch-panel-top"><div><span className="eyebrow">CANVAS PREVIEW</span><strong>{fileName}</strong><small>{dimensions.width || imageRef.current?.naturalWidth || 0} × {dimensions.height || imageRef.current?.naturalHeight || 0} px source</small></div><div className="preview-actions"><button className={showOriginal ? "secondary-button selected" : "secondary-button"} onClick={() => setShowOriginal((current) => !current)}>{showOriginal ? "Show edit" : "Compare original"}</button><button className="icon-button" onClick={resetEdits} title="Reset edits" aria-label="Reset edits">↺</button></div></div>
        <div className="retouch-canvas-wrap">{showOriginal ? <img src={source} alt="Original photo" className="retouch-image" /> : preview ? <img src={preview} alt="Retouched photo preview" className="retouch-image" /> : <div className="retouch-loading">Preparing preview…</div>}</div>
        <div className="retouch-preview-foot"><span>{showOriginal ? "ORIGINAL · UNCHANGED" : "EDITED PREVIEW"}</span><span>{ratio === "original" ? "Original ratio" : `Crop ${ratio}`}</span></div>
        <div className="retouch-export-row"><label>Export format<select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as "image/png" | "image/jpeg")}><option value="image/jpeg">JPEG · smaller file</option><option value="image/png">PNG · lossless</option></select></label><button className="primary-button" onClick={exportImage}>Export photo <span>↓</span></button></div>
      </div>

      <aside className="retouch-controls">
        <div className="retouch-control-heading"><div><span className="eyebrow">EDITING DESK</span><h2>Refine your image</h2></div><button className="text-link" onClick={resetEdits}>Reset all ↺</button></div>
        <div className="retouch-control-section"><div className="retouch-section-title"><b>01 / LOOKS</b><span>One-click presets</span></div><div className="retouch-presets">{PRESETS.map((item) => <button key={item.id} className={preset === item.id ? "retouch-preset active" : "retouch-preset"} onClick={() => applyPreset(item.id)}><span className={`preset-swatch preset-${item.id}`}>{item.id === "mono" ? "◐" : item.id === "portrait" ? "◉" : item.id === "product" ? "◇" : item.id === "vintage" ? "◌" : "✳"}</span><b>{item.name}</b><small>{item.description}</small></button>)}</div></div>
        <div className="retouch-control-section"><div className="retouch-section-title"><b>02 / LIGHT & COLOR</b><span>Fine adjustment</span></div>
          {([{ key: "brightness", label: "Brightness", min: -50, max: 50 }, { key: "contrast", label: "Contrast", min: -50, max: 50 }, { key: "saturation", label: "Saturation", min: -100, max: 100 }, { key: "warmth", label: "Warmth", min: -40, max: 40 }, { key: "sharpness", label: "Clarity", min: 0, max: 100 }] as const).map((control) => <label className="retouch-slider" key={control.key}><span>{control.label}<output>{values[control.key]}</output></span><input type="range" min={control.min} max={control.max} value={values[control.key]} onChange={(event) => updateValue(control.key, Number(event.target.value))}/></label>)}
        </div>
        <div className="retouch-control-section"><div className="retouch-section-title"><b>03 / COMPOSITION</b><span>Crop & orientation</span></div><label className="retouch-field">Aspect ratio<select value={ratio} onChange={(event) => setRatio(event.target.value as Ratio)}><option value="original">Original</option><option value="1:1">Square · 1:1</option><option value="4:5">Portrait · 4:5</option><option value="3:2">Photo · 3:2</option><option value="16:9">Wide · 16:9</option><option value="9:16">Vertical · 9:16</option></select></label><div className="retouch-transform-buttons"><button className="secondary-button" onClick={() => setRotation((current) => (current + 90) % 360)}>↻ Rotate 90°</button><button className={flipX ? "secondary-button selected" : "secondary-button"} onClick={() => setFlipX((current) => !current)}>⇆ Flip</button></div></div>
        <div className="retouch-ai-note"><span>✦</span><div><b>AI restoration & prompt editing</b><p>Face restoration, object removal, colorization, and prompt-guided AI edits need a configured image model. This workspace does not fake those results or upload your photo to an unconfigured service.</p><a href="https://github.com/DJNormality/AI_Generator" target="_blank" rel="noreferrer">Review upstream feature reference ↗</a></div></div>
      </aside>
    </section>}
    {message && <p className="retouch-message" role="status">{message}</p>}
    <footer className="retouch-footer"><span>AI VIDEO CREATOR · IMAGE STUDIO</span><span>Source photo stays unchanged · <a href="https://github.com/DJNormality/AI_Generator" target="_blank" rel="noreferrer">MIT feature reference</a></span></footer>
    {source && <img ref={imageRef} src={source} alt="" className="retouch-source-image" onLoad={(event) => { setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setImageLoaded(true); }} />}
    <canvas ref={canvasRef} className="retouch-source-image" aria-hidden="true" />
  </main>;
}
