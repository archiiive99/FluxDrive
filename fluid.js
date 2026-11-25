// Flux, like water: a real 2D fluid (stable fluids: advection, viscosity, pressure projection) carries dye with the
// same conservative upwind face flux FluxDrive uses for occupied area. The right panel runs that same function on cars.
(() => {
  const root = document.getElementById('fluid'); if (!root) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the one update both panels share: area crosses each face, what leaves i enters j
  function upwind(rho, fu, fv, nx, ny, dt, out) {
    // fu[(nx+1)*ny]: normal speed on vertical faces; fv[nx*(ny+1)]: on horizontal faces (cells per unit time)
    out.set(rho); let lost = 0;
    for (let y = 0; y < ny; y++) for (let x = 0; x <= nx; x++) {
      const u = fu[y * (nx + 1) + x]; if (!u) continue;
      const iL = x - 1, iR = x;
      const src = u > 0 ? iL : iR; if (src < 0 || src >= nx) continue;
      const F = dt * Math.abs(u) * rho[y * nx + src];
      out[y * nx + src] -= F;
      const dst = u > 0 ? iR : iL; if (dst >= 0 && dst < nx) out[y * nx + dst] += F; else lost += F;
    }
    for (let y = 0; y <= ny; y++) for (let x = 0; x < nx; x++) {
      const v = fv[y * nx + x]; if (!v) continue;
      const jT = y - 1, jB = y;
      const src = v > 0 ? jT : jB; if (src < 0 || src >= ny) continue;
      const F = dt * Math.abs(v) * rho[src * nx + x];
      out[src * nx + x] -= F;
      const dst = v > 0 ? jB : jT; if (dst >= 0 && dst < ny) out[dst * nx + x] += F; else lost += F;
    }
    for (let i = 0; i < out.length; i++) if (out[i] < 0) out[i] = 0;
    return lost;
  }

  // ---------- water ----------
  const NX = 120, NY = 68, N = NX * NY;
  let u = new Float32Array(N), v = new Float32Array(N), u0 = new Float32Array(N), v0 = new Float32Array(N);
  let dye = new Float32Array(N), dyeB = new Float32Array(N);
  const p = new Float32Array(N), div = new Float32Array(N);
  const fu = new Float32Array((NX + 1) * NY), fv = new Float32Array(NX * (NY + 1));
  const I = (x, y) => y * NX + x;
  const cl = (a, lo, hi) => (a < lo ? lo : a > hi ? hi : a);
  function sample(f, x, y) {
    x = cl(x, 0, NX - 1.001); y = cl(y, 0, NY - 1.001);
    const x0 = x | 0, y0 = y | 0, sx = x - x0, sy = y - y0;
    return (f[I(x0, y0)] * (1 - sx) + f[I(x0 + 1, y0)] * sx) * (1 - sy) + (f[I(x0, y0 + 1)] * (1 - sx) + f[I(x0 + 1, y0 + 1)] * sx) * sy;
  }
  function advectVel(dt) {
    u0.set(u); v0.set(v);
    for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) {
      const i = I(x, y), px = x - dt * u0[i], py = y - dt * v0[i];
      u[i] = sample(u0, px, py) * 0.999; v[i] = sample(v0, px, py) * 0.999;
    }
  }
  function project() {
    for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) { const i = I(x, y); div[i] = -0.5 * (u[i + 1] - u[i - 1] + v[i + NX] - v[i - NX]); p[i] = 0; }
    for (let k = 0; k < 24; k++) for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) { const i = I(x, y); p[i] = (div[i] + p[i - 1] + p[i + 1] + p[i - NX] + p[i + NX]) / 4; }
    for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) { const i = I(x, y); u[i] -= 0.5 * (p[i + 1] - p[i - 1]); v[i] -= 0.5 * (p[i + NX] - p[i - NX]); }
    for (let x = 0; x < NX; x++) { u[I(x, 0)] = v[I(x, 0)] = u[I(x, NY - 1)] = v[I(x, NY - 1)] = 0; }
    for (let y = 0; y < NY; y++) { u[I(0, y)] = v[I(0, y)] = 0; v[I(NX - 1, y)] = 0; }
  }
  function faces() {
    for (let y = 0; y < NY; y++) for (let x = 0; x <= NX; x++) fu[y * (NX + 1) + x] = x === 0 || x === NX ? (x === NX ? Math.max(0, u[I(NX - 1, y)]) : 0) : 0.5 * (u[I(x - 1, y)] + u[I(x, y)]);
    for (let y = 0; y <= NY; y++) for (let x = 0; x < NX; x++) fv[y * NX + x] = y === 0 || y === NY ? 0 : 0.5 * (v[I(x, y - 1)] + v[I(x, y)]);
  }
  let added = 0, left = 0, pointer = null, t = 0, showFaces = true;
  // the face under the pointer (or, with no pointer, the busiest face) is the one we explain
  function pickFace(nx, ny, fu, rho, at) {
    if (at) { const x = Math.max(1, Math.min(nx - 1, Math.round(at.x))), y = Math.max(0, Math.min(ny - 1, Math.floor(at.y))); return [x, y]; }
    let best = 0, bx = 1, by = 0;
    for (let y = 1; y < ny - 1; y += 2) for (let x = 2; x < nx - 1; x += 2) { const uu = fu[y * (nx + 1) + x], F = Math.abs(uu) * rho[y * nx + (uu > 0 ? x - 1 : x)]; if (F > best) { best = F; bx = x; by = y; } }
    return [bx, by];
  }
  function lens(g, W, H, nx, ny, fu, rho, face, zoom) {
    const cs = W / nx, [x, y] = face, uu = fu[y * (nx + 1) + x], src = uu > 0 ? x - 1 : x, F = Math.abs(uu) * rho[y * nx + src];
    const Z = cs * zoom, X = x * cs, Y = (y + 0.5) * cs;
    g.save(); g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.strokeRect(X - Z, Y - Z / 2, Z, Z); g.strokeRect(X, Y - Z / 2, Z, Z);
    g.strokeStyle = '#ffc48c'; g.lineWidth = 3; g.beginPath(); g.moveTo(X, Y - Z / 2 - 4); g.lineTo(X, Y + Z / 2 + 4); g.stroke();
    const L = Math.min(Z * 1.6, 8 + F * Z * 6), s = Math.sign(uu) || 1, w = Math.max(2, Math.min(8, 2 + F * 10));
    g.strokeStyle = g.fillStyle = '#ffc48c'; g.lineWidth = w; g.beginPath(); g.moveTo(X - s * L / 2, Y); g.lineTo(X + s * L / 2 - s * 6, Y); g.stroke();
    g.beginPath(); g.moveTo(X + s * L / 2 + s * 4, Y); g.lineTo(X + s * L / 2 - s * 8, Y - w - 4); g.lineTo(X + s * L / 2 - s * 8, Y + w + 4); g.fill();
    g.font = `600 ${Math.max(11, Z * 0.32)}px Inter, system-ui`; g.fillStyle = '#fff'; g.textAlign = 'center';
    g.fillText(uu >= 0 ? 'i' : 'j', X - Z / 2, Y - Z / 2 - 8); g.fillText(uu >= 0 ? 'j' : 'i', X + Z / 2, Y - Z / 2 - 8);
    g.restore();
    return { uu, rhoI: rho[y * nx + src], rhoJ: rho[y * nx + (uu > 0 ? x : x - 1)] || 0, F };
  }
  function inject(x, y, dx, dy, amt, r = 3) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const xx = Math.round(x + i), yy = Math.round(y + j); if (xx < 1 || yy < 1 || xx >= NX - 1 || yy >= NY - 1) continue;
      const w = Math.exp(-(i * i + j * j) / (r * r * 0.6)); const k = I(xx, yy);
      u[k] += dx * w; v[k] += dy * w; const a = amt * w * 0.5; dye[k] += a; added += a;
    }
  }
  function stepWater(dt) {
    t += dt;
    // a jet from the left that sways, so the water moves on its own
    const jy = NY * (0.5 + 0.28 * Math.sin(t * 0.55)), jy2 = NY * (0.5 - 0.3 * Math.sin(t * 0.37 + 1));
    inject(4, jy, 6.5, 0.8 * Math.cos(t * 0.9), 0.7, 3);
    inject(NX * 0.45, NY - 5, 1.4, -3.2, 0.35, 3);
    inject(30, 4, 2.2, 2.4 + 0.4 * Math.sin(t), 0.3, 2);
    if (pointer) inject(pointer.x, pointer.y, pointer.dx * 18, pointer.dy * 18, 1.6, 4);
    advectVel(dt); project(); faces();
    const K = Math.max(1, Math.ceil(dt * Math.max(...fu.map(Math.abs), ...fv.map(Math.abs)) / 0.45));
    for (let k = 0; k < K; k++) { left += upwind(dye, fu, fv, NX, NY, dt / K, dyeB); const s = dye; dye = dyeB; dyeB = s; }
    // the far edges are open: dye that reaches them flows out of the grid (counted, so the balance still closes)
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      const e = Math.min(x, NX - 1 - x, y, NY - 1 - y); if (e > 2) continue;
      const i = I(x, y), out = dye[i] * (e === 0 ? 0.35 : e === 1 ? 0.18 : 0.08); dye[i] -= out; left += out;
    }
  }

  // ---------- driving: the same upwind() on occupied area ----------
  const CX = 40, CY = 22, CN = CX * CY;
  let occ = new Float32Array(CN), occB = new Float32Array(CN);
  const cfu = new Float32Array((CX + 1) * CY), cfv = new Float32Array(CX * (CY + 1));
  const cars = [{ x: 4, y: 6.5, w: 4.4, h: 2, vx: 3.2, vy: 0 }, { x: 14, y: 15.5, w: 4.4, h: 2, vx: 2.2, vy: -0.9 }, { x: 34, y: 10.5, w: 2, h: 4, vx: -0.4, vy: 1.6 }];
  function resetCars() {
    occ.fill(0);
    for (const c of cars) for (let y = 0; y < CY; y++) for (let x = 0; x < CX; x++) {
      const ox = Math.min(x + 1, c.x + c.w / 2) - Math.max(x, c.x - c.w / 2), oy = Math.min(y + 1, c.y + c.h / 2) - Math.max(y, c.y - c.h / 2);
      if (ox > 0 && oy > 0) occ[y * CX + x] += ox * oy;
    }
    // velocity field: each cell near a car carries that car's velocity (what the velocity head predicts)
    const vx = new Float32Array(CN), vy = new Float32Array(CN);
    for (const c of cars) for (let y = 0; y < CY; y++) for (let x = 0; x < CX; x++) {
      const d = Math.max(Math.abs(x + 0.5 - c.x) - c.w / 2, Math.abs(y + 0.5 - c.y) - c.h / 2);
      if (d < 0.9) { vx[y * CX + x] = c.vx; vy[y * CX + x] = c.vy; }
    }
    cars.vx = vx; cars.vy = vy; cars.t = 0;
    for (let y = 0; y < CY; y++) for (let x = 0; x <= CX; x++) cfu[y * (CX + 1) + x] = 0.5 * ((x > 0 ? vx[y * CX + x - 1] : 0) + (x < CX ? vx[y * CX + x] : 0));
    for (let y = 0; y <= CY; y++) for (let x = 0; x < CX; x++) cfv[y * CX + x] = 0.5 * ((y > 0 ? vy[(y - 1) * CX + x] : 0) + (y < CY ? vy[y * CX + x] : 0));
    cars.area0 = occ.reduce((a, b) => a + b, 0);
  }
  resetCars();
  let cleft = 0;
  function stepCars(dt) {
    cars.t += dt;
    if (cars.t > 4) { resetCars(); cleft = 0; return; }
    // moving velocity field with the area, so the face speeds follow each car
    const vx = new Float32Array(CN), vy = new Float32Array(CN);
    for (const c of cars) { const cx = c.x + c.vx * cars.t, cy = c.y + c.vy * cars.t;
      for (let y = 0; y < CY; y++) for (let x = 0; x < CX; x++) { const d = Math.max(Math.abs(x + 0.5 - cx) - c.w / 2, Math.abs(y + 0.5 - cy) - c.h / 2); if (d < 1.2) { vx[y * CX + x] = c.vx; vy[y * CX + x] = c.vy; } } }
    for (let y = 0; y < CY; y++) for (let x = 0; x <= CX; x++) cfu[y * (CX + 1) + x] = 0.5 * ((x > 0 ? vx[y * CX + x - 1] : 0) + (x < CX ? vx[y * CX + x] : 0));
    for (let y = 0; y <= CY; y++) for (let x = 0; x < CX; x++) cfv[y * CX + x] = 0.5 * ((y > 0 ? vy[(y - 1) * CX + x] : 0) + (y < CY ? vy[y * CX + x] : 0));
    const K = 3; for (let k = 0; k < K; k++) { cleft += upwind(occ, cfu, cfv, CX, CY, dt / K, occB); const s = occ; occ = occB; occB = s; }
  }

  // ---------- drawing ----------
  let lensW = null, lensC = null, cpointer = null;
  const cvW = root.querySelector('[data-water]'), cvC = root.querySelector('[data-cars]');
  const gW = cvW.getContext('2d'), gC = cvC.getContext('2d');
  const off = document.createElement('canvas'); off.width = NX; off.height = NY; const og = off.getContext('2d'); const img = og.createImageData(NX, NY);
  function drawWater() {
    const d = img.data;
    for (let i = 0; i < N; i++) { const a = Math.min(1, Math.sqrt(dye[i]) * 0.9), b = Math.min(1, dye[i] * 0.12);
      d[i * 4] = 12 + 140 * a + 100 * b; d[i * 4 + 1] = 12 + 152 * a + 90 * b; d[i * 4 + 2] = 14 + 240 * a; d[i * 4 + 3] = 255; }
    og.putImageData(img, 0, 0);
    const W = cvW.width, H = cvW.height; gW.imageSmoothingEnabled = true; gW.drawImage(off, 0, 0, W, H);
    if (showFaces) faceArrows(gW, W, H, NX, NY, fu, fv, dye, 6);
    lensW = pointer ? lens(gW, W, H, NX, NY, fu, dye, pickFace(NX, NY, fu, dye, pointer), 1) : null;
    zoom(gW, W, H, NX, NY, fu, fv, dye, pointer, 1.2, '150,160,255');
  }
  function drawCars() {
    const W = cvC.width, H = cvC.height, cs = W / CX;
    gC.fillStyle = '#0c0c0e'; gC.fillRect(0, 0, W, H);
    gC.fillStyle = '#1b1b1d'; gC.fillRect(0, H * 0.18, W, H * 0.64);
    gC.strokeStyle = 'rgba(255,255,255,0.3)'; gC.setLineDash([cs * 1.6, cs * 1.2]); gC.lineWidth = Math.max(1, cs * 0.08);
    gC.beginPath(); gC.moveTo(0, H * 0.5); gC.lineTo(W, H * 0.5); gC.stroke(); gC.setLineDash([]);
    for (let y = 0; y < CY; y++) for (let x = 0; x < CX; x++) { const a = Math.min(1, occ[y * CX + x]); if (a > 0.01) { gC.fillStyle = `rgba(150,160,255,${0.15 + 0.8 * a})`; gC.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2); } }
    gC.strokeStyle = 'rgba(255,255,255,0.05)'; gC.lineWidth = 1; gC.beginPath();
    for (let x = 1; x < CX; x++) { gC.moveTo(x * cs, 0); gC.lineTo(x * cs, H); } for (let y = 1; y < CY; y++) { gC.moveTo(0, y * cs); gC.lineTo(W, y * cs); } gC.stroke();
    for (const c of cars) { const cx = (c.x + c.vx * cars.t) * cs, cy = (c.y + c.vy * cars.t) * cs; gC.strokeStyle = 'rgba(220,224,255,0.85)'; gC.lineWidth = 1.6; gC.strokeRect(cx - c.w * cs / 2, cy - c.h * cs / 2, c.w * cs, c.h * cs); }
    if (showFaces) faceArrows(gC, W, H, CX, CY, cfu, cfv, occ, 1);
    lensC = cpointer ? lens(gC, W, H, CX, CY, cfu, occ, pickFace(CX, CY, cfu, occ, cpointer), 1) : null;
    zoom(gC, W, H, CX, CY, cfu, cfv, occ, cpointer, 1, '150,160,255');
  }
  // flux on every face, both directions: vertical faces carry x-flux, horizontal faces carry y-flux
  function faceArrows(g, W, H, nx, ny, fu, fv, rho, step) {
    const cs = W / nx, head = (X, Y, dx, dy, F, maxL) => {
      if (F < 0.015) return; const L = Math.min(maxL, 3 + F * cs * 3.2), ux = dx, uy = dy;
      g.beginPath(); g.moveTo(X - ux * L / 2, Y - uy * L / 2); g.lineTo(X + ux * L / 2, Y + uy * L / 2); g.stroke();
      const hx = X + ux * L / 2, hy = Y + uy * L / 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - ux * 4 - uy * 2.6, hy - uy * 4 + ux * 2.6); g.lineTo(hx - ux * 4 + uy * 2.6, hy - uy * 4 - ux * 2.6); g.fill();
    };
    g.save(); g.strokeStyle = g.fillStyle = 'rgba(255,214,170,0.85)'; g.lineWidth = 1.1;
    const maxL = cs * step * 0.42;
    for (let y = Math.floor(step / 2); y < ny; y += step) for (let x = step; x < nx; x += step) {
      const u = fu[y * (nx + 1) + x], F = Math.abs(u) * (rho[y * nx + (u > 0 ? x - 1 : x)] || 0);
      head(x * cs, (y + 0.5) * cs, Math.sign(u), 0, F, maxL);
    }
    for (let y = step; y < ny; y += step) for (let x = Math.floor(step / 2); x < nx; x += step) {
      const v = fv[y * nx + x], F = Math.abs(v) * (rho[(v > 0 ? y - 1 : y) * nx + x] || 0);
      head((x + 0.5) * cs, y * cs, 0, Math.sign(v), F, maxL);
    }
    g.restore();
  }
  // magnifier: the cells around the pointer drawn large in the top-right corner, every face flux shown
  function zoom(g, W, H, nx, ny, fu, fv, rho, at, gain, col) {
    if (!at) return null;
    const R = 4, cx = Math.max(R, Math.min(nx - R, Math.round(at.x))), cy = Math.max(R, Math.min(ny - R, Math.round(at.y)));
    const cs = W / nx, S = Math.min(W, H) * 0.56, z = S / (2 * R), ox = W - S - 12, oy = 12;
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.strokeRect((cx - R) * cs, (cy - R) * cs, 2 * R * cs, 2 * R * cs);
    g.beginPath(); g.moveTo((cx + R) * cs, (cy - R) * cs); g.lineTo(ox, oy + S); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke();
    g.fillStyle = '#0b0b0c'; g.fillRect(ox, oy, S, S);
    let flowIn = 0;
    for (let j = 0; j < 2 * R; j++) for (let i = 0; i < 2 * R; i++) {
      const x = cx - R + i, y = cy - R + j, v = Math.min(1, (rho[y * nx + x] || 0) * gain);
      g.fillStyle = `rgba(${col},${0.08 + 0.85 * v})`; g.fillRect(ox + i * z + 1, oy + j * z + 1, z - 2, z - 2);
    }
    g.strokeStyle = g.fillStyle = '#ffc48c';
    const arrow = (X, Y, dx, dy, F) => { if (F < 0.004) return; const L = Math.min(z * 0.9, 6 + F * z * 2.2), w = Math.max(1.2, Math.min(5, 1 + F * 6)); g.lineWidth = w;
      g.beginPath(); g.moveTo(X - dx * L / 2, Y - dy * L / 2); g.lineTo(X + dx * (L / 2 - 5), Y + dy * (L / 2 - 5)); g.stroke();
      const hx = X + dx * L / 2, hy = Y + dy * L / 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - dx * 8 - dy * (w + 3), hy - dy * 8 + dx * (w + 3)); g.lineTo(hx - dx * 8 + dy * (w + 3), hy - dy * 8 - dx * (w + 3)); g.fill(); };
    for (let j = 0; j < 2 * R; j++) for (let i = 1; i < 2 * R; i++) { const x = cx - R + i, y = cy - R + j, u = fu[y * (nx + 1) + x], F = Math.abs(u) * (rho[y * nx + (u > 0 ? x - 1 : x)] || 0); arrow(ox + i * z, oy + (j + 0.5) * z, Math.sign(u), 0, F); flowIn += F; }
    for (let j = 1; j < 2 * R; j++) for (let i = 0; i < 2 * R; i++) { const x = cx - R + i, y = cy - R + j, v = fv[y * (nx + 0) + x + y * 0] !== undefined ? fv[y * nx + x] : 0, F = Math.abs(v) * (rho[(v > 0 ? y - 1 : y) * nx + x] || 0); arrow(ox + (i + 0.5) * z, oy + j * z, 0, Math.sign(v), F); }
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.strokeRect(ox, oy, S, S);
    g.restore();
    return true;
  }
  function fit(cv) { const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
  const out = (k, s) => { const e = root.querySelector(`[data-out="${k}"]`); if (e) e.textContent = s; };

  // pointer stirs the water
  cvW.addEventListener('pointermove', e => { const r = cvW.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * NX, y = (e.clientY - r.top) / r.height * NY; pointer = pointer ? { x, y, dx: x - pointer.x, dy: y - pointer.y } : { x, y, dx: 0, dy: 0 }; });
  cvW.addEventListener('pointerleave', () => { pointer = null; });
  cvC.addEventListener('pointermove', e => { const r = cvC.getBoundingClientRect(); cpointer = { x: (e.clientX - r.left) / r.width * CX, y: (e.clientY - r.top) / r.height * CY }; });
  cvC.addEventListener('pointerleave', () => { cpointer = null; });
  root.querySelector('[data-in="faces"]').addEventListener('change', e => { showFaces = e.target.checked; });

  let last = 0;
  const onScreen = () => { const r = root.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (onScreen()) {
      fit(cvW); fit(cvC);
      stepWater(dt * 6); stepCars(dt);
      drawWater(); drawCars();
      const inGrid = dye.reduce((a, b) => a + b, 0);
      out('w-in', inGrid.toFixed(1)); out('w-add', added.toFixed(1)); out('w-out', left.toFixed(1)); out('w-bal', (added - left - inGrid).toFixed(3));
      const fmt = L => L ? `ρᵢ ${L.rhoI.toFixed(2)} × u ${Math.abs(L.uu).toFixed(2)} → F ${L.F.toFixed(2)}` : '';
      out('w-face', fmt(lensW)); out('c-face', fmt(lensC));
      const area = occ.reduce((a, b) => a + b, 0);
      out('c-area', (area * 0.5625).toFixed(2) + ' m²'); out('c-area0', (cars.area0 * 0.5625).toFixed(2) + ' m²');
    }
    if (!still) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
