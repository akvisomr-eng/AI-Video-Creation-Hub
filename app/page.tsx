const tools = [
  { icon: "✦", title: "Text to video", detail: "Turn an idea into a scene-by-scene plan", tag: "VIDEO" },
  { icon: "▧", title: "Image studio", detail: "Create, retouch, and restyle visuals", tag: "IMAGE" },
  { icon: "◖", title: "Voice & captions", detail: "Narration, subtitles, and language tools", tag: "AUDIO" },
  { icon: "▤", title: "Storyboard", detail: "Shape a 30-second story before rendering", tag: "PLAN" },
];

export default function Home() {
  return <main className="shell">
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-mark">✳</span><span>AI Video <b>Hub</b></span></a>
      <div className="side-label">WORKSPACE</div>
      <a className="nav-item active" href="#home"><span>⌂</span> Overview</a>
      <a className="nav-item" href="#projects"><span>▧</span> My projects <small>0</small></a>
      <a className="nav-item" href="#studio"><span>✦</span> Create studio</a>
      <a className="nav-item" href="#assets"><span>▤</span> Media library</a>
      <div className="side-label second">MANAGE</div>
      <a className="nav-item" href="#usage"><span>◷</span> Usage & credits</a>
      <a className="nav-item" href="#settings"><span>⚙</span> Settings</a>
      <div className="sidebar-bottom"><div className="plan-card"><span className="plan-icon">✧</span><b>Free workspace</b><p>Start creating with available free tools. Provider limits will be shown transparently.</p><a href="#usage">View usage →</a></div><div className="profile"><div className="profile-avatar">C</div><div><b>Creator workspace</b><small>Local preview</small></div><span className="dots">•••</span></div></div>
    </aside>
    <section className="content" id="home">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> Overview</div><div className="top-actions"><span className="status-dot"/> <span className="status-text">Workspace ready</span><button className="avatar-small" aria-label="Profile">C</button></div></header>
      <div className="welcome"><div><div className="eyebrow"><span className="spark">✳</span> YOUR CREATIVE SPACE</div><h1>Make something<br/><em>extraordinary.</em></h1><p>From a spark of an idea to a story worth sharing.<br className="desktop-break"/> Your creative workflow starts here.</p><a className="primary-button" href="#studio"><span>＋</span> Start a new creation <span className="arrow">↗</span></a></div><div className="hero-art" aria-label="Abstract creative gradient artwork"><div className="orb orb-one"/><div className="orb orb-two"/><div className="orb orb-three"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-caption"><span>CREATIVE ENGINE</span><b>Ideas into motion.</b></div></div></div>
      <div className="section-heading" id="studio"><div><div className="eyebrow">CREATE YOUR WAY</div><h2>What are we making today?</h2></div><a className="text-link" href="#projects">All projects <span>↗</span></a></div>
      <div className="tool-grid">{tools.map((tool) => <a className="tool-card" href="#new-project" key={tool.title}><div className="tool-top"><span className="tool-icon">{tool.icon}</span><span className="tool-tag">{tool.tag}</span></div><h3>{tool.title}</h3><p>{tool.detail}</p><span className="card-arrow">↗</span></a>)}</div>
      <section className="project-section" id="projects"><div className="section-heading"><div><div className="eyebrow">YOUR CANVAS</div><h2>Recent projects</h2></div><span className="muted">0 projects</span></div><div className="empty-state"><div className="empty-icon">▧</div><h3>Your next idea belongs here.</h3><p>Create a project to organize prompts, storyboards, assets, and generation jobs in one place.</p><a href="#studio" className="secondary-button">Create your first project <span>↗</span></a></div></section>
      <footer><span>AI VIDEO CREATION HUB</span><span>Built for ideas in motion · <a href="#settings">Settings</a></span></footer>
    </section>
  </main>;
}
