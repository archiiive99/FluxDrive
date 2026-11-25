// libraries.dev components mounted as small React islands on the static page.
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceBeam } from 'voice-glow';
import { ThinkingOrb } from 'thinking-orbs';
import { DistortionWave } from 'distortion-waves';

// a pane is "busy" while its demo plays (app.js sets data-busy)
function useBusy(el) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const mo = new MutationObserver(() => setBusy(!!el.dataset.busy));
    mo.observe(el, { attributes: true, attributeFilter: ['data-busy'] });
    return () => mo.disconnect();
  }, [el]);
  return busy;
}

// orb + label in the pane corner, and the voice beam along the pane's bottom edge
function PaneFx({ pane }) {
  const busy = useBusy(pane);
  const level = useRef(0);
  useEffect(() => {
    let raf; const tick = (t) => { const target = busy ? 0.55 + 0.25 * Math.sin(t / 260) + 0.15 * Math.sin(t / 97) : 0; level.current += (target - level.current) * 0.08; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [busy]);
  return (
    <>
      <div className="pane-beam">
        <VoiceBeam level={() => level.current} processing={busy} colorVariant="colorful" theme="dark" strength={0.9}>
          <div className="pane-beam__shape" />
        </VoiceBeam>
      </div>
      <div className="orb2">
        <ThinkingOrb state={busy ? 'solving' : 'breathing'} size={20} dark />
        <span>{busy ? 'Computing' : 'Live'}</span>
      </div>
    </>
  );
}

// idea card: the usual regressed plan, then the wave carries it into FluxDrive's grid
function IdeaWave() {
  const [on, setOn] = useState(false);
  const btn = useRef(null);
  const before = (
    <div className="wave-view wave-view--before">
      <h3>A car cuts in. The usual planner keeps its path.</h3>
      <p className="muted">It detects the car, but scores a few fixed candidates and drives into where the car will be.</p>
      <div className="dgwell dgwell--flat" dangerouslySetInnerHTML={{ __html: window.FDiagram ? window.FDiagram.scene("before") : "" }} />
    </div>
  );
  const after = (
    <div className="wave-view wave-view--after">
      <h3>FluxDrive plans around where that car will be.</h3>
      <p className="muted">The forecast footprint becomes cost, so the plan slows behind the car instead of meeting it.</p>
      <div className="dgwell dgwell--flat" dangerouslySetInnerHTML={{ __html: window.FDiagram ? window.FDiagram.scene("after") : "" }} />
    </div>
  );
  return (
    <DistortionWave
      revealed={on}
      source={btn}
      type="vertical"
      palette="colorful"
      revealedContent={after}
      overlay={<button ref={btn} className="btn wave-btn" onClick={() => setOn(v => !v)}>{on ? 'Back to the usual planner' : 'Plan with FluxDrive'}</button>}
      style={{ width: '100%', borderRadius: 24, overflow: 'hidden' }}
    >
      {before}
    </DistortionWave>
  );
}

document.querySelectorAll('.demo__pane').forEach(pane => {
  const host = document.createElement('div'); host.className = 'pane-fx'; pane.appendChild(host);
  createRoot(host).render(<PaneFx pane={pane} />);
});
// hero name: touching it makes it lean toward the pointer and an aurora spreads inside its box
function NameAurora({ el }) {
  const level = useRef(0), target = useRef(0);
  useEffect(() => {
    let raf, last = null;
    const move = e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      const sp = last ? Math.hypot(e.clientX - last[0], e.clientY - last[1]) : 0; last = [e.clientX, e.clientY];
      target.current = Math.min(1, 0.45 + sp / 40);
      el.style.setProperty('--tx', (x * 10).toFixed(2) + 'px'); el.style.setProperty('--ty', (y * 6).toFixed(2) + 'px');
      el.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg');
    };
    const leave = () => { target.current = 0; last = null; ['--tx', '--ty', '--rx', '--ry'].forEach(k => el.style.setProperty(k, '0')); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); el.addEventListener('pointerdown', () => { target.current = 1; });
    const tick = t => { const rest = 0.55 + 0.15 * Math.sin(t / 900); level.current += (Math.max(rest, target.current) - level.current) * 0.06; target.current *= 0.985; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    // clip the aurora to the letters: a mask image of the word in the same font, size and spacing
    const host = el.querySelector('.aurora-host');
    const paintMask = () => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el), dpr = 2;
      const cv = document.createElement('canvas'); cv.width = Math.ceil(r.width * dpr); cv.height = Math.ceil(r.height * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
      if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing;
      const m = g.measureText(el.firstChild.textContent), pl = parseFloat(cs.paddingLeft), base = (r.height + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      g.fillText(el.firstChild.textContent, pl, base);
      const url = `url(${cv.toDataURL()})`; host.style.webkitMaskImage = host.style.maskImage = url; host.style.webkitMaskSize = host.style.maskSize = '100% 100%';
    };
    document.fonts && document.fonts.ready.then(paintMask); paintMask(); addEventListener('resize', paintMask);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); removeEventListener('resize', paintMask); };
  }, [el]);
  return (
    <VoiceBeam level={() => level.current} colorVariant="colorful" theme="dark" strength={1} reach={3.2} spread={2.2} flow={80} idle={0.7}>
      <div className="aurora-shape" />
    </VoiceBeam>
  );
}
function mountAurora(scope) {
  scope.querySelectorAll('[data-aurora]').forEach(el => {
    if (el.querySelector('.aurora-host')) return;
    const host = document.createElement('span'); host.className = 'aurora-host'; host.setAttribute('aria-hidden', 'true'); el.appendChild(host);
    createRoot(host).render(<NameAurora el={el} />);
  });
}
mountAurora(document);
// results tabs: the wave rises from the tab you pressed and carries one table into the next
function ResultsWave() {
  const src = id => { const el = document.getElementById(id); return el ? el.outerHTML.replace(' hidden', '') : ''; };
  const [views, setViews] = useState([src('t-hugsim'), '']);
  const [on, setOn] = useState(false);
  const [source, setSource] = useState(null);
  const cur = useRef('t-hugsim'), busy = useRef(false);
  useEffect(() => {
    window.FDResults = { go: (id, btn) => {
      if (id === cur.current) return; cur.current = id; setSource(btn);
      setViews(v => { const n = [...v]; n[on ? 0 : 1] = src(id); return n; });
      requestAnimationFrame(() => setOn(o => !o));
    } };
  }, [on]);
  const view = html => <div className="rw-view" dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <DistortionWave revealed={on} source={source || undefined} type="vertical" palette="colorful"
      revealedContent={view(views[1])} onFinish={() => setViews(v => { const n = [...v]; n[on ? 0 : 1] = ''; return n; })}
      style={{ width: '100%', borderRadius: 24, overflow: 'hidden' }}>
      {view(views[0])}
    </DistortionWave>
  );
}
const rw = document.getElementById('results-wave');
if (rw) createRoot(rw).render(<ResultsWave />);

// Flux / Gaussian: the wave passes over the grid as the forecast changes
function FluxWave({ canvas }) {
  const host = useRef(null), wave = useRef(null);
  useEffect(() => { host.current.appendChild(canvas); window.FDFluxWave = { play: btn => wave.current && wave.current.play({ source: btn }) }; }, [canvas]);
  return (
    <DistortionWave ref={wave} type="horizontal" palette="colorful" style={{ width: '100%', borderRadius: 14, overflow: 'hidden' }}>
      <div ref={host} />
    </DistortionWave>
  );
}
const fluxCanvas = document.querySelector('#demo-flux canvas[data-canvas]');
if (fluxCanvas) { const holder = document.createElement('div'); holder.className = 'fw-host'; fluxCanvas.parentNode.insertBefore(holder, fluxCanvas); createRoot(holder).render(<FluxWave canvas={fluxCanvas} />); }

// hero: a calm first screen; Browse sends the wave across it and switches the driving world on
function HeroWave() {
  const [on, setOn] = useState(() => document.body.classList.contains('world-on'));
  const btn = useRef(null), root = useRef(null);
  useEffect(() => { mountAurora(root.current); }, [on]);
  const centre = (
    <div className="hero-center">
      <h1 id="hero-head"><span className="t-name" data-aurora>FluxDrive</span><span className="t-rest">Differentiable Flux Forecasting and Planning <br />for End&#8209;to&#8209;End Autonomous Driving</span></h1>
      <p className="authors"><span>Jaeha Song<sup>1</sup></span><span>Jinhee Na<sup>2</sup></span><span>Hawook Jeong<sup>2</sup></span><span>Soonmin Hwang<sup>1</sup></span></p>
      <p className="affil"><span><sup>1</sup>Hanyang University</span><span><sup>2</sup>RideFlux</span></p>
      <div className="actions">
        <a className="btn btn--ghost is-soon" aria-disabled="true" title="Coming soon">Paper</a>
        <a className="btn btn--ghost" href="https://github.com/archiiive99/FluxDrive">Code</a>
      </div>
    </div>
  );
  const finish = r => { if (!r) return; document.body.classList.add('world-on'); document.documentElement.classList.remove('gated'); };
  return (
    <div ref={root}>
      <DistortionWave revealed={on} source={btn} type="vertical" palette="colorful" onFinish={finish}
        revealedContent={<div className="hero-view hero-view--world"><video className="hero-reel" src="assets/video/hero_reel.mp4?v=3" poster="assets/img/hero_reel.jpg" autoPlay muted loop playsInline /><div className="hero-shade" />{centre}</div>}
        overlay={<button ref={btn} className="btn hero-browse" onClick={(e) => { const el = e.currentTarget; el.classList.add("leaving"); setTimeout(() => el.classList.add("gone"), 950); if (on) { finish(true); } else { setOn(true); setTimeout(() => { if (!document.body.classList.contains('world-on')) finish(true); }, 2200); } }}>Browse</button>}
        style={{ width: '100%', height: '100svh', overflow: 'hidden' }}>
        <div className="hero-view hero-view--calm"><canvas className="flowbg" data-dw-live /> {centre}</div>
      </DistortionWave>
    </div>
  );
}
const hw = document.getElementById('hero-wave');
if (hw) createRoot(hw).render(<HeroWave />);

const idea = document.getElementById('idea-wave');
if (idea) createRoot(idea).render(<IdeaWave />);
