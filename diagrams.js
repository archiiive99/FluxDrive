// Figures drawn as web elements (SVG built here), not pasted paper PDFs.
(() => {
  const COL = { car: '150,160,255', cost: '226,120,200', ego: '255,196,140', traj: '143,227,176', line: 'rgba(255,255,255,0.10)', ink: '#f2f2f2', mute: 'rgba(210,210,215,0.62)' };
  const esc = s => String(s);
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.fill || COL.ink}" font-size="${o.size || 13}" font-family="Inter, system-ui, sans-serif" font-weight="${o.w || 500}" text-anchor="${o.a || 'start'}"${o.italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`;
  const arrow = (x1, y1, x2, y2, c = 'rgba(255,255,255,0.55)', w = 1.4, dash = '') => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
    return `<line x1="${x1}" y1="${y1}" x2="${x2 - Math.cos(a) * 2}" y2="${y2 - Math.sin(a) * 2}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` +
      `<path d="M${x2},${y2} L${x2 - h * Math.cos(a - 0.42)},${y2 - h * Math.sin(a - 0.42)} L${x2 - h * Math.cos(a + 0.42)},${y2 - h * Math.sin(a + 0.42)}Z" fill="${c}"/>`;
  };
  // share of each grid cell covered by a rotated box (centre cx,cy in cells, size w x h, angle th)
  function cover(n, m, cx, cy, w, h, th) {
    const f = [], S = 6, c = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      let k = 0;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
        const x = i + (a + 0.5) / S - cx, y = j + (b + 0.5) / S - cy, u = x * c + y * s, v = -x * s + y * c;
        if (Math.abs(u) <= w / 2 && Math.abs(v) <= h / 2) k++;
      }
      f.push(k / (S * S));
    }
    return f;
  }
  function grid(x, y, n, m, cs, vals, col, opts = {}) {
    let g = `<rect x="${x}" y="${y}" width="${n * cs}" height="${m * cs}" rx="6" fill="rgba(0,0,0,0.35)" stroke="${COL.line}"/>`;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const v = vals ? vals[j * n + i] : 0;
      if (v > 0.02) g += `<rect x="${x + i * cs + 0.5}" y="${y + j * cs + 0.5}" width="${cs - 1}" height="${cs - 1}" fill="rgba(${col},${Math.min(0.95, v * (opts.gain || 1))})"/>`;
    }
    for (let i = 1; i < n; i++) g += `<line x1="${x + i * cs}" y1="${y}" x2="${x + i * cs}" y2="${y + m * cs}" stroke="${COL.line}" stroke-width="0.6"/>`;
    for (let j = 1; j < m; j++) g += `<line x1="${x}" y1="${y + j * cs}" x2="${x + n * cs}" y2="${y + j * cs}" stroke="${COL.line}" stroke-width="0.6"/>`;
    return g;
  }
  const rbox = (x, y, cs, cx, cy, w, h, th, stroke, dash = '') => {
    const c = Math.cos(th), s = Math.sin(th), P = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => [x + (cx + u * c - v * s) * cs, y + (cy + u * s + v * c) * cs]);
    return `<polygon points="${P.map(p => p.join(',')).join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.8"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  };

  // ---------- flux across cell faces ----------
  function flux() {
    const n = 12, m = 9, cs = 22, th = -0.42, W = 4.4, H = 1.9;
    const A = cover(n, m, 4.2, 5.2, W, H, th), B = cover(n, m, 7.4, 3.9, W, H, th);
    const sum = f => f.reduce((a, b) => a + b, 0) * 0.75 * 0.75;
    const y0 = 52, xL = 20, xR = 20 + n * cs + 36 + 230 + 36;
    let s = `<svg viewBox="0 0 ${xR + n * cs + 20} ${y0 + m * cs + 46}" class="dg" role="img" aria-label="Flux forecast: occupied area moves across cell faces; the total stays the same from t = 0 to t = 0.5 s">`;
    s += T(xL + n * cs / 2, 30, 't = 0 s', { a: 'middle', size: 15, italic: true });
    s += grid(xL, y0, n, m, cs, A, COL.car) + rbox(xL, y0, cs, 4.2, 5.2, W, H, th, '#d6dbff');
    s += arrow(xL + 4.2 * cs, y0 + 5.2 * cs, xL + 6.2 * cs, y0 + 4.35 * cs, '#ffc48c', 2) + T(xL + 6.35 * cs, y0 + 4.1 * cs, 'v', { fill: '#ffc48c', italic: true, size: 14 });
    s += `<rect x="${xL + 6 * cs}" y="${y0 + 4 * cs}" width="${cs * 2}" height="${cs}" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    s += T(xL + 8, y0 + m * cs - 10, `Σm = ${sum(A).toFixed(1)} m²`, { size: 13, fill: COL.mute });
    // zoom on one face
    const zx = xL + n * cs + 36, zy = y0, zw = 230, zh = m * cs;
    s += `<line x1="${xL + 8 * cs}" y1="${y0 + 4 * cs}" x2="${zx}" y2="${zy}" stroke="rgba(255,255,255,0.25)" stroke-dasharray="3 3"/><line x1="${xL + 8 * cs}" y1="${y0 + 5 * cs}" x2="${zx}" y2="${zy + zh}" stroke="rgba(255,255,255,0.25)" stroke-dasharray="3 3"/>`;
    s += T(zx + zw / 2, 30, 'Flux across a face', { a: 'middle', size: 15, w: 600 });
    s += `<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" rx="8" fill="rgba(0,0,0,0.35)" stroke="${COL.line}"/>`;
    s += `<rect x="${zx}" y="${zy}" width="${zw / 2}" height="${zh}" rx="8" fill="rgba(${COL.car},0.55)"/><rect x="${zx + zw / 2}" y="${zy}" width="${zw / 2}" height="${zh}" fill="rgba(${COL.car},0.14)"/>`;
    s += `<line x1="${zx + zw / 2}" y1="${zy + 12}" x2="${zx + zw / 2}" y2="${zy + zh - 12}" stroke="#fff" stroke-width="3"/>`;
    s += arrow(zx + 22, zy + zh * 0.62, zx + zw / 2 - 14, zy + zh * 0.34, '#ffc48c', 2.2) + T(zx + 40, zy + zh * 0.4, 'v', { fill: '#ffc48c', italic: true, size: 16 });
    s += arrow(zx + 22, zy + zh * 0.62, zx + zw / 2 - 14, zy + zh * 0.62, '#ffc48c', 1.6, '4 3') + T(zx + 52, zy + zh * 0.62 + 22, 'u', { fill: '#ffc48c', italic: true, size: 15 }) + T(zx + 62, zy + zh * 0.62 + 27, 'ij', { fill: '#ffc48c', italic: true, size: 10 });
    s += arrow(zx + zw / 2, zy + zh * 0.24, zx + zw / 2 + 40, zy + zh * 0.24, '#fff', 1.6) + T(zx + zw / 2 + 46, zy + zh * 0.24 + 5, 'n', { italic: true, size: 15 }) + T(zx + zw / 2 + 55, zy + zh * 0.24 + 10, 'ij', { italic: true, size: 10 });
    s += arrow(zx + zw / 2 + 6, zy + zh * 0.5, zx + zw / 2 + 74, zy + zh * 0.5, '#fff', 2.2) + T(zx + zw / 2 + 24, zy + zh * 0.5 - 10, 'F', { italic: true, size: 16, w: 600 }) + T(zx + zw / 2 + 34, zy + zh * 0.5 - 5, 'ij', { italic: true, size: 10 });
    s += T(zx + 18, zy + zh - 16, 'cell i', { size: 13, fill: COL.mute }) + T(zx + zw - 18, zy + zh - 16, 'cell j', { size: 13, fill: COL.mute, a: 'end' });
    // later
    s += T(xR + n * cs / 2, 30, 't = 0.5 s', { a: 'middle', size: 15, italic: true });
    s += grid(xR, y0, n, m, cs, B, COL.car) + rbox(xR, y0, cs, 4.2, 5.2, W, H, th, 'rgba(255,255,255,0.4)', '4 3') + rbox(xR, y0, cs, 7.4, 3.9, W, H, th, '#d6dbff');
    s += T(xR + n * cs - 8, y0 + m * cs - 10, `Σm = ${sum(B).toFixed(1)} m²`, { size: 13, fill: COL.mute, a: 'end' });
    s += T(xL, y0 + m * cs + 32, 'What leaves cell i through a face enters cell j, so the occupied area is the same at both times.', { size: 13, fill: COL.mute });
    return s + '</svg>';
  }

  // ---------- method overview ----------
  function overview() {
    const W = 1180, H = 400;
    const node = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="rgba(255,255,255,0.035)" stroke="${COL.line}"/>`;
    const title = (x, y, t, sub) => T(x, y, t, { a: 'middle', size: 14, w: 600 }) + (sub ? T(x, y + 18, sub, { a: 'middle', size: 11.5, fill: COL.mute }) : '');
    // a 12 x 12 patch of the grid shared by the middle panels; one car ahead-left cutting toward the ego lane
    const n = 12, cs = 9;
    const carAt = t => cover(n, n, 3 + t * 1.6, 3.2 + t * 0.9, 2.6, 1.4, 0.45);
    const blank = new Array(n * n).fill(0);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="dg" role="img" aria-label="FluxDrive pipeline: multi-view images to a BEV feature, flux forecast, cost map and Flux Value Iteration, which returns the trajectory; MaxEnt IRL and a safety loss train it">`;
    s += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b525c"/><stop offset="1" stop-color="#8d949e"/></linearGradient></defs>`;
    const midY = 150;
    // images
    s += node(16, 70, 136, 160);
    for (let k = 0; k < 6; k++) { const x = 28 + (k % 2) * 58, y = 84 + Math.floor(k / 2) * 46; s += `<rect x="${x}" y="${y}" width="52" height="38" rx="5" fill="url(#sky)"/><rect x="${x}" y="${y + 25}" width="52" height="13" fill="#3c3f45"/><rect x="${x + 21}" y="${y + 19}" width="11" height="8" rx="2" fill="rgba(${COL.car},0.9)"/>`; }
    s += title(84, 254, 'Multi-view images', 'six cameras');
    s += `<rect x="40" y="22" width="88" height="26" rx="8" fill="rgba(255,255,255,0.05)" stroke="${COL.line}"/>` + T(84, 39, 'Command', { a: 'middle', size: 12 });
    // BEV feature
    s += arrow(156, midY, 190, midY);
    s += node(194, 70, 140, 160);
    const feat = blank.map((_, i) => 0.14 + 0.3 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.31)) + carAt(0)[i] * 0.55);
    s += grid(210, 96, n, n, 9, feat, '205,208,218');
    s += title(264, 254, 'BEV feature', 'occupancy, velocity');
    // auxiliary heads, drawn as what they predict
    const ax = [[202, 'Boxes'], [250, 'Motion'], [298, 'Map']];
    s += `<line x1="264" y1="230" x2="264" y2="290" stroke="${COL.line}"/><line x1="226" y1="290" x2="322" y2="290" stroke="${COL.line}"/>`;
    ax.forEach(([x, t]) => { s += `<line x1="${x + 24}" y1="290" x2="${x + 24}" y2="298" stroke="${COL.line}"/>` + `<rect x="${x}" y="298" width="48" height="40" rx="8" fill="rgba(255,255,255,0.03)" stroke="${COL.line}"/>` + T(x + 24, 356, t, { a: 'middle', size: 11, fill: COL.mute }); });
    s += `<rect x="214" y="310" width="14" height="9" rx="2" fill="none" stroke="#c9cfff" stroke-width="1.3" transform="rotate(-12 221 314)"/><rect x="226" y="322" width="10" height="7" rx="2" fill="none" stroke="#c9cfff" stroke-width="1.3"/>`;
    s += arrow(258, 326, 272, 312, '#ffc48c', 1.3) + arrow(266, 330, 284, 326, '#ffc48c', 1.3);
    s += `<path d="M304,334 C312,318 320,312 340,306" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.3"/><path d="M314,336 C322,322 330,316 342,314" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.3" stroke-dasharray="3 2"/>`;
    s += T(264, 380, 'auxiliary heads', { a: 'middle', size: 11, fill: COL.mute });
    // flux forecast: the car's area at three steps on one grid
    s += arrow(338, midY, 372, midY);
    s += node(376, 70, 140, 160);
    const fc = blank.map((_, i) => Math.max(carAt(0)[i], carAt(1)[i] * 0.6, carAt(2)[i] * 0.35));
    s += grid(392, 96, n, n, 9, fc, COL.car);
    s += arrow(392 + 3.6 * cs, 96 + 3.6 * cs, 392 + 7.4 * cs, 96 + 5.6 * cs, '#ffc48c', 1.6);
    s += title(446, 254, 'Flux forecast', 'T steps');
    // cost map: overlap of the ego footprint with that forecast, plus a bounded BEV term at the road edges
    s += arrow(520, midY, 554, midY);
    s += node(558, 70, 140, 160);
    const cst = blank.map((_, i) => { const x = i % n, y = (i / n) | 0; let v = 0; for (let t = 0; t <= 2; t++) { const c = carAt(t); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n) v = Math.max(v, c[yy * n + xx] * (dx || dy ? 0.55 : 1) * (1 - t * 0.2)); } } return Math.max(v, x === 0 || x === n - 1 ? 0.28 : 0); });
    s += grid(574, 96, n, n, 9, cst, COL.cost);
    s += title(628, 254, 'Cost map', 'footprint ∩ forecast');
    // flux value iteration: ego probability spreading forward, around the cost
    s += arrow(702, midY, 736, midY);
    s += node(740, 70, 140, 160);
    const eg = blank.map((_, i) => { const x = i % n + 0.5, y = ((i / n) | 0) + 0.5; let v = 0; for (let t = 0; t < 6; t++) { const cy = 11 - t * 1.7, cx = 6.6 + (t > 2 ? (t - 2) * 0.35 : 0) - (t < 3 ? 0 : 0); const d2 = (x - cx) ** 2 + (y - cy) ** 2; v = Math.max(v, Math.exp(-d2 / (0.5 + t * 0.35)) * (1 - t * 0.1)); } return v * (1 - Math.min(1, cst[i] * 1.2)); });
    s += grid(756, 96, n, n, 9, eg, COL.ego, { gain: 1.4 });
    s += title(810, 254, 'Flux Value Iteration', 'every grid path');
    // ego motion from the BEV feature and the command sets the drift
    s += `<path d="M128,35 L780,35 L780,58" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2"/>` + arrow(780, 52, 780, 68, 'rgba(255,255,255,0.45)', 1.2);
    s += `<path d="M264,70 L264,52 L780,52" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    s += `<rect x="820" y="22" width="108" height="26" rx="8" fill="rgba(255,255,255,0.05)" stroke="${COL.line}"/>` + T(874, 39, 'ego motion v, ω, a', { a: 'middle', size: 11.5 }) + `<line x1="820" y1="35" x2="780" y2="35" stroke="rgba(255,255,255,0.3)"/>`;
    // trajectory
    s += arrow(884, midY, 918, midY);
    s += node(922, 70, 240, 160);
    const tp = [[1042, 214], [1040, 192], [1037, 170], [1040, 148], [1050, 126], [1066, 106]];
    s += `<line x1="1000" y1="70" x2="1000" y2="230" stroke="rgba(255,255,255,0.12)" stroke-dasharray="6 6"/><line x1="1084" y1="70" x2="1084" y2="230" stroke="rgba(255,255,255,0.12)" stroke-dasharray="6 6"/>`;
    s += `<polyline points="${tp.map(p => p.join(',')).join(' ')}" fill="none" stroke="rgb(${COL.traj})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` + tp.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="rgb(${COL.traj})"/>`).join('');
    s += `<rect x="1032" y="212" width="20" height="14" rx="3" fill="rgba(${COL.ego},0.25)" stroke="rgb(${COL.ego})"/>`;
    s += title(1042, 254, 'Trajectory', 'mean of ego probability, 3 s');
    // training
    s += `<line x1="1042" y1="276" x2="1042" y2="298" stroke="${COL.line}"/><line x1="982" y1="298" x2="1102" y2="298" stroke="${COL.line}"/>`;
    [[932, 'MaxEnt IRL', 'logged path'], [1052, 'Safety loss', 'true boxes']].forEach(([x, t, sub]) => { s += `<line x1="${x + 50}" y1="298" x2="${x + 50}" y2="306" stroke="${COL.line}"/><rect x="${x}" y="306" width="100" height="44" rx="10" fill="rgba(255,255,255,0.03)" stroke="${COL.line}"/>` + T(x + 50, 325, t, { a: 'middle', size: 12, w: 600 }) + T(x + 50, 341, sub, { a: 'middle', size: 9.5, fill: COL.mute }); });
    s += T(1042, 380, 'training', { a: 'middle', size: 11, fill: COL.mute });
    return s + '</svg>';
  }

  // ---------- one road scene, two planners, animated (4.8 s loop) ----------
  function scene(kind) {
    const W = 960, H = 300, roadTop = 52, roadBot = 216, D = '4.8s';
    let s = `<svg viewBox="0 0 ${W} ${H}" class="dg" role="img" aria-label="${kind === 'before' ? 'A car cuts in from the next lane; the candidate planner keeps its straight path at speed and hits it' : 'The same cut-in; FluxDrive forecasts where the car will be, slows behind it and keeps a gap'}">`;
    s += `<defs><radialGradient id="cb${kind}"><stop offset="0" stop-color="rgb(226,120,200)" stop-opacity="0.5"/><stop offset="1" stop-color="rgb(226,120,200)" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="${W}" height="${H}" rx="14" fill="#0c0c0c"/><rect y="${roadTop}" width="${W}" height="${roadBot - roadTop}" fill="#1a1a1a"/>`;
    s += `<line x1="0" y1="${roadTop}" x2="${W}" y2="${roadTop}" stroke="rgba(255,255,255,0.35)" stroke-width="2"/><line x1="0" y1="${roadBot}" x2="${W}" y2="${roadBot}" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>`;
    s += `<line x1="0" y1="134" x2="${W}" y2="134" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-dasharray="22 18"><animate attributeName="stroke-dashoffset" from="0" to="-40" dur="0.6s" repeatCount="indefinite"/></line>`;
    const carShape = (fill, stroke) => `<rect x="-35" y="-17" width="70" height="34" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>`;
    // the cut-in: from the left lane ahead into the ego lane
    const cutVals = '330,96; 430,104; 520,128; 600,158; 680,172; 680,172', cutKeys = '0;0.2;0.4;0.6;0.75;1';
    if (kind === 'after') {
      [[430, 112, 9], [520, 136, 12], [600, 160, 8]].forEach(([x, y, r], k) => {
        s += `<g opacity="0"><ellipse cx="${x}" cy="${y}" rx="${64 + k * 6}" ry="${34 + k * 3}" fill="url(#cb${kind})"/><g transform="translate(${x},${y}) rotate(${r})">${carShape(`rgba(150,160,255,${0.32 - k * 0.08})`, `rgba(201,207,255,${0.8 - k * 0.2})`)}</g>` +
          `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${0.04 + k * 0.04};${0.12 + k * 0.04};0.7;0.8;1" dur="${D}" repeatCount="indefinite"/></g>`;
      });
      s += T(560, 268, 'forecast footprint → cost', { size: 12, fill: 'rgb(236,160,215)' });
    } else {
      [[0, 'M150,172 C300,170 430,150 700,120'], [1, 'M150,172 C280,172 380,172 520,172'], [2, 'M150,172 C300,174 450,186 700,200'], [3, 'M150,172 C320,168 480,110 700,92']].forEach(([, p]) => { s += `<path d="${p}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="2 6"/>`; });
      s += `<path d="M150,172 L760,172" fill="none" stroke="rgb(255,196,140)" stroke-width="3" stroke-linecap="round" opacity="0.8"/>` + T(768, 176, 'picked', { a: 'start', size: 12, fill: '#ffc48c' });
    }
    s += `<g><g>${carShape('#9aa6ff', '#c9cfff')}</g><animateTransform attributeName="transform" type="translate" values="${cutVals}" keyTimes="${cutKeys}" dur="${D}" repeatCount="indefinite"/></g>`;
    // ego: before keeps speed and meets the cut-in; after slows behind it
    const egoVals = kind === 'before' ? '110,172; 260,172; 410,172; 560,172; 600,172; 600,172' : '110,172; 230,172; 320,172; 380,172; 420,172; 420,172';
    s += `<g><g>${carShape('rgba(255,196,140,0.22)', 'rgb(255,196,140)')}${T(0, 4, 'ego', { a: 'middle', size: 12, fill: '#ffd7b0' })}</g><animateTransform attributeName="transform" type="translate" values="${egoVals}" keyTimes="${cutKeys}" dur="${D}" repeatCount="indefinite"/></g>`;
    if (kind === 'before') {
      s += `<g opacity="0"><circle cx="620" cy="168" r="30" fill="rgba(255,80,80,0.18)" stroke="#ff6b6b" stroke-width="2.6"/>${T(620, 240, 'collision', { a: 'middle', size: 13, w: 600, fill: '#ff8a8a' })}` +
        `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.58;0.62;0.95;1" dur="${D}" repeatCount="indefinite"/></g>`;
      s += T(330, 40, 'detected, cutting in', { size: 12.5, fill: '#c9cfff' });
    } else {
      s += `<g opacity="0">${T(330, 240, 'slows behind it, keeps a gap', { size: 13, w: 600, fill: '#8fe3b0' })}<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.5;0.58;0.95;1" dur="${D}" repeatCount="indefinite"/></g>`;
      s += T(330, 40, 'detected, cutting in', { size: 12.5, fill: '#c9cfff' });
    }
    return s + '</svg>';
  }
  window.FDiagram = { flux, overview, scene };
  document.querySelectorAll('[data-diagram]').forEach(el => { el.innerHTML = window.FDiagram[el.dataset.diagram](el.dataset.kind); });
})();
