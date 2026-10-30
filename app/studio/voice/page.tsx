import Link from "next/link";

const modules = [
  ["Voiceover studio","Write or import narration and prepare voice direction."],
  ["Text to speech","Choose language, voice, tone, and speaking pace."],
  ["Captions & subtitles","Prepare timed captions and subtitle language variants."],
  ["Audio tools","Organize music, ambience, and sound-effect assets."],
];

export default function VoiceStudioPage() {
  return <main className="studio-entry"><header className="studio-entry-header"><Link href="/" className="brand"><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></Link><Link href="/" className="text-link">← Back to overview</Link></header><div className="studio-entry-hero"><div className="eyebrow">VOICE & CAPTIONS WORKSPACE</div><h1>Give every scene<br/><em>a voice.</em></h1><p>A dedicated audio workspace for narration planning, text-to-speech direction, captions, subtitles, and sound assets.</p></div><div className="studio-entry-grid"><section className="studio-entry-main"><div className="eyebrow">AUDIO PRODUCTION MODULES</div><h2>Build the sound of your story.</h2>{modules.map(([title,description],i)=><div className="studio-step" key={title}><span>0{i+1}</span><div><b>{title}</b><p>{description}</p></div></div>)}</section><aside className="studio-entry-steps"><div className="eyebrow">AVAILABILITY</div><h2>Audio generation is not connected yet.</h2><p className="editor-help">This is a separate feature workspace. The current release can prepare project storyboards and narration text, but it does not synthesize voice audio or generate timed subtitle files yet.</p><div className="studio-capability-note"><b>No simulated output</b><p>Voice provider integration, audio preview, subtitle timing, and export will be enabled only after a real provider and end-to-end workflow are verified.</p></div><p style={{marginTop:20}}><Link className="primary-button" href="/studio/text-to-video">Open Text to Video <span>↗</span></Link></p></aside></div></main>;
}