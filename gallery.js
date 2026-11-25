// Closed-loop driving videos: one benchmark at a time, a large player with its own transport bar, and a strip of clips.
(() => {
  const root = document.getElementById('gallery'); if (!root) return;
  const route = s => { const m = s.match(/(kitti360|waymo|pandaset)?_?scene-([\w-]+?)-(easy|medium|hard|extreme)-\d+/); if (!m) return s; const ds = { kitti360: 'KITTI-360', waymo: 'Waymo', pandaset: 'PandaSet' }[m[1]] || 'nuScenes'; return `${ds} · ${m[3]}`; };
  const bench = n => n.startsWith('alpasim__') ? 'AlpaSim' : n.startsWith('odyssey_') ? 'Odyssey' : 'HUGSIM';
  const label = n => { if (n.startsWith('alpasim__')) return 'scene ' + n.split('__')[1].replace('_noDrivoR', ''); if (n.startsWith('odyssey_')) { const m = n.match(/scene(\d+)_(\w+?)_/); return `scene ${+m[1]} · ${m[2]}`; } return route(n.split('__')[1] || n); };
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  root.innerHTML = `
    <div class="gv__top"><div class="seg seg--tabs gv__tabs" role="tablist" aria-label="Benchmark"></div><span class="gv__count"></span></div>
    <figure class="gv__player"><video playsinline muted preload="metadata"></video>
      <div class="wvtransport"><button class="wvplay" type="button" aria-label="Play or pause"><svg class="ic-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><svg class="ic-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg></button>
        <div class="wvtrack" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="wvrail"><div class="wvfill"></div></div><div class="wvknob"></div></div>
        <span class="wvclock"><b class="gv__t">0:00</b><i>/</i><span class="gv__d">0:00</span></span>
        <div class="wvspeed" role="group" aria-label="Playback speed"><button data-r="0.5">0.5x</button><button data-r="1" aria-pressed="true">1x</button><button data-r="2">2x</button></div>
        <button class="gv__nav" data-d="-1" aria-label="Previous clip"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg></button><button class="gv__nav" data-d="1" aria-label="Next clip"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5L10.5 8 6 12.5"/></svg></button></div>
      <figcaption class="gv__cap"></figcaption></figure>
    <div class="gv__strip" role="listbox" aria-label="Clips"></div>`;
  const tabsEl = root.querySelector('.gv__tabs'), v = root.querySelector('video'), track = root.querySelector('.wvtrack'), fill = root.querySelector('.wvfill'), knob = root.querySelector('.wvknob'), play = root.querySelector('.wvplay'),
    tEl = root.querySelector('.gv__t'), dEl = root.querySelector('.gv__d'), cap = root.querySelector('.gv__cap'), strip = root.querySelector('.gv__strip'), count = root.querySelector('.gv__count');
  let list = [], cur = 'HUGSIM', idx = 0, SIZE = {};
  const items = () => list.filter(n => bench(n) === cur);
  function show(i, autoplay = true) {
    const arr = items(); idx = (i + arr.length) % arr.length; const n = arr[idx];
    v.src = `assets/gallery2/${n}.mp4?v=2`; v.poster = `assets/gallery2/${n}.jpg?v=2`; v.style.aspectRatio = SIZE[n];
    cap.innerHTML = `<b>${cur}</b><span>${label(n)}</span>`; count.textContent = `${idx + 1} / ${arr.length}`;
    [...strip.children].forEach((c, k) => c.setAttribute('aria-selected', k === idx));
    const th = strip.children[idx]; if (th) strip.scrollTo({ left: th.offsetLeft - (strip.clientWidth - th.clientWidth) / 2, behavior: 'smooth' });   // moves the strip only, never the page
    if (autoplay) v.play().catch(() => {});
  }
  function bench_(b) {
    cur = b; [...tabsEl.children].forEach(t => t.getAttribute && t.setAttribute('aria-selected', t.dataset && t.dataset.b === b));
    strip.innerHTML = items().map((n, k) => `<button class="gv__thumb" role="option" data-k="${k}"><img src="assets/gallery2/${n}.jpg?v=2" alt="" loading="lazy" style="aspect-ratio:${SIZE[n]}"><span>${label(n)}</span></button>`).join('');
    strip.querySelectorAll('.gv__thumb').forEach(b => b.addEventListener('click', () => show(+b.dataset.k)));
    show(0, false);
  }
  fetch('assets/gallery2/list.json?' + Date.now()).then(r => r.json()).then(L => {
    list = L.map(x => x[0]); SIZE = Object.fromEntries(L.map(x => [x[0], (x[1] / x[2]).toFixed(3)]));
    tabsEl.innerHTML = ['HUGSIM', 'AlpaSim', 'Odyssey'].map(b => `<button role="tab" data-b="${b}" aria-selected="${b === cur}">${b} <small>${list.filter(n => bench(n) === b).length}</small></button>`).join('');
    tabsEl.querySelectorAll('[role=tab]').forEach(t => t.addEventListener('click', () => bench_(t.dataset.b)));
    bench_(cur);
    new IntersectionObserver(es => { if (es[0].isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.4 }).observe(v);
  });
  let rate = 1;
  const sync = () => { play.classList.toggle('playing', !v.paused); };
  const setPos = f => { f = Math.max(0, Math.min(1, f)); fill.style.width = f * 100 + '%'; knob.style.left = f * 100 + '%'; track.setAttribute('aria-valuenow', Math.round(f * 100)); };
  play.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
  v.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
  v.addEventListener('play', sync); v.addEventListener('pause', sync);
  v.addEventListener('loadedmetadata', () => { dEl.textContent = fmt(v.duration); v.playbackRate = rate; });
  v.addEventListener('timeupdate', () => { tEl.textContent = fmt(v.currentTime); });
  // progress follows the video every frame, not the 4 Hz timeupdate
  (function tick() { if (!track.classList.contains('scrubbing') && v.duration) setPos(v.currentTime / v.duration); requestAnimationFrame(tick); })();
  v.addEventListener('ended', () => show(idx + 1));
  const at = e => { const r = track.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  track.addEventListener('pointerdown', e => { track.classList.add('scrubbing'); track.setPointerCapture(e.pointerId); const f = at(e); setPos(f); if (v.duration) v.currentTime = f * v.duration; });
  track.addEventListener('pointermove', e => { if (!track.classList.contains('scrubbing')) return; const f = at(e); setPos(f); if (v.duration) v.currentTime = f * v.duration; });
  track.addEventListener('pointerup', () => track.classList.remove('scrubbing'));
  track.addEventListener('keydown', e => { if (!v.duration) return; const d = { ArrowRight: 2, ArrowLeft: -2 }[e.key]; if (d) { e.preventDefault(); e.stopPropagation(); v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); } });
  root.querySelectorAll('.wvspeed button').forEach(b => b.addEventListener('click', () => { rate = +b.dataset.r; v.playbackRate = rate; root.querySelectorAll('.wvspeed button').forEach(o => o.setAttribute('aria-pressed', o === b)); }));
  root.querySelectorAll('.gv__nav').forEach(b => b.addEventListener('click', () => show(idx + +b.dataset.d)));
  root.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === ' ' && e.target === v) { e.preventDefault(); v.paused ? v.play() : v.pause(); } });
  sync(); setPos(0);
})();
