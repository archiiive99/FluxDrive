// Orbs: small living dots that show a demo is computing. ASCII band: the driving loop redrawn as characters.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLS = [[150, 160, 255], [226, 120, 200], [255, 196, 140]];

  // ---------- orbs ----------
  const orbs = [];
  for (const pane of document.querySelectorAll('.no-orb')) {
    const wrap = document.createElement('div'); wrap.className = 'orb';
    const cv = document.createElement('canvas'); const lab = document.createElement('span');
    wrap.append(cv, lab); pane.appendChild(wrap);
    const dpr = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = 28 * dpr;
    orbs.push({ pane, cv, lab, g: cv.getContext('2d'), dpr, e: 0 });
  }
  function drawOrb(o, t) {
    const busy = !!o.pane.dataset.busy; o.e += ((busy ? 1 : 0) - o.e) * 0.08;
    o.lab.textContent = busy ? 'computing' : 'live';
    o.pane.classList.toggle('is-busy', busy);
    const g = o.g, s = o.cv.width, c = s / 2; g.clearRect(0, 0, s, s); g.globalCompositeOperation = 'lighter';
    const n = 3 + Math.round(o.e * 3);
    for (let i = 0; i < 6; i++) {
      const on = i < n ? 1 : 0; if (!on) continue;
      const sp = 0.6 + o.e * 2.4, ph = t * sp + (i * Math.PI * 2) / n;
      const r = s * (0.12 + 0.16 * (1 - o.e) * (0.5 + 0.5 * Math.sin(t * 1.3 + i)) + 0.14 * o.e);
      const x = c + Math.cos(ph) * r, y = c + Math.sin(ph * (1 + o.e * 0.3)) * r;
      const col = COLS[i % 3], rr = s * (0.2 - 0.06 * o.e);
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(${col},0.95)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }

  // ---------- ASCII band ----------
  const band = /noreel/.test(location.search) ? null : document.querySelector('[data-ascii]');
  let A = null;
  if (band) {
    const video = document.createElement('video');
    Object.assign(video, { src: band.dataset.ascii, muted: true, loop: true, playsInline: true, autoplay: true });
    video.setAttribute('playsinline', ''); video.play().catch(() => {});
    const cv = band.querySelector('canvas'), g = cv.getContext('2d');
    const small = document.createElement('canvas'), sg = small.getContext('2d', { willReadFrequently: true });
    A = { video, cv, g, small, sg, seen: false, last: 0 };
    new IntersectionObserver(es => { A.seen = es[0].isIntersecting; }).observe(band);
  }
  const RAMP = ' .:-=+*#%@';
  function drawAscii(t) {
    if (!A || !A.seen || A.video.readyState < 2 || t - A.last < 1 / 20) return;
    A.last = t;
    const r = A.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const CH = r.width < 640 ? 8 : 11, cw = CH * 0.62;
    const cols = Math.floor(r.width / cw), rows = Math.floor(r.height / CH);
    if (A.cv.width !== Math.round(r.width * dpr)) { A.cv.width = Math.round(r.width * dpr); A.cv.height = Math.round(r.height * dpr); }
    A.small.width = cols; A.small.height = rows;
    const vw = A.video.videoWidth, vh = A.video.videoHeight, sc = Math.max(cols / vw, rows / (vh * 0.62 * 0 + vh) * 1);
    // cover-crop the video into cols x rows cells (cells are taller than wide)
    const aspect = (cols * cw) / (rows * CH), va = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (va > aspect) { sw = vh * aspect; sx = (vw - sw) / 2; } else { sh = vw / aspect; sy = (vh - sh) / 2; }
    A.sg.drawImage(A.video, sx, sy, sw, sh, 0, 0, cols, rows);
    const d = A.sg.getImageData(0, 0, cols, rows).data, g = A.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    g.font = `500 ${CH}px ui-monospace, "SF Mono", Menlo, monospace`; g.textBaseline = 'top';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = (y * cols + x) * 4, R = d[k], G = d[k + 1], B = d[k + 2];
      const L = (0.3 * R + 0.59 * G + 0.11 * B) / 255; if (L < 0.08) continue;
      const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(L * RAMP.length))];
      const plan = G > R + 45 && B > R + 25 && G > 120;                    // the pastel plan band stays in colour
      const k2 = 0.55 + L * 0.9; g.fillStyle = `rgb(${Math.min(255, R * k2) | 0},${Math.min(255, G * k2) | 0},${Math.min(255, B * k2) | 0})`;
      g.fillText(ch, x * cw, y * CH);
    }
  }

  function loop(now) {
    const t = now / 1000;
    orbs.forEach(o => drawOrb(o, t));
    drawAscii(t);
    if (!still) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

// background: driving clips stacked down the whole page; they scroll with it, and only the ones on screen play
(() => {
  const bg = document.querySelector('.bg'); if (!bg || /noreel/.test(location.search)) return;
  const CLIPS = ['bg1', 'bg2', 'bg3', 'bg4', 'bg5'].map(n => `assets/video/${n}.mp4`);
  const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { rootMargin: "900px 0px" });
  function build() {
    const doc = document.documentElement.scrollHeight, h = Math.max(innerHeight, innerWidth * 9 / 16);
    const n = Math.ceil(doc / h);
    bg.style.height = doc + 'px';
    while (bg.children.length < n) {
      const k = bg.children.length, v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true }); v.setAttribute('playsinline', '');
      v.dataset.src = CLIPS[k % CLIPS.length]; v.poster = v.dataset.src.replace('video', 'img').replace('.mp4', '.jpg'); v.preload = 'none'; bg.appendChild(v); io.observe(v);
    }
    [...bg.children].forEach((v, k) => { v.style.top = k * h + 'px'; v.style.height = h + 'px'; v.hidden = k >= n; });
  }
  build(); addEventListener('resize', build); addEventListener('load', build); setTimeout(build, 1500);
  // the first screen locks the page height; tile again whenever the page grows (Browse, late content)
  new ResizeObserver(() => build()).observe(document.body);
  new MutationObserver(() => setTimeout(build, 50)).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();

// slider fill follows the value
(() => {
  const set = i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%');
  document.querySelectorAll('input[type="range"]').forEach(i => { set(i); i.addEventListener('input', () => set(i)); });
  // values changed from code (Play, scroll-open) also update the fill
  setInterval(() => document.querySelectorAll('input[type="range"]').forEach(set), 150);
})();

// result tabs
(() => {
  const list = document.querySelector('[data-tabs]'); if (!list) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const pick = (t, focus, first) => { tabs.forEach(o => { const on = o === t; o.setAttribute('aria-selected', on); o.tabIndex = on ? 0 : -1; }); if (window.FDResults && !first) window.FDResults.go(t.getAttribute('aria-controls'), t); if (focus) t.focus(); };
  tabs.forEach(t => t.addEventListener('click', () => pick(t)));
  list.addEventListener('keydown', e => { const i = tabs.indexOf(document.activeElement); const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (i >= 0 && k) { e.preventDefault(); pick(tabs[(i + k + tabs.length) % tabs.length], true); } });
  pick(tabs[0], false, true);
})();

// gallery clips play only while on screen
(() => {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: 0.25 });
  document.querySelectorAll('video[data-auto]').forEach(v => io.observe(v));
})();

// segmented bars: one thumb per bar follows the selected button
(() => {
  const bars = [...document.querySelectorAll('.seg')];
  const sel = b => b.querySelector('[aria-selected="true"], [aria-checked="true"], [aria-current="true"]');
  const move = (bar, animate) => {
    const t = bar.querySelector('.thumb'), a = sel(bar); if (!a) return;
    t.style.width = a.offsetWidth + 'px'; t.style.height = a.offsetHeight + 'px';
    t.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
    if (animate) { t.classList.remove('is-moving'); void t.offsetWidth; t.classList.add('is-moving'); }
  };
  bars.forEach(bar => {
    const t = document.createElement('span'); t.className = 'thumb'; t.setAttribute('aria-hidden', 'true'); bar.prepend(t);
    t.style.transition = 'none'; move(bar); requestAnimationFrame(() => { t.style.transition = ''; });
    new MutationObserver(() => move(bar, true)).observe(bar, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'aria-checked', 'aria-current'] });
  });
  addEventListener('resize', () => bars.forEach(b => move(b)));
  document.fonts && document.fonts.ready.then(() => bars.forEach(b => move(b)));
})();

// nav follows the scroll: the drop sits on the section you are reading
(() => {
  const links = [...document.querySelectorAll('.nav__links a')]; if (!links.length) return;
  const MAP = { glance: '#results', idea: '#idea', overview: '#overview', fluid: '#overview', method: '#method', drives: '#results', results: '#results', ascii: '#cite', cite: '#cite' };
  const secs = Object.keys(MAP).map(id => document.getElementById(id)).filter(Boolean);
  let cur = null;
  const spy = () => {
    const y = innerHeight * 0.35; let id = null;
    secs.forEach(s => { if (s.getBoundingClientRect().top <= y) id = s.id; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) id = 'cite';
    const href = id ? MAP[id] : null; if (href === cur) return; cur = href;
    links.forEach(a => { if (a.getAttribute('href') === href) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const bar = document.querySelector('.seg--nav .thumb'); if (bar) bar.style.opacity = href ? 1 : 0;
  };
  addEventListener('scroll', spy, { passive: true }); spy();
})();

// equations typeset with KaTeX
(() => { if (!window.katex) return; document.querySelectorAll('[data-tex]').forEach(el => katex.render(el.dataset.tex, el, { displayMode: false, throwOnError: false })); })();

// first screen: a quiet flow field, particles carried across a faint grid of cells
(() => {
  let cv = null, g = null, P = [], t = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = (x, y) => { const a = Math.sin(x * 0.0021 + t * 0.12) * 1.3 + Math.cos(y * 0.0027 - t * 0.09) * 1.1 + Math.sin((x + y) * 0.0011 + t * 0.05); return [Math.cos(a), Math.sin(a) * 0.6]; };
  function setup() {
    cv = document.querySelector('.flowbg'); if (!cv) return false; g = cv.getContext('2d');
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, r.width, r.height);
    P = Array.from({ length: Math.round(r.width * r.height / 2600) }, () => ({ x: Math.random() * r.width, y: Math.random() * r.height, l: Math.random() * 200 }));
    return true;
  }
  function frame() {
    if (!cv || !cv.isConnected) { if (!setup()) return requestAnimationFrame(frame); }
    const w = cv.clientWidth, h = cv.clientHeight; t += 0.016;
    g.fillStyle = 'rgba(11,11,11,0.06)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.0016)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x < w; x += 48) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); } for (let y = 0; y < h; y += 48) { g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); } g.stroke();
    for (const p of P) {
      const [u, v] = field(p.x, p.y), nx = p.x + u * 0.9, ny = p.y + v * 0.9;
      g.strokeStyle = p.l % 40 < 2 ? 'rgba(0,98,224,0.55)' : 'rgba(230,230,230,0.16)'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke();
      p.x = nx; p.y = ny; p.l++;
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || p.l > 420) { p.x = Math.random() * w; p.y = Math.random() * h; p.l = 0; }
    }
    if (!still) requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { if (cv) setup(); });
  requestAnimationFrame(frame);
  // the driving world switches on with Browse, or once the reader scrolls past the first screen
  const deep = location.hash && location.hash !== '#top' && document.querySelector(location.hash);
  if (deep) { document.body.classList.add('world-on'); const go = () => scrollTo({ top: deep.getBoundingClientRect().top + scrollY - 10, behavior: 'instant' }); [80, 400, 1200].forEach(ms => setTimeout(go, ms)); addEventListener('load', go); }
  else { document.documentElement.classList.add('gated'); scrollTo(0, 0); }
  // only Browse opens the page: wheel, touch and scroll keys do nothing on the first screen
  const locked = () => !document.body.classList.contains('world-on');
  addEventListener('wheel', e => { if (locked()) e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => { if (locked()) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => { if (locked() && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'End', 'Home'].includes(e.key) && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) e.preventDefault(); });
  addEventListener('scroll', () => { if (locked() && scrollY) scrollTo(0, 0); }, { passive: true });
  new MutationObserver(() => { if (document.body.classList.contains('world-on')) document.documentElement.classList.remove('gated'); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();

// scroll cue: a quiet blinking chevron where Browse was, once the world is on
(() => {
  const cue = document.createElement('div');
  cue.className = 'hero-cue'; cue.setAttribute('role', 'button'); cue.setAttribute('aria-label', 'Scroll down');
  cue.addEventListener('click', () => { const t = document.querySelector('.charts') || document.querySelector('main section:nth-of-type(2)'); scrollTo({ top: t ? t.getBoundingClientRect().top + scrollY - 70 : innerHeight, behavior: 'smooth' }); });
  cue.innerHTML = '<svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg>';
  document.body.appendChild(cue);
  const sync = () => cue.classList.toggle('on', document.body.classList.contains('world-on') && scrollY < 80);
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('scroll', sync, { passive: true }); sync();
})();

// result tables: click a column head to sort; rows sort inside their training-data group, a third click restores
document.addEventListener('click', e => {
  const th = e.target.closest('.tablewrap thead th'); if (!th) return;
  const table = th.closest('table'), tb = table.tBodies[0], head = th.parentElement;
  if (th.colSpan > 1 || th.rowSpan > 1 && th.textContent.match(/Method|status|data/i)) return;
  // column index, counting spans in a two-row head
  let col;
  if (table.tHead.rows.length > 1 && head === table.tHead.rows[1]) { const lead = [...table.tHead.rows[0].cells].filter(c => c.rowSpan > 1).length; col = lead + [...head.cells].indexOf(th); }
  else col = [...head.cells].indexOf(th);
  if (col < 0) return;
  [...tb.rows].forEach((r, i) => { if (r.dataset.i == null) r.dataset.i = i; });
  const state = th.dataset.sort === 'a' ? 'b' : th.dataset.sort === 'b' ? '' : 'a';
  table.querySelectorAll('thead th').forEach(h => delete h.dataset.sort); if (state) th.dataset.sort = state;
  const low = /↓/.test(th.textContent), num = r => { const t = r.cells[col]?.textContent.replace(/[^\d.\-]/g, ''); return t === '' || t == null ? -Infinity : +t; };
  const dir = (state === 'a') !== low ? -1 : 1;     // first click: best first
  const rows = [...tb.rows], out = []; let seg = [];
  const flush = () => { seg.sort((x, y) => state ? (num(x) - num(y)) * dir || x.dataset.i - y.dataset.i : x.dataset.i - y.dataset.i); out.push(...seg); seg = []; };
  rows.forEach(r => { if (r.classList.contains('grp')) { flush(); out.push(r); } else seg.push(r); }); flush();
  // FLIP: rows glide from their old place to the new one
  const before = new Map(rows.map(r => [r, r.getBoundingClientRect().top]));
  out.forEach(r => tb.appendChild(r));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  rows.forEach(r => { const d = before.get(r) - r.getBoundingClientRect().top; if (!d) return;
    r.getAnimations().forEach(a => a.cancel());
    r.animate([{ transform: `translateY(${d}px)` }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.22,.8,.24,1)' }); });
});
