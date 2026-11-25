// Results charts drawn as SVG: HUGSIM hexagon (six metrics) and Odyssey RouteDS vs SDC (up and right is better).
(() => {
  const ink = '#f2f2f2', mute = 'rgba(210,210,215,0.6)', line = 'rgba(255,255,255,0.10)';
  const PAL = { 'FluxDrive (Ours)': '#3d8bff', 'FPD-Drive': '#e0a46a', 'DrivoR': '#7fb7a4', 'SparseDriveV2': '#9aa6e8', 'UniAD': '#c98fb5', 'VAD': '#8f98a3', 'ST-P3': '#c7b26a',
    'LTF': '#8f98a3', 'DiffusionDrive': '#c7b26a', 'ReCogDrive': '#c98fb5', 'SafeDrive': '#e0a46a' };
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.fill || ink}" font-size="${o.size || 12}" font-family="Inter, system-ui, sans-serif" font-weight="${o.w || 500}" text-anchor="${o.a || 'middle'}" dominant-baseline="${o.b || 'auto'}">${s}</text>`;
  const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true; document.body.appendChild(tip);
  const showTip = (e, html) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY - r.height - 10) + 'px'; };
  const hideTip = () => { tip.hidden = true; };
  addEventListener('scroll', hideTip, { passive: true, capture: true }); addEventListener('wheel', hideTip, { passive: true }); addEventListener('blur', hideTip);
  addEventListener('scroll', hideTip, { passive: true }); addEventListener('blur', hideTip);
  document.addEventListener('pointermove', e => { if (!tip.hidden && !(e.target.closest && e.target.closest('svg.chart .series'))) hideTip(); }, { passive: true });

  // ---------- HUGSIM hexagon ----------
  function radar(el, withOurs = true) {
    // HD on the top vertex, then clockwise; values reordered from [NC, DAC, TTC, COM, RC, HD]
    const AX = ['HD', 'NC', 'DAC', 'TTC', 'COM', 'RC'];
    const RAW = [
      ['FluxDrive (Ours)', [76.0, 97.8, 71.1, 91.8, 57.4, 47.3]],
      ['FPD-Drive', [73.3, 97.1, 70.7, 83.3, 46.5, 37.8]],
      ['DrivoR', [55.9, 95.8, 52.1, 93.2, 49.8, 35.0]],
      ['SparseDriveV2', [55.1, 92.2, 50.0, 97.4, 49.0, 33.7]],
      ['UniAD', [57.0, 79.8, 40.7, 47.2, 43.5, 21.8]],
      ['VAD', [56.2, 74.9, 46.8, 98.5, 25.4, 12.5]],
      ['ST-P3', [67.4, 90.8, 59.4, 54.3, 43.0, 27.5]],
    ];
    const S = RAW.filter(([n]) => withOurs || !n.startsWith('FluxDrive')).map(([n, v]) => [n, [v[5], v[0], v[1], v[2], v[3], v[4]]]);
    // each axis scaled to a little above its best score, so differences show on every metric
    const ALL = RAW.map(([n, v]) => [v[5], v[0], v[1], v[2], v[3], v[4]]);
    const MAX = AX.map((_, k) => Math.min(100, Math.ceil(Math.max(...ALL.map(r => r[k])) * 1.08)));   // same axes with or without FluxDrive
    const W = 480, H = 400, cx = 180, cy = 205, R = 140;
    const pt = (k, v, raw = true) => { const a = -Math.PI / 2 + k * Math.PI / 3, r = raw ? v / MAX[k] : v / 100; return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r]; };
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="HUGSIM metrics per method on a hexagon; FluxDrive encloses the largest area"><defs><filter id="glowR" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>`;
    [25, 50, 75, 100].forEach(v => { s += `<polygon points="${AX.map((_, k) => pt(k, v, false).join(',')).join(' ')}" fill="none" stroke="${line}"/>`; });
    AX.forEach((a, k) => { const [x, y] = pt(k, 100, false), [lx, ly] = pt(k, 120, false); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${line}"/>` + T(lx, ly - 7, a, { size: 12, w: 600, b: 'middle' }) + `<text class="val" data-k="${k}" x="${lx}" y="${ly + 9}" fill="#3d8bff" font-size="12.5" font-weight="700" font-family="Inter, system-ui" text-anchor="middle" dominant-baseline="middle"></text>`; });
    S.filter(([n]) => n.startsWith('FluxDrive')).forEach(([n, v]) => { s += `<g class="halo" filter="url(#glowR)" pointer-events="none"><polygon points="${v.map((x, k) => pt(k, x).join(',')).join(' ')}" fill="${PAL[n]}" fill-opacity="0.6" stroke="${PAL[n]}" stroke-width="10"/><animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.8s" repeatCount="indefinite"/></g>`; });
    S.slice().reverse().forEach(([n, v]) => {
      const ours = n.startsWith('FluxDrive'), c = PAL[n];
      s += `<g class="series${ours ? ' ours' : ''}" data-n="${n}"><polygon points="${v.map((x, k) => pt(k, x).join(',')).join(' ')}" fill="${c}" fill-opacity="${ours ? 0.16 : 0.04}" stroke="${c}" stroke-width="${ours ? 2.4 : 1.3}" stroke-opacity="${ours ? 1 : 0.8}"/>`;
      v.forEach((x, k) => { const [px, py] = pt(k, x); s += `<circle cx="${px}" cy="${py}" r="${ours ? 3.6 : 2.4}" fill="${c}"/><circle class="hit" cx="${px}" cy="${py}" r="10" fill="transparent" data-k="${k}"/>`; });
      s += `</g>`;
    });
    // legend
    s += `<g class="legend">` + S.map(([n], i) => `<g class="lg" data-n="${n}" transform="translate(372,${110 + i * 24})" tabindex="0"><rect width="12" height="12" rx="3" fill="${PAL[n]}"/>${T(18, 10, n.replace(' (Ours)', ''), { a: 'start', size: 11.5, fill: n.startsWith('Flux') ? '#3d8bff' : mute, w: n.startsWith('Flux') ? 600 : 500 })}</g>`).join('') + `</g>`;
    el.innerHTML = s + '</svg>';
    const svg = el.querySelector('svg');
    let picked = S[0][0];
    const show = n => { const v = S.find(r => r[0] === n)[1]; svg.querySelectorAll('.val').forEach(t => { t.textContent = v[t.dataset.k].toFixed(1); t.setAttribute('fill', PAL[n]); }); svg.querySelectorAll('.lg').forEach(g => g.classList.toggle('on', g.dataset.n === n)); };
    const focus = n => { svg.querySelectorAll('.series').forEach(g => g.classList.toggle('dim', !!n && g.dataset.n !== n)); show(n || picked); };
    svg.querySelectorAll('.lg').forEach(g => g.addEventListener('click', () => { picked = g.dataset.n; focus(picked); }));
    svg.querySelectorAll('.lg').forEach(g => g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picked = g.dataset.n; focus(picked); } }));
    show(picked);
    svg.querySelectorAll('.lg').forEach(g => { g.addEventListener('pointerenter', () => focus(g.dataset.n)); g.addEventListener('pointerleave', () => focus(picked === S[0][0] ? null : picked)); });
    svg.querySelectorAll('.series').forEach(g => {
      g.addEventListener('pointerenter', () => focus(g.dataset.n)); g.addEventListener('pointerleave', () => { focus(null); hideTip(); });
      g.querySelectorAll('.hit').forEach(h => h.addEventListener('pointermove', e => { const v = S.find(x => x[0] === g.dataset.n)[1]; showTip(e, `<b>${g.dataset.n}</b><span>${AX[h.dataset.k]} ${v[h.dataset.k].toFixed(1)}</span>`); }));
    });
  }

  // ---------- Odyssey: up and right is better ----------
  function odyssey(el, withOurs = true) {
    const D0 = [ // [name, RouteDS non-reactive, SDC, RouteDS reactive, SDC]
      ['FluxDrive (Ours)', 29.8, 66, 30.9, 69], ['SafeDrive', 27.5, 41, 30.4, 45], ['DiffusionDrive', 25.6, 59, 24.2, 59],
      ['DrivoR', 20.6, 50, 25.5, 53], ['LTF', 16.2, 51, 16.3, 54], ['ReCogDrive', 15.4, 71, 20.3, 62]];
    const D = D0.filter(([n]) => withOurs || !n.startsWith('FluxDrive'));
    const W = 460, H = 400, L = 56, Rr = 440, Tt = 30, B = 350, x0 = 12, x1 = 34, y0 = 38, y1 = 76;
    const X = v => L + (v - x0) / (x1 - x0) * (Rr - L), Y = v => B - (v - y0) / (y1 - y0) * (B - Tt);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Odyssey: RouteDS against share of distance completed, non-reactive to reactive traffic; FluxDrive sits furthest up and right">`;
    s += `<defs><radialGradient id="better" cx="1" cy="0" r="1.25"><stop offset="0" stop-color="#3d8bff" stop-opacity="0.30"/><stop offset="0.45" stop-color="#3d8bff" stop-opacity="0.08"/><stop offset="1" stop-color="#3d8bff" stop-opacity="0"/></radialGradient><filter id="glowO" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="context-stroke"/></marker></defs>`;
    s += `<rect x="${L}" y="${Tt}" width="${Rr - L}" height="${B - Tt}" fill="url(#better)"/>`;
    for (let v = 15; v <= 34; v += 5) s += `<line x1="${X(v)}" y1="${Tt}" x2="${X(v)}" y2="${B}" stroke="${line}"/>` + T(X(v), B + 18, v, { size: 11, fill: mute });
    for (let v = 40; v <= 76; v += 10) s += `<line x1="${L}" y1="${Y(v)}" x2="${Rr}" y2="${Y(v)}" stroke="${line}"/>` + T(L - 10, Y(v) + 4, v, { size: 11, fill: mute, a: 'end' });
    s += T((L + Rr) / 2, B + 40, 'RouteDS →', { size: 12, w: 600 }) + `<text transform="translate(16,${(Tt + B) / 2}) rotate(-90)" fill="${ink}" font-size="12" font-weight="600" font-family="Inter, system-ui" text-anchor="middle">SDC →</text>`;
    D.slice().reverse().forEach(([n, a, b, c, d]) => {
      const ours = n.startsWith('Flux'), col = PAL[n];
      s += `<g class="series${ours ? ' ours' : ''}" data-n="${n}"><line x1="${X(a)}" y1="${Y(b)}" x2="${X(c)}" y2="${Y(d)}" stroke="${col}" stroke-width="${ours ? 1.6 : 1.1}" stroke-dasharray="3 3" stroke-linecap="round" opacity="0.7"/>` +
        `<circle cx="${X(a)}" cy="${Y(b)}" r="${ours ? 5 : 4}" fill="#111" stroke="${col}" stroke-width="1.6"/><circle cx="${X(c)}" cy="${Y(d)}" r="${ours ? 6 : 4.5}" fill="${col}"/>` +
        (ours ? T(X(c), Y(d) - 15.7, 'FluxDrive', { a: 'middle', size: 16, fill: col, w: 700 }) : '') + (ours ? '' : T(X(c) + (X(c) > Rr - 90 ? -12 : 10), Y(d) + (n === 'ReCogDrive' || n === 'DiffusionDrive' ? -10 : X(c) > Rr - 90 ? -12 : 4), n.replace(' (Ours)', ''), { a: X(c) > Rr - 90 ? 'end' : 'start', size: ours ? 16 : 11, fill: ours ? '#3d8bff' : col, w: ours ? 700 : 500 })) +
        `<circle class="hit" cx="${X(c)}" cy="${Y(d)}" r="14" fill="transparent"/><circle class="hit" cx="${X(a)}" cy="${Y(b)}" r="12" fill="transparent"/></g>`;
    });
    s += `<g transform="translate(${L + 10},${B - 34})"><circle cx="6" cy="6" r="4" fill="#111" stroke="${mute}" stroke-width="1.5"/>${T(16, 10, 'non-reactive', { a: 'start', size: 11, fill: mute })}<circle cx="104" cy="6" r="4.5" fill="${mute}"/>${T(114, 10, 'reactive', { a: 'start', size: 11, fill: mute })}</g>`;
    el.innerHTML = s + '</svg>';
    const svg = el.querySelector('svg');
    svg.querySelectorAll('.series').forEach(g => {
      g.addEventListener('pointerenter', () => svg.querySelectorAll('.series').forEach(o => o.classList.toggle('dim', o !== g)));
      g.addEventListener('pointerleave', () => { svg.querySelectorAll('.series').forEach(o => o.classList.remove('dim')); hideTip(); });
      g.addEventListener('pointermove', e => { const r = D.find(x => x[0] === g.dataset.n); showTip(e, `<b>${r[0]}</b><span>non-reactive: RouteDS ${r[1]}, SDC ${r[2]}</span><span>reactive: RouteDS ${r[3]}, SDC ${r[4]}</span>`); });
    });
  }

  // the tooltip never outlives the pointer leaving a chart
  const leaveAll = () => document.querySelectorAll('svg.chart').forEach(s => s.addEventListener('pointerleave', hideTip));
  window.FDCharts = { radar: (el, o) => { radar(el, o); leaveAll(); }, odyssey: (el, o) => { odyssey(el, o); leaveAll(); } };
  document.querySelectorAll('[data-chart="radar"]').forEach(el => radar(el));
  document.querySelectorAll('[data-chart="odyssey"]').forEach(el => odyssey(el));
  leaveAll();
})();
