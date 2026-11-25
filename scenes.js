// One cut-in, two planners, on one clock, seen from above with the camera riding along the ego.
// The car in the left lane signals, then turns into the ego lane; the usual planner holds speed and hits it,
// FluxDrive reads the forecast footprint as cost, brakes early and settles behind it.
(() => {
  const cvs = [...document.querySelectorAll('canvas[data-scene]')]; if (!cvs.length) return;
  const W = 960, H = 300, PX = 13;                        // px per metre
  const LANE_W = 3.6 * PX, CY = 150, LANE_E = CY + LANE_W / 2, LANE_L = CY - LANE_W / 2;
  const T = 6.4, HOLD = 1.6, EGO_SCREEN_X = 210;
  const sm = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const dsm = u => (u <= 0 || u >= 1 ? 0 : 6 * u * (1 - u));
  // cut-in: 10.5 m/s, signals from 0.4 s, turns between 1.2 s and 3.2 s
  const CUT = { x0: 20, v: 10.5, t0: 1.0, dur: 2.0 };
  const cut = t => { const u = (t - CUT.t0) / CUT.dur, x = CUT.x0 + CUT.v * t, y = LANE_L + (LANE_E - LANE_L) * sm(u);
    const vy = (LANE_E - LANE_L) / PX * dsm(u) / CUT.dur; return { x, y, h: Math.atan2(vy, CUT.v), sig: t > 0.4 && t < CUT.t0 + CUT.dur + 0.2 }; };
  // other traffic, far lane and oncoming shoulder lane, just for life
  const OTHERS = [{ x0: -22, y: LANE_L, v: 12.5, c: '#5f6672' }, { x0: 64, y: LANE_L, v: 11.8, c: '#7a6f66' }, { x0: 105, y: LANE_E, v: 13.6, c: '#6d7480' }];
  function sim(kind) {
    const dt = 1 / 240, out = []; let x = 0, v = 15, a = 0, crash = null, y = 0, vy = 0;
    for (let t = 0; t <= T + 1e-9; t += dt) {
      const c = cut(t);
      if (kind === 'after') {
        // forecast: where the car will be in 1.6 s; once that footprint lies in the ego lane, it is cost ahead
        const f = cut(t + 1.6), inLane = f.y > LANE_E - LANE_W * 0.45;
        const gap = c.x - x - 4.6, want = inLane ? Math.min(15, CUT.v + (gap - 12) * 0.35) : 15;
        a += ((Math.max(-5.5, Math.min(2, (want - v) * 1.4))) - a) * Math.min(1, dt * 6);
        // eases a little to the right of the lane while the car comes across, then recentres
        const yT = inLane && c.y < LANE_E - 2 ? 0.55 : 0; vy += ((yT - y) * 6 - vy * 4.5) * dt; y += vy * dt;
      } else {
        // reacts only once the car is already across the line, far too late
        a += (0 - a) * Math.min(1, dt * 8);   // holds its speed on the picked path
      }
      if (!crash) { v = Math.max(0, v + a * dt); x += v * dt; }
      if (kind === 'before' && !crash && Math.abs(c.x - x) < 4.4 && Math.abs(c.y - LANE_E) < LANE_W * 0.42) crash = { t, x: (x + c.x) / 2 + 1.5, y: (LANE_E + c.y) / 2 };
      out.push({ t, x, v, a, crash, y, vy });
    }
    return out;
  }
  const S = { before: sim('before'), after: sim('after') };
  // static texture: asphalt speckle, drawn once into a tile
  const tile = document.createElement('canvas'); tile.width = 256; tile.height = 256;
  { const g = tile.getContext('2d'); g.fillStyle = '#1b1b1c'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { const v = 22 + 0*Math.random() * 22; g.fillStyle = `rgba(${v + 10},${v + 10},${v + 12},${0.25 + Math.random() * 0.35})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.2, 1.2); } }

  // matte, rounded bodies with soft shading and a glass cabin; colour only where it means something
  function carShape(g, len, wid, tone, opts = {}) {
    const L = len * PX, Wd = wid * PX, r = Wd * 0.48;
    g.save(); g.filter = 'blur(6px)'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.roundRect(-L / 2 + 1, -Wd / 2 + 3, L, Wd, r); g.fill(); g.restore();
    const body = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); body.addColorStop(0, tone[0]); body.addColorStop(0.55, tone[1]); body.addColorStop(1, tone[2]);
    g.fillStyle = body; g.beginPath(); g.roundRect(-L / 2, -Wd / 2, L, Wd, [r * 0.8, r, r, r * 0.8]); g.fill();
    const glass = g.createLinearGradient(-L * 0.2, 0, L * 0.25, 0); glass.addColorStop(0, 'rgba(18,20,24,0.92)'); glass.addColorStop(1, 'rgba(40,44,52,0.85)');
    g.fillStyle = glass; g.beginPath(); g.roundRect(-L * 0.24, -Wd * 0.34, L * 0.5, Wd * 0.68, Wd * 0.26); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.roundRect(-L * 0.08, -Wd * 0.3, L * 0.16, Wd * 0.6, Wd * 0.2); g.fill();              // roof sheen
    const brake = opts.brake || 0;
    if (brake > 0.05) { g.fillStyle = `rgba(255,70,70,${0.4 + 0.6 * brake})`; g.beginPath(); g.roundRect(-L / 2 + 1, -Wd * 0.38, 2.4, Wd * 0.76, 1.2); g.fill();
      const gl = g.createRadialGradient(-L / 2, 0, 1, -L / 2, 0, 22); gl.addColorStop(0, `rgba(255,60,60,${0.32 * brake})`); gl.addColorStop(1, 'rgba(255,60,60,0)'); g.fillStyle = gl; g.fillRect(-L / 2 - 24, -24, 26, 48); }
    if (opts.signal) { const gs = g.createRadialGradient(L * 0.42, Wd / 2, 0, L * 0.42, Wd / 2, 10); gs.addColorStop(0, 'rgba(255,184,70,0.95)'); gs.addColorStop(1, 'rgba(255,184,70,0)'); g.fillStyle = gs; g.fillRect(L * 0.42 - 10, Wd / 2 - 10, 20, 20); g.fillStyle = gs; g.fillRect(-L * 0.42 - 10, Wd / 2 - 10, 20, 20); }
    if (opts.glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(10px)'; g.fillStyle = opts.glow; g.beginPath(); g.roundRect(-L / 2, -Wd / 2, L, Wd, r); g.fill(); g.restore(); }
  }
  const TONE = { ego: ['#ffffff', '#e4e6ea', '#a9adb5'], cut: ['#d9e2ff', '#a9b8f5', '#6f7fcf'], other: ['#9a9ea6', '#7c8088', '#55585e'] };
  // smooth band along a polyline: flat ends, colour ramp from start to end, fading out
  function band(g, P, w, c0, c1, a0 = 0.85, a1 = 0.0) {
    if (P.length < 2) return; const Lf = [], Rt = [];
    P.forEach((p, i) => { const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1;
      Lf.push([p[0] - dy / n * w / 2, p[1] + dx / n * w / 2]); Rt.push([p[0] + dy / n * w / 2, p[1] - dx / n * w / 2]); });
    const A = P[0], B = P[P.length - 1], gr = g.createLinearGradient(A[0], A[1], B[0], B[1]);
    gr.addColorStop(0, `rgba(${c0},${a0})`); gr.addColorStop(1, `rgba(${c1},${a1})`);
    g.fillStyle = gr; g.beginPath(); Lf.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); for (let i = Rt.length - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]); g.closePath(); g.fill();
  }
  const EGO_C = ['150,190,255', '150,230,190'], MOT_C = ['255,110,110', '255,214,110'];
  function draw(g, kind, t) {
    const seq = S[kind], st = seq[Math.min(seq.length - 1, Math.round(t * 240))], tc = st.crash ? Math.min(t, st.crash.t) : t;
    const camX = st.x * PX - EGO_SCREEN_X, sx = m => m * PX - camX;
    // shake on impact
    let shx = 0, shy = 0; if (st.crash && t - st.crash.t < 0.35) { const k = (0.35 - (t - st.crash.t)) * 22; shx = (Math.random() - 0.5) * k; shy = (Math.random() - 0.5) * k; }
    g.save(); g.translate(shx, shy);
    // ground and road: flat tones, hairline edges, thin dashes
    g.fillStyle = '#0e0f11'; g.fillRect(-20, -20, W + 40, H + 40);
    g.fillStyle = '#1b1c1f'; g.fillRect(-20, CY - LANE_W - 6, W + 40, LANE_W * 2 + 12);
    g.fillStyle = 'rgba(255,255,255,0.32)'; g.fillRect(-20, CY - LANE_W - 6, W + 40, 1.5); g.fillRect(-20, CY + LANE_W + 4.5, W + 40, 1.5);
    g.fillStyle = 'rgba(255,255,255,0.42)'; const dash = 3 * PX, gapM = 6 * PX; for (let x = -((camX % (dash + gapM)) + dash + gapM); x < W + 40; x += dash + gapM) g.fillRect(x, CY - 1, dash, 2);
    // other traffic
    OTHERS.forEach(o => { const x = sx(o.x0 + o.v * t); if (x < -80 || x > W + 80) return; g.save(); g.translate(x, o.y); carShape(g, 4.4, 1.85, TONE.other); g.restore(); });
    const c = cut(tc), cx = sx(c.x);
    const egoY = LANE_E + (st.y || 0) * PX;
    // the cut-in's forecast: one smooth band over the next 2 s
    if (kind === 'before') { const P = []; for (let s = 0; s <= 2.0001; s += 0.05) { const f = cut(tc + s); P.push([sx(f.x), f.y]); } band(g, P, 1.5 * PX, MOT_C[0], MOT_C[1], 0.55, 0.05); }
    if (kind === 'before') {
      // the detector does see the car ...
      { g.save(); g.translate(cx, c.y); g.rotate(c.h); g.setLineDash([5, 4]); g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.strokeRect(-2.6 * PX, -1.2 * PX, 5.2 * PX, 2.4 * PX); g.setLineDash([]); g.restore();
        g.font = '500 11px Inter, system-ui'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.textAlign = 'center'; g.fillText('detected', cx, c.y - 1.6 * PX); }
      // ... but the candidates are scored without it of candidates from the ego centre; the straight, constant-speed one is picked every frame
      const L = st.v * 2.4 * PX, ph = t * 1.3;
      [-1.3, -0.65, 0.65, 1.3].forEach((k, i) => { const end = k * LANE_W * (0.55 + 0.08 * Math.sin(ph + i * 1.7)), P = [];
        for (let u = 0; u <= 1.0001; u += 0.04) P.push([EGO_SCREEN_X + u * L, egoY + end * sm(u)]); band(g, P, 0.5 * PX, '255,255,255', '255,255,255', 0.16, 0.02); });
      const P = []; for (let u = 0; u <= 1.0001; u += 0.04) P.push([EGO_SCREEN_X + u * L, egoY]);
      band(g, P, 1.3 * PX, EGO_C[0], EGO_C[1], 0.9, 0.1);
      g.font = '500 12px Inter, system-ui'; g.fillStyle = 'rgba(255,255,255,0.55)'; g.textAlign = 'left'; g.fillText('picked candidate', EGO_SCREEN_X + L + 12, egoY + 4);
    } else {
      // the forecast becomes cost on BEV cells; the plan is scored on those cells
      const CS = 1.5 * PX, x0 = Math.floor(camX / CS) * CS - camX;
      for (let gx = x0; gx < W; gx += CS) for (let gy = CY - LANE_W; gy < CY + LANE_W - 1; gy += CS) {
        let p = 0; for (let s = 0; s <= 2.0001; s += 0.1) { const q = cut(tc + s), dx = (sx(q.x) - gx - CS / 2) / (2.6 * PX), dy = (q.y - gy - CS / 2) / (1.2 * PX); p = Math.max(p, Math.exp(-(dx * dx + dy * dy)) * (1 - s * 0.25)); }
        g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1; g.strokeRect(gx + 0.5, gy + 0.5, CS - 1, CS - 1);
        if (p > 0.06) { g.fillStyle = `rgba(255,${Math.round(110 + 100 * (1 - p))},110,${0.62 * p})`; g.fillRect(gx + 1, gy + 1, CS - 2, CS - 2); }
      }
      g.font = '500 11px Inter, system-ui'; g.fillStyle = 'rgba(255,200,170,0.85)'; g.textAlign = 'center'; g.fillText('forecast → cost on cells', Math.min(W - 90, cx + 6 * PX), CY - LANE_W - 12);
      // the plan is the ego's own next 2.4 s: it bends away and shortens as FluxDrive slows
      const i0 = Math.round(t * 240), P = [];
      for (let s = 0; s <= 2.4001; s += 0.05) { const j = i0 + Math.round(s * 240), q = seq[Math.min(seq.length - 1, j)], ex = Math.max(0, j - seq.length + 1) / 240 * q.v; P.push([sx(q.x + ex), LANE_E + q.y * PX]); }
      band(g, P, 1.3 * PX, EGO_C[0], EGO_C[1], 0.9, 0.1);
    }
    g.save(); g.translate(cx, c.y); g.rotate(c.h); carShape(g, 4.5, 1.9, TONE.cut, { signal: c.sig && Math.floor(t * 3.2) % 2 === 0, glow: 'rgba(120,140,255,0.18)' }); g.restore();
    g.save(); g.translate(EGO_SCREEN_X, egoY); g.rotate(Math.atan2(st.vy || 0, Math.max(1, st.v))); carShape(g, 4.6, 1.9, TONE.ego, { brake: Math.max(0, Math.min(1, -st.a / 4)) }); g.restore();
    if (st.crash) { const p = Math.min(1, (t - st.crash.t) * 3), x = sx(st.crash.x), r = 20 + 30 * p; g.strokeStyle = `rgba(255,107,107,${1 - p * 0.4})`; g.lineWidth = 3; g.beginPath(); g.arc(x, st.crash.y, r, 0, 7); g.stroke(); g.fillStyle = `rgba(255,80,80,${0.18 * (1 - p * 0.5)})`; g.fill(); }
    g.restore();
    // readouts, outside the shake
    const gap = Math.max(0, c.x - st.x - 4.6), lane = c.y > LANE_E - LANE_W * 0.4;
    g.font = '600 22px Inter, system-ui'; g.fillStyle = '#f2f2f2'; g.textAlign = 'left'; g.fillText(`${(st.v * 3.6).toFixed(0)}`, 18, 36); g.font = '500 11px Inter, system-ui'; g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = '600 22px Inter, system-ui'; const nw = g.measureText(`${(st.v * 3.6).toFixed(0)}`).width; g.font = '500 11px Inter, system-ui'; g.fillText('km/h', 18 + nw + 6, 36);
    g.font = '500 12px Inter, system-ui'; g.fillStyle = 'rgba(220,220,220,0.7)';
    g.fillText(st.crash ? 'collision' : lane ? `gap ${gap.toFixed(1)} m` : c.sig ? 'car ahead signals and starts to turn in' : '', 16, H - 16);
    if (st.crash) { g.font = '600 14px Inter, system-ui'; g.fillStyle = '#ff8a8a'; g.textAlign = 'center'; g.fillText('collision', sx(st.crash.x), st.crash.y + 68); }
    if (kind === 'after' && t > 4.4) { g.globalAlpha = Math.min(1, (t - 4.4) * 2); g.font = '600 14px Inter, system-ui'; g.fillStyle = '#8fe3b0'; g.textAlign = 'center'; g.fillText(`settles ${gap.toFixed(0)} m behind`, cx, LANE_E + 64); g.globalAlpha = 1; }
  }

  const ctx = cvs.map(cv => { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr); return [cv, g]; });
  let t0 = null; const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(now) {
    if (t0 == null) t0 = now;
    const t = ((now - t0) / 1000) % (T + HOLD), tt = still ? 3.6 : Math.min(t, T);
    ctx.forEach(([cv, g]) => { const r = cv.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) draw(g, cv.dataset.scene, tt); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__scene = { draw: (k, t) => ctx.forEach(([cv, g]) => cv.dataset.scene === k && draw(g, k, t)), S };
})();
