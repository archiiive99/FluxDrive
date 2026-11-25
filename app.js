// FluxDrive page: nav glass + four live demos on one bird's-eye-view grid.
(() => {
  const nav = document.querySelector('[data-nav]');
  const hero = document.querySelector('.hero');
  const setNav = () => nav.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 120);
  setNav(); addEventListener('scroll', setNav, { passive: true });

  // ---------- grid + colours ----------
  const W = 30, H = 20, CELL = 24, T = 30, DT = 0.2;      // 30 x 20 cells, 30 steps of 0.2 s
  const css = getComputedStyle(document.documentElement);
  const C = { bg: '#0e0e0e', grid: 'rgba(255,255,255,0.05)', car: [150, 160, 255], ego: [255, 196, 140], cost: [226, 120, 200], ink: 'rgba(245,242,236,0.92)', muted: 'rgba(200,205,225,0.6)' };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const idx = (x, y) => y * W + x;

  // exact area of a box inside each cell
  function raster(box, out = new Float32Array(W * H)) {
    const x0 = box.x - box.w / 2, x1 = box.x + box.w / 2, y0 = box.y - box.h / 2, y1 = box.y + box.h / 2;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) {
      const oy = Math.min(y1, y + 1) - Math.max(y0, y); if (oy <= 0) continue;
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) {
        const ox = Math.min(x1, x + 1) - Math.max(x0, x); if (ox > 0) out[idx(x, y)] += ox * oy;
      }
    }
    return out;
  }
  function blur(f, s) {
    if (s < 0.05) return f;
    const r = Math.ceil(s * 3), k = []; let sum = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * s * s)); k.push(v); sum += v; }
    for (let i = 0; i < k.length; i++) k[i] /= sum;
    const a = new Float32Array(W * H), b = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < W) v += f[idx(xx, y)] * k[i + r]; } a[idx(x, y)] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let i = -r; i <= r; i++) { const yy = y + i; if (yy >= 0 && yy < H) v += a[idx(x, yy)] * k[i + r]; } b[idx(x, y)] = v; }
    return b;
  }
  const at = (car, t) => ({ ...car, x: car.x + car.vx * t, y: car.y + car.vy * t });
  // forecast of all cars at step t: flux keeps the box, gaussian spreads it
  function forecast(cars, t, mode = 'flux') {
    const f = new Float32Array(W * H);
    for (const c of cars) {
      if (mode === 'flux') raster(at(c, t), f);
      else { const g = blur(raster({ ...c, x: c.x + c.vx * t, y: c.y + c.vy * t }), 0.08 + 0.13 * t * Math.hypot(c.vx, c.vy) + 0.03 * t); for (let i = 0; i < f.length; i++) f[i] += g[i]; }
    }
    return f;
  }
  function overlap(f, ew, eh) {        // ego footprint (ew x eh cells) centred on each cell
    const o = new Float32Array(W * H), hx = Math.floor(ew / 2), hy = Math.floor(eh / 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 0;
      for (let j = -hy; j < eh - hy; j++) for (let i = -hx; i < ew - hx; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && xx < W && yy >= 0 && yy < H) v += f[idx(xx, yy)]; }
      o[idx(x, y)] = v;
    }
    return o;
  }
  function dilate(f, r) { if (!r) return f; let g = f; for (let k = 0; k < r; k++) { const n = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = g[idx(x, y)]; if (x) m = Math.max(m, g[idx(x - 1, y)]); if (x < W - 1) m = Math.max(m, g[idx(x + 1, y)]); if (y) m = Math.max(m, g[idx(x, y - 1)]); if (y < H - 1) m = Math.max(m, g[idx(x, y + 1)]); n[idx(x, y)] = m * (k ? 1 : 0.85); } g = n; } return g; }

  // Flux Value Iteration: ego probability moves across faces (4 neighbours + stay), every path summed
  const MOVES = [[0, 0], [0, -1], [-1, 0], [1, 0], [0, 1]];
  function fvi(costAt, start, goal, temp, N) {
    const V = []; let next = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) next[idx(x, y)] = -3 * (Math.abs(x - goal[0]) + Math.abs(y - goal[1]));
    V[N] = next;
    for (let t = N - 1; t >= 0; t--) {
      const v = new Float32Array(W * H), c = costAt(t + 1);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let m = -1e9; const q = [];
        for (const [dx, dy] of MOVES) { const xx = x + dx, yy = y + dy; if (xx < 0 || xx >= W || yy < 0 || yy >= H) { q.push(-1e9); continue; } const s = idx(xx, yy); const val = -c[s] - (dx || dy ? 0.06 : 0.12) + next[s]; q.push(val); if (val > m) m = val; }
        let z = 0; for (const val of q) z += Math.exp((val - m) / temp); v[idx(x, y)] = m + temp * Math.log(z);
      }
      V[t] = v; next = v;
    }
    const D = [new Float32Array(W * H)]; D[0][idx(start[0], start[1])] = 1;
    for (let t = 0; t < N; t++) {
      const d = new Float32Array(W * H), c = costAt(t + 1), cur = D[t], vn = V[t + 1];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = cur[idx(x, y)]; if (p < 1e-7) continue;
        const q = [], ss = [];
        for (const [dx, dy] of MOVES) { const xx = x + dx, yy = y + dy; if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue; const s = idx(xx, yy); q.push(-c[s] - (dx || dy ? 0.06 : 0.12) + vn[s]); ss.push(s); }
        const m = Math.max(...q); let z = 0; const e = q.map(v => { const u = Math.exp((v - m) / temp); z += u; return u; });
        for (let i = 0; i < ss.length; i++) d[ss[i]] += p * e[i] / z;
      }
      D.push(d);
    }
    return D;
  }

  // ---------- drawing ----------
  function setup(canvas) {
    const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = W * CELL * dpr; canvas.height = H * CELL * dpr;
    const g = canvas.getContext('2d'); g.scale(dpr, dpr); return g;
  }
  function base(g) {
    g.fillStyle = C.bg; g.fillRect(0, 0, W * CELL, H * CELL);
    g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
    for (let x = 1; x < W; x++) { g.moveTo(x * CELL + 0.5, 0); g.lineTo(x * CELL + 0.5, H * CELL); }
    for (let y = 1; y < H; y++) { g.moveTo(0, y * CELL + 0.5); g.lineTo(W * CELL, y * CELL + 0.5); }
    g.stroke();
  }
  function heat(g, f, col, scale = 1, cap = 0.9) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = Math.min(cap, f[idx(x, y)] * scale); if (v > 0.01) { g.fillStyle = rgba(col, v); g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1); } }
  }
  function box(g, b, col, alpha = 1, dash) {
    g.save(); g.strokeStyle = rgba(col, alpha); g.lineWidth = 2; if (dash) g.setLineDash(dash);
    const r = 5, x = (b.x - b.w / 2) * CELL, y = (b.y - b.h / 2) * CELL, w = b.w * CELL, h = b.h * CELL;
    g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke(); g.restore();
  }
  function arrow(g, x0, y0, x1, y1, col, w = 2) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 9 * Math.cos(a - 0.45), y1 - 9 * Math.sin(a - 0.45)); g.lineTo(x1 - 9 * Math.cos(a + 0.45), y1 - 9 * Math.sin(a + 0.45)); g.closePath(); g.fill(); g.restore();
  }
  function label(g, text, x, y, col = C.ink) { g.font = '500 14px Inter, system-ui'; g.fillStyle = 'rgba(16,16,16,0.82)'; const w = g.measureText(text).width + 16; g.beginPath(); g.roundRect(x, y, w, 26, 8); g.fill(); g.fillStyle = col; g.fillText(text, x + 8, y + 18); }
  const ARROW_S = 6;   // arrow tip = centre + velocity * 6 steps

  // drag cars (body) and their velocity (arrow tip)
  function draggable(canvas, cars, onChange, opts = {}) {
    let drag = null;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    canvas.addEventListener('pointerdown', e => {
      const [x, y] = pos(e);
      for (const c of cars) if (opts.arrows !== false && Math.hypot(x - (c.x + c.vx * ARROW_S), y - (c.y + c.vy * ARROW_S)) < 0.9) { drag = { c, kind: 'v' }; break; }
      if (!drag) for (const c of cars) if (Math.abs(x - c.x) < c.w / 2 + 0.3 && Math.abs(y - c.y) < c.h / 2 + 0.3) { drag = { c, kind: 'p', dx: x - c.x, dy: y - c.y }; break; }
      if (drag) { canvas.setPointerCapture(e.pointerId); e.preventDefault(); } else if (opts.click) opts.click(Math.floor(x), Math.floor(y));
    });
    canvas.addEventListener('pointermove', e => {
      const [x, y] = pos(e);
      if (!drag) { canvas.style.cursor = cars.some(c => Math.abs(x - c.x) < c.w / 2 + 0.3 && Math.abs(y - c.y) < c.h / 2 + 0.3 || (opts.arrows !== false && Math.hypot(x - (c.x + c.vx * ARROW_S), y - (c.y + c.vy * ARROW_S)) < 0.9)) ? 'grab' : 'crosshair'; return; }
      if (drag.kind === 'p') { drag.c.x = Math.max(1, Math.min(W - 1, x - drag.dx)); drag.c.y = Math.max(1, Math.min(H - 1, y - drag.dy)); }
      else { drag.c.vx = Math.max(-0.6, Math.min(0.6, (x - drag.c.x) / ARROW_S)); drag.c.vy = Math.max(-0.6, Math.min(0.6, (y - drag.c.y) / ARROW_S)); }
      onChange();
    });
    canvas.addEventListener('pointerup', () => { drag = null; });
    canvas.tabIndex = 0; let k = 0;
    canvas.addEventListener('keydown', e => {
      const c = cars[k]; const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (e.key === ' ') { e.preventDefault(); k = (k + 1) % cars.length; onChange(); ring(); return; }
      if (!d) return; e.preventDefault();
      if (e.shiftKey && opts.arrows !== false) { c.vx = Math.max(-0.6, Math.min(0.6, c.vx + d[0] * 0.05)); c.vy = Math.max(-0.6, Math.min(0.6, c.vy + d[1] * 0.05)); }
      else { c.x = Math.max(1, Math.min(W - 1, c.x + d[0] * 0.5)); c.y = Math.max(1, Math.min(H - 1, c.y + d[1] * 0.5)); }
      onChange(); ring();
    });
    const ring = () => { const c = cars[k], g = canvas.getContext('2d'); g.save(); g.strokeStyle = 'rgba(125,180,255,0.95)'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.roundRect((c.x - c.w / 2) * CELL - 4, (c.y - c.h / 2) * CELL - 4, c.w * CELL + 8, c.h * CELL + 8, 7); g.stroke(); g.restore(); };
    canvas.addEventListener('focus', () => { if (canvas.matches(':focus-visible')) ring(); });
  }
  function bind(root, name, fn) { const el = root.querySelector(`[data-in="${name}"]`); el.addEventListener('input', fn); return el; }
  const out = (root, name, v) => { root.querySelectorAll(`[data-out="${name}"]`).forEach(o => (o.textContent = v)); };
  const busy = (btn, on) => { const p = btn.closest('.demo').querySelector('.demo__pane'); if (on) p.dataset.busy = '1'; else delete p.dataset.busy; };
  function auto(root, input, onTick, period = 110, hold = 14) {
    const pane = root.querySelector('.demo__pane'); let wait = 0;
    pane.dataset.busy = '1';
    setInterval(() => {
      const r = root.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || root.matches(':active')) return;
      if (+input.value >= +input.max) { if (++wait < hold) return; wait = 0; input.value = input.min; } else input.value = +input.value + 1;
      onTick();
    }, period);
  }
  function player(btn, input, onTick, label = ['Play', 'Pause']) {
    let timer = null;
    btn.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; btn.textContent = label[0]; busy(btn, false); return; }
      if (+input.value >= +input.max) input.value = input.min;
      btn.textContent = label[1]; busy(btn, true);
      timer = setInterval(() => { input.value = +input.value + 1; onTick(); if (+input.value >= +input.max) { clearInterval(timer); timer = null; btn.textContent = label[0]; busy(btn, false); } }, 90);
    });
  }
  const sceneCars = () => [
    { x: 6, y: 6, w: 2, h: 3.4, vx: 0.35, vy: 0.05 },
    { x: 22, y: 12, w: 3.6, h: 1.8, vx: -0.4, vy: 0 },
    { x: 14, y: 3, w: 1.8, h: 3.2, vx: 0, vy: 0.3 },
  ];

  // ---------- 1. flux forecast ----------
  {
    const root = document.getElementById('demo-flux'), cv = root.querySelector('canvas'), g = setup(cv);
    const cars = sceneCars(); let mode = 'flux';
    const tIn = bind(root, 't', draw);
    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { if (mode === b.dataset.mode) return; if (window.FDFluxWave) window.FDFluxWave.play(b); mode = b.dataset.mode; root.querySelectorAll('[data-mode]').forEach(o => o.setAttribute('aria-checked', String(o === b))); draw(); }));
    function draw() {
      const t = +tIn.value, f = forecast(cars, t, mode);
      base(g); heat(g, f, C.car, 0.95);
      if (mode === 'flux') {   // face flux: area crossing each face this step
        for (const c of cars) { const b = at(c, t), sp = Math.hypot(c.vx, c.vy); if (sp < 0.02) continue;
          const ux = c.vx / sp, uy = c.vy / sp;
          for (let y = Math.floor(b.y - b.h / 2); y < Math.ceil(b.y + b.h / 2); y++) for (let x = Math.floor(b.x - b.w / 2); x < Math.ceil(b.x + b.w / 2); x++) {
            if (x < 0 || y < 0 || x >= W || y >= H || f[idx(x, y)] < 0.25) continue;
            const cx = (x + 0.5) * CELL, cy = (y + 0.5) * CELL;
            arrow(g, cx - ux * 5, cy - uy * 5, cx + ux * 7, cy + uy * 7, 'rgba(236,238,255,0.55)', 1.4);
          } }
      }
      for (const c of cars) { box(g, c, C.car, 0.35, [4, 4]); if (mode === 'flux') box(g, at(c, t), C.car, 0.95); arrow(g, c.x * CELL, c.y * CELL, (c.x + c.vx * ARROW_S) * CELL, (c.y + c.vy * ARROW_S) * CELL, rgba(C.ego, 0.95), 2.2); }
      let mass = 0, peak = 0; for (const v of f) { mass += v; peak = Math.max(peak, v); }
      out(root, 't', (t * DT).toFixed(1) + ' s'); out(root, 'mass', mass.toFixed(1) + ' cells'); out(root, 'peak', Math.round(Math.min(1, peak) * 100) + '%');
      label(g, mode === 'flux' ? 'Flux: area moves across faces' : 'Gaussian: the car blurs out', 10, 10);
    }
    draggable(cv, cars, draw); auto(root, tIn, draw); draw();
  }

  // ---------- 2. overlap cost ----------
  {
    const root = document.getElementById('demo-cost'), cv = root.querySelector('canvas'), g = setup(cv);
    const cars = sceneCars(); let hover = null;
    const tIn = bind(root, 't', draw), eIn = bind(root, 'ego', draw);
    cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); hover = [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; draw(); });
    cv.addEventListener('pointerleave', () => { hover = null; draw(); });
    function draw() {
      const t = +tIn.value, s = +eIn.value, ew = s, eh = s + 1, f = forecast(cars, t), o = overlap(f, ew, eh);
      base(g); heat(g, o, C.cost, 0.32, 0.85);
      for (const c of cars) box(g, at(c, t), C.car, 0.9);
      if (hover) { const [x, y] = hover, b = { x: x - Math.floor(ew / 2) + ew / 2, y: y - Math.floor(eh / 2) + eh / 2, w: ew, h: eh }; box(g, b, C.ego, 1); out(root, 'ov', o[idx(x, y)].toFixed(2) + ' cells'); }
      else out(root, 'ov', '—');
      out(root, 't', (t * DT).toFixed(1) + ' s'); out(root, 'ego', `${ew} × ${eh}`);
      label(g, 'Cost = ego footprint ∩ forecast', 10, 10);
    }
    draggable(cv, cars, draw, { arrows: false }); draw();
  }

  // ---------- 3. flux value iteration ----------
  {
    const root = document.getElementById('demo-fvi'), cv = root.querySelector('canvas'), g = setup(cv);
    const cars = [{ x: 19, y: 12, w: 3.6, h: 1.8, vx: -0.22, vy: 0 }, { x: 13, y: 7, w: 1.8, h: 3.2, vx: 0.05, vy: 0.08 }, { x: 22, y: 4, w: 1.8, h: 3.2, vx: 0, vy: 0.15 }];
    const start = [15, 18]; let goal = [15, 1], frame = null, D = null, F = null;
    const tempIn = bind(root, 'temp', solve), mIn = bind(root, 'margin', solve);
    const N = 28, fake = { value: N, max: N, min: 0 };
    function solve() {
      const temp = +tempIn.value / 10, m = +mIn.value;
      F = []; for (let t = 0; t <= N; t++) F.push(forecast(cars, t));
      const costs = F.map(f => { const o = dilate(overlap(f, 2, 3), m); const c = new Float32Array(W * H); for (let i = 0; i < c.length; i++) c[i] = 6 * Math.min(1.5, o[i]); return c; });
      D = fvi(t => costs[t], start, goal, temp, N);
      let hit = 0, s = 0; for (let t = 1; t <= N; t++) { const near = dilate(F[t].map(v => (v > 0.05 ? 1 : 0)), 1); let h = 0; for (let i = 0; i < W * H; i++) h += D[t][i] * (near[i] > 0 ? 1 : 0); hit = Math.max(hit, h); }
      for (let x = Math.max(0, goal[0] - 1); x <= Math.min(W - 1, goal[0] + 1); x++) for (let y = Math.max(0, goal[1] - 1); y <= Math.min(H - 1, goal[1] + 1); y++) s += D[N][idx(x, y)];
      out(root, 'temp', temp.toFixed(1)); out(root, 'margin', m + (m === 1 ? ' cell' : ' cells'));
      out(root, 'hit', (hit * 100).toFixed(1) + '%'); out(root, 'reach', (s * 100).toFixed(0) + '%');
      draw();
    }
    function draw() {
      base(g);
      const k = frame == null ? N : frame;
      const acc = new Float32Array(W * H); for (let t = 0; t <= k; t++) for (let i = 0; i < acc.length; i++) acc[i] += D[t][i];
      heat(g, F[k], C.car, 0.5);
      heat(g, acc, C.ego, 1.6, 0.95);
      if (frame != null) heat(g, D[k], [255, 255, 255], 3, 0.9);
      for (const c of cars) { box(g, at(c, k), C.car, 0.95); box(g, c, C.car, 0.3, [4, 4]); arrow(g, c.x * CELL, c.y * CELL, (c.x + c.vx * ARROW_S) * CELL, (c.y + c.vy * ARROW_S) * CELL, 'rgba(180,188,255,0.8)', 1.8); }
      box(g, { x: start[0] + 0.5, y: start[1] + 0.5, w: 2, h: 3 }, C.ego, 1);
      g.save(); g.strokeStyle = rgba(C.ego, 0.95); g.setLineDash([3, 3]); g.lineWidth = 2; g.strokeRect((goal[0] - 1) * CELL, (goal[1] - 1) * CELL, CELL * 3, CELL * 3); g.restore();
      label(g, frame == null ? 'Ego probability, summed over every path' : `Step ${k}: probability moves across faces`, 10, 10);
    }
    draggable(cv, cars, solve, { click: (x, y) => { goal = [Math.max(1, Math.min(W - 2, x)), Math.max(1, Math.min(H - 2, y))]; solve(); } });
    // steps through the iteration on its own, holds the summed result, then starts again
    { let wait = 0; root.querySelector('.demo__pane').dataset.busy = '1';
      setInterval(() => { const r = root.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
        if (frame == null) { if (++wait < 18) return; wait = 0; frame = 0; } else { frame++; if (frame > N) frame = null; } draw(); }, 120); }
    solve();
  }

  // ---------- 4. learning the cost ----------
  {
    const root = document.getElementById('demo-learn'), cv = root.querySelector('canvas'), g = setup(cv);
    // a car ahead in the ego lane and a parked car beside it: only the left side is open, as in the logged drive
    const cars = [{ x: 16, y: 10, w: 3.6, h: 2, vx: 0, vy: 0 }, { x: 18.9, y: 10.6, w: 2.2, h: 4.6, vx: 0, vy: 0 }];
    const start = [15, 18], goal = [15, 1], N = 26, temp = 0.5, IT = 20;
    let f1, ring, hist = [];
    const expert = []; { let x = 15, y = 18; expert.push([x, y]); for (const m of 'UUUULLLLUUUUUUURRRRUUUU') { if (m === 'U') y--; if (m === 'L') x--; if (m === 'R') x++; expert.push([x, y]); } while (expert.length <= N) expert.push([x, y]); }
    const sIn = bind(root, 'safety', run), itIn = bind(root, 'it', draw);
    itIn.max = IT;
    const costOf = th => { const c = new Float32Array(W * H); for (let i = 0; i < c.length; i++) c[i] = th[0] * Math.min(1.5, f1[i]) + th[1] * ring[i]; return c; };
    function run() {
      const occ = forecast(cars, 0); f1 = overlap(occ, 2, 3); ring = new Float32Array(W * H);
      { const d = dilate(f1, 1); for (let i = 0; i < ring.length; i++) ring[i] = Math.max(0, Math.min(1, d[i]) - Math.min(1, f1[i])); }
      let th = [0, 0]; hist = [];                     // step 0: the cost knows nothing yet
      for (let it = 0; it <= IT; it++) {
        const c = costOf(th), D = fvi(() => c, start, goal, temp, N);
        let e1 = 0, e2 = 0, x1 = 0;
        for (let t = 1; t <= N; t++) { for (let i = 0; i < W * H; i++) { e1 += D[t][i] * Math.min(1.5, f1[i]); e2 += D[t][i] * ring[i]; } x1 += Math.min(1.5, f1[idx(...expert[t])]); }
        let ll = 0; for (let t = 1; t <= N; t++) ll += Math.log(Math.max(1e-6, D[t][idx(...expert[t])]));
        const path = D.slice(1).map(d => { let bi = 0; for (let i = 1; i < d.length; i++) if (d[i] > d[bi]) bi = i; return [bi % W, (bi / W) | 0]; });
        hist.push({ th: [...th], D, ll, path, hit: e1 });
        th[0] = Math.max(0, th[0] + Math.max(-0.0045, Math.min(0.0045, 0.01 * (e1 - x1))));                 // IRL: raise cost where the model goes and the logged drive does not
        th[1] = sIn.checked ? th[1] + 0.03 * e2 : 0;                     // safety loss: probability next to a true box adds margin
      }
      draw();
    }
    function draw() {
      const k = +itIn.value, h = hist[k], c = costOf(h.th);
      base(g); heat(g, c, C.cost, 0.25, 0.85);
      const acc = new Float32Array(W * H); for (const d of h.D) for (let i = 0; i < acc.length; i++) acc[i] += d[i];
      heat(g, acc, C.ego, 1.6, 0.95);
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); expert.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, (x + 0.5) * CELL, (y + 0.5) * CELL)); g.stroke(); g.restore();
      g.save(); g.strokeStyle = 'rgb(143,227,176)'; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); [start, ...h.path].forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, (x + 0.5) * CELL, (y + 0.5) * CELL)); g.stroke(); g.restore();
      for (const cr of cars) box(g, cr, C.car, 0.95);
      // learning curve in the corner: log-likelihood of the logged drive over training
      const bx = W * CELL - 214, by = H * CELL - 92, bw = 200, bh = 78, lo = Math.min(...hist.map(q => q.ll)), hi = Math.max(...hist.map(q => q.ll));
      g.fillStyle = 'rgba(14,14,14,0.86)'; g.beginPath(); g.roundRect(bx, by, bw, bh, 10); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.1)'; g.stroke();
      g.font = '500 12px Inter, system-ui'; g.fillStyle = 'rgba(220,220,220,0.75)'; g.fillText('log-likelihood of the logged drive', bx + 10, by + 18);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6; g.beginPath();
      hist.forEach((q, i) => { const x = bx + 10 + i / IT * (bw - 20), y = by + bh - 10 - (q.ll - lo) / (hi - lo || 1) * (bh - 36); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      const cx = bx + 10 + k / IT * (bw - 20), cy = by + bh - 10 - (h.ll - lo) / (hi - lo || 1) * (bh - 36);
      g.fillStyle = '#0062e0'; g.beginPath(); g.arc(cx, cy, 4.5, 0, 7); g.fill();
      let gap = 1e9; for (const [x, y] of h.path) for (const cr of cars) { const dx = Math.max(0, Math.abs(x + 0.5 - cr.x) - cr.w / 2 - 0.5), dy = Math.max(0, Math.abs(y + 0.5 - cr.y) - cr.h / 2 - 0.5); gap = Math.min(gap, Math.hypot(dx, dy)); }
      out(root, 'it', k); out(root, 'll', h.ll.toFixed(1)); out(root, 'gap', (gap * 0.75).toFixed(2) + ' m');
      label(g, `Training step ${k}`, 10, 10);
      // legend, bottom left: the marks themselves, not their names
      const lx = 10, ly = H * CELL - 92; g.fillStyle = 'rgba(14,14,14,0.86)'; g.beginPath(); g.roundRect(lx, ly, 176, 78, 10); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; g.stroke();
      g.font = '500 12px Inter, system-ui'; g.fillStyle = 'rgba(225,225,225,0.85)';
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(lx + 12, ly + 18); g.lineTo(lx + 40, ly + 18); g.stroke(); g.restore(); g.fillText('logged drive', lx + 50, ly + 22);
      g.save(); g.strokeStyle = 'rgb(143,227,176)'; g.lineWidth = 3; g.beginPath(); g.moveTo(lx + 12, ly + 40); g.lineTo(lx + 40, ly + 40); g.stroke(); g.restore(); g.fillText('model plan', lx + 50, ly + 44);
      g.fillStyle = 'rgba(255,196,140,0.85)'; g.fillRect(lx + 18, ly + 55, 16, 12); g.fillStyle = 'rgba(225,225,225,0.85)'; g.fillText('ego probability', lx + 50, ly + 66);
    }
    draggable(cv, cars, run, { arrows: false });
    auto(root, itIn, draw, 140, 22);
    run();
  }
})();
