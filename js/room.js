/* Listening Room: the homepage scene.
 * The room is one scene in photo pixels, scaled as a whole by layout().
 * Preview other days, times and weather with URL parameters, for example
 *   ?date=2026-12-24  ?hour=21.5  ?season=midsummer|autumn|midwinter  ?rainRate=8  ?snowRate=3
 */
(function () {
'use strict';

const LAT = 49.1104, LON = -116.5271, UTC_OFF = -7;
const NONE = '0,0 0,0 0,0';
// The plate (the room photo, extended with its own wall and floor) sits at these scene coordinates.
const PX = -640, PY = -480;
// Composition anchors, in scene px: console legs, top of the gallery, and the point kept at the centre of a wide screen.
const LEGS = 625, ART_TOP = -58, FOCUS_X = 660;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function smooth(a, b, v) { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function hx(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) {
  t = clamp(t, 0, 1); const A = hx(a), B = hx(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function mixPal(P, Q, t) { const o = {}; for (const k in P) o[k] = mix(P[k], Q[k], t); return o; }

function sunPos(ms) {
  const r = Math.PI / 180, lat = LAT * r;
  const d = ms / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * r;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * r;
  const e = (23.439 - 0.00000036 * d) * r;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const H = (gmst * 15 + LON) * r - ra;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  return { alt: alt / r, az: ((az / r + 180) % 360 + 360) % 360 };
}

// Simple room model in scene px: back wall at z=0, floor line y=592, camera 2600px back.
function proj(x, y, z) { const k = 2600 / (2600 - z); return [1000 + (x - 1000) * k, 390 + (y - 390) * k]; }
function clipZ(poly, zmin, zmax) {
  const edge = (pts, inside, at) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(at(a, b));
    }
    return out;
  };
  const at = z => (a, b) => { const t = (z - a.z) / (b.z - a.z); return { x: a.x + (b.x - a.x) * t, z }; };
  let p = edge(poly, q => q.z >= zmin, at(zmin));
  if (p.length) p = edge(p, q => q.z <= zmax, at(zmax));
  return p;
}
function pts(arr) { return arr.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '); }
function sunPatches(alt, az) {
  const out = { w0: NONE, w1: NONE, f0: NONE, f1: NONE, f2: NONE };
  if (alt <= 0.3) return out;
  const r = Math.PI / 180, ca = Math.cos(alt * r), dy = Math.sin(alt * r);
  // Side windows face ~251° (views 182°–320°); the wall you face is ~161°.
  const dx = -Math.cos((az - 251) * r) * ca, dz = Math.cos((az - 161) * r) * ca, FY = 592;
  if (dx < -0.05 && az >= 182 && az <= 320) {
    const XR = 2050, Y0 = -160, Y1 = 470, panes = [[700, 1080], [1110, 1500]];
    panes.forEach((p, i) => {
      const corners = [[Y0, p[0]], [Y0, p[1]], [Y1, p[1]], [Y1, p[0]]];
      if (dz < -0.03) out['w' + i] = pts(corners.map(([y, z]) => { const t = -z / dz; return [XR + dx * t, y + dy * t]; }));
      if (dy > 0.01) {
        let poly = corners.map(([y, z]) => { const t = (FY - y) / dy; return { x: XR + dx * t, z: z + dz * t }; });
        poly = clipZ(poly, 0, 2350);
        if (poly.length >= 3) out['f' + i] = pts(poly.map(q => proj(q.x, FY, q.z)));
      }
    });
  }
  if (dz > 0.03 && dy > 0.01) {
    let poly = [[1226, -58], [1552, -58], [1552, 410], [1226, 410]].map(([x, y]) => { const t = (FY - y) / dy; return { x: x + dx * t, z: dz * t }; });
    poly = clipZ(poly, 0, 2350);
    if (poly.length >= 3) out.f2 = pts(poly.map(q => proj(q.x, FY, q.z)));
  }
  return out;
}

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const STARS = (() => { const R = rng(11); let s = ''; for (let i = 0; i < 80; i++) s += 'M' + (R() * 364).toFixed(1) + ' ' + (R() * 150).toFixed(1) + 'h0'; return s; })();

// Tints the photo layers outside: multiply by a light colour, after pulling saturation down.
function tintMatrix(hex, s) {
  const c = hx(hex).map(v => v / 255), W = [0.2126, 0.7152, 0.0722], q = 1 - s;
  const row = i => W.map((w, j) => ((w * q + (i === j ? s : 0)) * c[i]).toFixed(4)).join(' ') + ' 0 0';
  return [row(0), row(1), row(2), '0 0 0 1 0'].join(' ');
}

const PAL = {
  day:      { skyTop: '#5d8fc4', skyBot: '#c4dbea', cloud: '#f4f6f8', tint: '#ffffff' },
  golden:   { skyTop: '#6a86b3', skyBot: '#f2c48d', cloud: '#f7d7b8', tint: '#ffd6aa' },
  overcast: { skyTop: '#a3acb4', skyBot: '#cdd2d5', cloud: '#c9ced3', tint: '#c9cfd4' },
  dusk:     { skyTop: '#33416b', skyBot: '#d29d8a', cloud: '#8c7e95', tint: '#7a7399' },
  night:    { skyTop: '#0a1120', skyBot: '#1c283d', cloud: '#283041', tint: '#1c2642' }
};
const GROUND = { summer: '#4c5528', autumn: '#58522d', winter: '#d3d9df' };

// The gallery, left to right: a small frame, a tall one, two small stacked ones, a large one and one on the right.
// Frame i belongs to project i and floats down to card i as you scroll.
const FRAMES = [
  { x: 208, y: 56, w: 112, h: 158, bd: 5, mat: 12, wood: 'walnutDark', cap: 'below' },
  { x: 348, y: -58, w: 188, h: 280, bd: 7, mat: 16, wood: 'walnut', cap: 'below', light: { x: 393.7, y: -76.1, w: 96.6, under: -68 } },
  { x: 564, y: -58, w: 109, h: 150, bd: 5, mat: 12, wood: 'walnutDark', cap: 'above' },
  { x: 564, y: 112, w: 109, h: 146, bd: 5, mat: 12, wood: 'walnutDark', cap: 'below' },
  { x: 701, y: -58, w: 214, h: 316, bd: 8, mat: 20, wood: 'walnut', cap: 'below' },
  { x: 943, y: -6, w: 161, h: 212, bd: 6, mat: 15, wood: 'walnut', cap: 'below', light: { x: 988, y: -23.7, w: 71, under: -15.9 } }
];
const GRAIN = 'repeating-linear-gradient(90deg, rgba(255,235,210,0.035) 0 1px, rgba(0,0,0,0) 1px 3px), ';
const WOOD = {
  walnut: GRAIN + 'linear-gradient(145deg, #6a4329, #3b2416)',
  walnutDark: GRAIN + 'linear-gradient(145deg, #4e3020, #2c1a10)'
};
const CHIP = {
  'Shipped': ['#dde8dc', '#2f5a42'],
  'In progress': ['#f2e3c4', '#7a4f10'],
  'Concept': ['#e6e0ee', '#54447a'],
  'Exploration': ['#dce6ee', '#2a4c66']
};
// Covers: leave `cover` empty to use the default image, or point it at a file such as 'img/covers/cover-1.webp'.
const DEFAULT_COVER = 'img/covers/default.svg';
const DESC = 'Placeholder — two or three sentences: the problem, what you did, and what changed because of the work.';
const PROJECTS = [
  { name: 'Project One', tagline: 'A one-line subtitle', desc: DESC, status: 'Shipped', kind: 'Case study', role: 'Lead product designer', year: '2026', href: 'project.html', cover: '' },
  { name: 'Project Two', tagline: 'A one-line subtitle', desc: DESC, status: 'In progress', kind: 'Case study', role: 'Product designer', year: '2026', href: 'project.html', cover: '' },
  { name: 'Project Three', tagline: 'A one-line subtitle', desc: DESC, status: 'Shipped', kind: 'Case study', role: 'Design lead', year: '2025', href: 'project.html', cover: '' },
  { name: 'Project Four', tagline: 'A one-line subtitle', desc: DESC, status: 'Concept', kind: 'Case study', role: 'Product designer', year: '2025', href: 'project.html', cover: '' },
  { name: 'Project Five', tagline: 'A one-line subtitle', desc: DESC, status: 'Exploration', kind: 'Case study', role: 'Product designer', year: '2024', href: 'project.html', cover: '' },
  { name: 'Project Six', tagline: 'A one-line subtitle', desc: DESC, status: 'Concept', kind: 'Case study', role: 'Product designer', year: '2024', href: 'project.html', cover: '' }
];

// Seasonal corner, in scene px, left of the console. The images are 340×690;
// the plant is drawn 1.5× so it stands about as tall as the console.
const TREE_BOX = { x: -100, y: -60, w: 340, h: 690 };
const PLANT_BOX = { x: -185, y: -400, w: 510, h: 1035 };
const CORNER = {
  plant: { src: 'img/room/seasonal/plant.webp', box: PLANT_BOX },
  halloween: { src: 'img/room/seasonal/plant-halloween.webp', box: PLANT_BOX },
  treeBare: { src: 'img/room/seasonal/tree-bare.webp', box: TREE_BOX },
  treeDecorated: { src: 'img/room/seasonal/tree-decorated.webp', box: TREE_BOX },
  treeGifts: { src: 'img/room/seasonal/tree-gifts.webp', box: TREE_BOX }
};
// What the corner shows, and which music plays, on a Creston date (M is 0-based).
function occasion(M, D) {
  if (M === 9) return { corner: 'halloween', music: 'halloween' };
  if (M === 10 && D >= 15) return { corner: 'treeBare', music: 'christmas' };
  if (M === 11 && D <= 15) return { corner: 'treeDecorated', music: 'christmas' };
  if (M === 11 && D <= 23) return { corner: 'treeGifts', music: 'christmas' };
  if (M === 11 || (M === 0 && D <= 6)) return { corner: 'treeGifts', lit: true, music: 'christmas' };
  return { corner: 'plant', music: 'default' };
}
// Where the tree's string lights twinkle once it's lit (Dec 24 – Jan 6), in tree-image px.
const BULBS = (() => {
  const R = rng(23), out = [];
  while (out.length < 44) {
    const y = 130 + R() * 440, half = (y - 110) / 450 * 92, x = 176 + (R() * 2 - 1) * half;
    out.push({ l: (x / 340 * 100).toFixed(2), t: (y / 690 * 100).toFixed(2), d: (R() * 2.4).toFixed(2), s: (1.8 + R() * 1.6).toFixed(2) });
  }
  return out;
})();

// Music for each occasion. To use a licensed track, add the file under audio/ and change src, title, artist and credit.
const LOOP = { src: 'audio/room-loop.mp3', title: 'Lo-fi room loop', artist: 'Placeholder', credit: 'Music: original placeholder loop' };
const MUSIC = { default: LOOP, halloween: LOOP, christmas: LOOP };

const MODES = [['live', 'Live'], ['clear', 'Clear'], ['rain', 'Rain'], ['snow', 'Snow'], ['night', 'Night']];
const ICONS = {
  sun: 'M8 4.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1',
  cloud: 'M4.5 12.5h7a3 3 0 0 0 .3-6a4 4 0 0 0-7.6 1A2.5 2.5 0 0 0 4.5 12.5z',
  rain: 'M4.5 10h7a3 3 0 0 0 .3-6a4 4 0 0 0-7.6 1A2.5 2.5 0 0 0 4.5 10zM5.5 12l-.8 2M8.5 12l-.8 2M11.5 12l-.8 2',
  snow: 'M4.5 10h7a3 3 0 0 0 .3-6a4 4 0 0 0-7.6 1A2.5 2.5 0 0 0 4.5 10zM5 13h.01M8 14h.01M11 13h.01',
  moon: 'M12.5 10.2A5.5 5.5 0 0 1 5.8 3.5a5.5 5.5 0 1 0 6.7 6.7z'
};


// Preview settings from the URL (the canvas had these as editor tweaks).
const Q = new URLSearchParams(location.search);
const num = (k, d) => { const v = parseFloat(Q.get(k)); return isFinite(v) ? v : d; };
const DATE = (() => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(Q.get('date') || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; })();
const PREVIEW = {
  hour: clamp(num('hour', -1), -1, 24),
  season: ['midsummer', 'autumn', 'midwinter'].indexOf(Q.get('season')) >= 0 ? Q.get('season') : 'today',
  rainRate: clamp(num('rainRate', 2.5), 0.2, 20),
  snowRate: clamp(num('snowRate', 1.2), 0.1, 5)
};

const $ = id => document.getElementById(id);
const el = (tag, cls, style) => { const e = document.createElement(tag); if (cls) e.className = cls; if (style) e.style.cssText = style; return e; };
const app = $('app'), stage = $('stage'), sceneBox = $('sceneBox'), scene = $('scene'), cv = $('weather'), audio = $('audio');
const state = { mode: 'live', playing: false, active: 0, open: false, hover: -1, pop: false };
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let wxNow = { rain: 0, snow: 0, wind: 0, vis: 1 }, dirty = true, last = 0, L = null;
const rain = [], snow = [], glass = [];

function setState(patch) { Object.assign(state, patch); render(); }
function setArt(box, pr) { box.style.backgroundImage = 'url("' + (pr.cover || DEFAULT_COVER) + '")'; }
function frameBox(f) { return { w: f.w - 2 * (f.bd + f.mat), h: f.h - 2 * (f.bd + f.mat) }; }

// One coordinated scale for the whole room. On wide screens the room fills the first screen:
// the gallery and console sit in the middle, the seasonal corner on the left, the window cut by the right edge.
function layout() {
  const rw = stage.clientWidth || window.innerWidth || 1440, vh = window.innerHeight || 900;
  const stacked = (window.innerWidth || rw) < 980 || vh < 560;
  if (stacked) {
    const s = rw / 1400;
    return { stacked, s: +s.toFixed(4), ox: Math.round(80 * s), oy: Math.round(140 * s), bandH: Math.round(840 * s) };
  }
  const rh = Math.max(vh, 560);
  let s = Math.min(0.71 * rh / (LEGS - ART_TOP), rw / 1500);
  s = Math.max(s, rh / 1337, rw / 2939);
  const ox = clamp(rw / 2 - FOCUS_X * s, rw - (PX + 2939) * s, -PX * s);
  const oy = clamp(0.87 * rh - LEGS * s, rh - (PY + 1337) * s, -PY * s);
  return { stacked, s: +s.toFixed(4), ox: Math.round(ox), oy: Math.round(oy), bandH: rh };
}

/* ---------- Built once ---------- */

const frameEls = [], capEls = [];
FRAMES.forEach((f, i) => {
  const pr = PROJECTS[i];
  const b = el('button', 'frame', 'left: ' + f.x + 'px; top: ' + f.y + 'px; width: ' + f.w + 'px; height: ' + f.h + 'px; padding: ' + f.bd + 'px; background: ' + WOOD[f.wood]);
  b.type = 'button';
  b.setAttribute('aria-label', pr.name + ', ' + pr.status + ', ' + pr.year + ' — show project details');
  const mat = el('span', 'mat', 'padding: ' + f.mat + 'px'), art = el('span', 'art');
  setArt(art, pr);
  mat.appendChild(art); b.appendChild(mat); b.appendChild(el('span', 'sheen'));
  const enter = () => { if (state.hover !== i && !window.scrollY) setState({ hover: i }); };
  const leave = () => { if (state.hover === i) setState({ hover: -1 }); };
  b.addEventListener('mouseenter', enter); b.addEventListener('focus', enter);
  b.addEventListener('mouseleave', leave); b.addEventListener('blur', leave);
  b.addEventListener('click', () => setState({ active: i, open: true }));
  $('frames').appendChild(b); frameEls.push(b);

  const above = f.cap === 'above';
  const cap = el('div', 'cap', 'left: ' + f.x + 'px; top: ' + (above ? f.y - 10 : f.y + f.h + 12) + 'px');
  const n = el('div', 'cap-name'), m = el('div', 'cap-meta');
  n.textContent = pr.name; m.textContent = pr.status + ' · ' + pr.year + ' · View project';
  cap.appendChild(n); cap.appendChild(m); cap.dataset.above = above ? '1' : '';
  $('caps').appendChild(cap); capEls.push(cap);
});

// Light pools (multiply layer) and glows (screen layer), in plate-relative px.
const at = (x, y) => (x - PX).toFixed(0) + 'px ' + (y - PY).toFixed(0) + 'px';
const pools = [], glows = [];
let litN = 0;
FRAMES.forEach(f => {
  if (!f.light) return;
  const i = litN++, v = 'var(--l' + i + ')', cx = f.x + f.w / 2;
  pools.push('radial-gradient(ellipse ' + Math.round(f.w * 0.7) + 'px ' + Math.round(f.h * 0.8) + 'px at ' + at(cx, f.y + f.h * 0.24) + ', rgba(255,222,180,calc(' + v + ' * 1)) 0%, rgba(255,214,166,calc(' + v + ' * 0.9)) 52%, rgba(255,204,150,0) 100%)');
  pools.push('radial-gradient(ellipse ' + Math.round(f.w * 1.15) + 'px ' + Math.round(f.h * 1.2) + 'px at ' + at(cx, f.y + f.h * 0.12) + ', rgba(255,204,148,calc(' + v + ' * 0.5)), rgba(255,200,140,0))');
  glows.push('radial-gradient(ellipse ' + Math.round(f.light.w * 0.62) + 'px 14px at ' + at(cx, f.light.under + 3) + ', rgba(255,222,172,calc(' + v + ' * 0.6)), rgba(255,222,172,0))');
  $('lit').appendChild(el('div', 'pool', 'left: ' + f.x + 'px; top: ' + f.y + 'px; width: ' + f.w + 'px; height: ' + f.h + 'px; opacity: ' + v));
  $('lit').appendChild(el('div', 'emit', 'left: ' + (f.light.x + 5).toFixed(1) + 'px; top: ' + (f.light.under - 1).toFixed(1) + 'px; width: ' + (f.light.w - 10).toFixed(1) + 'px; opacity: ' + v));
});
// Mushroom lamp: light falls down onto the console, with a soft halo on the wall behind the shade.
pools.push('radial-gradient(ellipse 210px 120px at ' + at(1020, 330) + ', rgba(255,206,150,calc(var(--l5) * 0.95)) 0%, rgba(255,196,136,calc(var(--l5) * 0.55)) 50%, rgba(255,190,130,0) 100%)');
pools.push('radial-gradient(ellipse 150px 120px at ' + at(1020, 286) + ', rgba(255,200,140,calc(var(--l5) * 0.7)), rgba(255,200,140,0))');
pools.push('radial-gradient(ellipse 820px 480px at ' + at(820, 260) + ', rgba(255,196,140,calc(var(--l5) * 0.24)), rgba(255,196,140,0))');
glows.push('radial-gradient(ellipse 70px 12px at ' + at(1020, 318) + ', rgba(255,214,150,calc(var(--l5) * 0.55)), rgba(255,214,150,0))');
glows.push('radial-gradient(ellipse 96px 16px at ' + at(1020, 378) + ', rgba(255,200,130,calc(var(--l5) * 0.4)), rgba(255,200,130,0))');
// LED strip under the turntable.
pools.push('radial-gradient(ellipse 150px 46px at ' + at(664, 372) + ', rgba(255,198,132,calc(var(--l6) * 0.9)), rgba(255,198,132,0))');
glows.push('radial-gradient(ellipse 98px 6px at ' + at(664, 376) + ', rgba(255,186,112,calc(var(--l6) * 0.9)), rgba(255,186,112,0))');
glows.push('radial-gradient(ellipse 140px 22px at ' + at(664, 374) + ', rgba(255,180,105,calc(var(--l6) * 0.3)), rgba(255,180,105,0))');
// The lit Christmas tree keeps its corner warm after dark.
pools.push('radial-gradient(ellipse 240px 340px at ' + at(76, 320) + ', rgba(255,212,156,calc(var(--l7) * 0.9)), rgba(255,212,156,0))');
glows.push('radial-gradient(ellipse 150px 230px at ' + at(76, 330) + ', rgba(255,200,130,calc(var(--l7) * 0.22)), rgba(255,200,130,0))');
const hole = 'linear-gradient(#ffffff, #ffffff) ' + at(1226.5, -58.2) + ' / 326px 469px no-repeat';
$('amb').style.background = hole + ', ' + pools.join(', ') + ', var(--amb)';
$('glow').style.background = glows.join(', ');

document.querySelectorAll('.layer[data-depth]').forEach(l => { l.style.transform = 'translateX(calc(var(--mx, 0) * -' + l.dataset.depth + 'px))'; });
$('stars').setAttribute('d', STARS);
$('pCount').textContent = String(PROJECTS.length).padStart(2, '0');

const corner = $('corner'), cornerImg = $('cornerImg'), cornerLights = $('cornerLights');
const place = (e, b) => { e.style.left = b.x + 'px'; e.style.top = b.y + 'px'; e.style.width = b.w + 'px'; e.style.height = b.h + 'px'; };
place(cornerLights, TREE_BOX);
BULBS.forEach(b => cornerLights.appendChild(el('span', 'bulb', 'left: ' + b.l + '%; top: ' + b.t + '%; animation-delay: -' + b.d + 's; animation-duration: ' + b.s + 's')));

// Project cards: cover, title, subtitle, description and a link to the case study.
const cards = PROJECTS.map((pr, i) => {
  const li = el('li', 'card'), cover = el('div', 'card-cover', 'background: ' + WOOD[FRAMES[i].wood]);
  const mat = el('span', 'mat'), art = el('span', 'art');
  setArt(art, pr); mat.appendChild(art); cover.appendChild(mat); cover.appendChild(el('span', 'sheen'));
  const text = el('div', 'card-text'), h = el('h3', 'card-title'), sub = el('p', 'card-sub'), d = el('p', 'card-desc'), a = el('a', 'card-cta');
  h.textContent = pr.name; sub.textContent = pr.tagline; d.textContent = pr.desc;
  a.href = pr.href; a.textContent = 'View case study ';
  a.setAttribute('aria-label', 'View case study: ' + pr.name);
  const arrow = el('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→'; a.appendChild(arrow);
  text.appendChild(h); text.appendChild(sub); text.appendChild(d); text.appendChild(a);
  li.appendChild(cover); li.appendChild(text);
  $('rail').appendChild(li);
  return { li, cover };
});

// The frames that float between the wall and the cards.
const clones = FRAMES.map((f, i) => {
  const c = el('div', 'fly'), mat = el('span', 'mat'), art = el('span', 'art');
  setArt(art, PROJECTS[i]); mat.appendChild(art); c.appendChild(mat); c.appendChild(el('span', 'sheen'));
  $('flight').appendChild(c);
  return { c, mat };
});

const modeBtns = MODES.map(([id, label]) => {
  const b = el('button', 'seg'); b.type = 'button'; b.textContent = label;
  b.addEventListener('click', () => setState({ mode: id, pop: false }));
  $('pop').appendChild(b); return [id, b];
});

/* ---------- Events ---------- */

stage.addEventListener('mousemove', e => {
  const mx = (e.clientX / (window.innerWidth || 1) - 0.5) * 2;
  stage.style.setProperty('--mx', mx.toFixed(3));
});
document.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', togglePlay));
$('skyBtn').addEventListener('click', () => setState({ pop: !state.pop }));
$('pop').addEventListener('keydown', e => { if (e.key === 'Escape') setState({ pop: false }); });
$('pClose').addEventListener('click', () => setState({ open: false }));
$('pPrev').addEventListener('click', () => setState({ active: (state.active + PROJECTS.length - 1) % PROJECTS.length, open: true }));
$('pNext').addEventListener('click', () => setState({ active: (state.active + 1) % PROJECTS.length, open: true }));

const rail = $('rail');
const railStep = () => cards[0].li.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 32);
$('railPrev').addEventListener('click', () => rail.scrollBy({ left: -railStep(), behavior: reduce ? 'auto' : 'smooth' }));
$('railNext').addEventListener('click', () => rail.scrollBy({ left: railStep(), behavior: reduce ? 'auto' : 'smooth' }));
function railButtons() {
  $('railPrev').disabled = rail.scrollLeft <= 2;
  $('railNext').disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
}

let ticking = false;
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; updateFlight(); railButtons(); }); } }
window.addEventListener('scroll', onScroll, { passive: true });
rail.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Music ---------- */

let track = null;
function setTrack(tr) {
  if (track === tr) return;
  track = tr;
  audio.src = tr.src;
  if (state.playing) audio.play().catch(() => setState({ playing: false }));
  $('track').textContent = tr.title + ' — ' + tr.artist;
  $('credit').textContent = tr.credit;
}
function togglePlay() {
  if (state.playing) { audio.pause(); setState({ playing: false }); return; }
  audio.volume = 0.6;
  setState({ playing: true });
  audio.play().catch(() => setState({ playing: false }));
}
audio.addEventListener('pause', () => { if (state.playing && !audio.ended) setState({ playing: false }); });

// Your live Spotify track, served by functions/api/now-playing.js once the site is deployed with Spotify keys.
function nowPlaying() {
  if (!/^https?:$/.test(location.protocol)) return;
  fetch('/api/now-playing', { headers: { accept: 'application/json' } })
    .then(r => (r.ok && /json/.test(r.headers.get('content-type') || '') ? r.json() : null))
    .then(d => {
      const a = $('spotify');
      if (!d || !d.title) { a.hidden = true; return; }
      a.href = d.url || 'https://open.spotify.com/';
      a.textContent = (d.playing ? 'On my Spotify now: ' : 'Last on my Spotify: ') + d.title + ' — ' + d.artist;
      a.hidden = false;
    })
    .catch(() => {});
}

/* ---------- Frames floating down to the Projects row ---------- */

const STAG = 0.07, SPAN = 1 - STAG * (FRAMES.length - 1);
const TILT = [-7, 5, -4, 6, -5, 7], ARC = [-50, -24, -8, 16, 34, 60];
const CARD_BD = 8, CARD_MAT = 18;
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function updateFlight() {
  if (!L) return;
  const on = !L.stacked && !reduce;
  app.classList.toggle('flying', on);
  if (!on) {
    frameEls.forEach(f => { f.style.visibility = ''; });
    clones.forEach(k => { k.c.style.display = 'none'; });
    cards.forEach(c => c.li.classList.add('landed'));
    return;
  }
  const vh = window.innerHeight || 900, y = window.scrollY || 0;
  const top0 = cards[0].cover.getBoundingClientRect().top + y;
  const p = clamp(y / Math.max(1, top0 - vh * 0.16), 0, 1);
  if (p > 0 && state.hover >= 0) { state.hover = -1; capEls.forEach(c => c.classList.remove('on')); }
  FRAMES.forEach((f, i) => {
    const pi = clamp((p - i * STAG) / SPAN, 0, 1), k = clones[i];
    frameEls[i].style.visibility = pi > 0 ? 'hidden' : '';
    cards[i].li.classList.toggle('landed', pi >= 1);
    if (pi <= 0 || pi >= 1) { k.c.style.display = 'none'; return; }
    const a = frameEls[i].getBoundingClientRect(), b = cards[i].cover.getBoundingClientRect();
    const e = ease(pi), bump = Math.sin(Math.PI * pi), lerp = (u, v) => u + (v - u) * e;
    k.c.style.cssText = 'display: block; left: ' + (lerp(a.left, b.left) + ARC[i] * bump).toFixed(1) + 'px; top: ' + lerp(a.top, b.top).toFixed(1) + 'px; width: ' + lerp(a.width, b.width).toFixed(1) + 'px; height: ' + lerp(a.height, b.height).toFixed(1) +
      'px; padding: ' + lerp(f.bd * L.s, CARD_BD).toFixed(2) + 'px; background: ' + WOOD[f.wood] + '; transform: rotate(' + (TILT[i] * bump).toFixed(2) + 'deg); box-shadow: 0 ' + (10 + 30 * bump).toFixed(0) + 'px ' + (20 + 40 * bump).toFixed(0) + 'px -14px rgba(30,18,8,' + (0.35 + 0.2 * bump).toFixed(2) + ')';
    k.mat.style.padding = lerp(f.mat * L.s, CARD_MAT).toFixed(2) + 'px';
  });
}

/* ---------- Render ---------- */

function render() {
  const p = PREVIEW, st = state, mode = st.mode;
  const season = p.season;
  const now = Date.now();
  const local = new Date(now + UTC_OFF * 3600e3);
  let Y = local.getUTCFullYear(), M = local.getUTCMonth(), D = local.getUTCDate();
  if (DATE) { Y = DATE.y; M = DATE.m; D = DATE.d; }
  if (season === 'midsummer') { M = 5; D = 21; } else if (season === 'autumn') { M = 9; D = 15; } else if (season === 'midwinter') { M = 11; D = 21; }
  const fixedDay = !!DATE || season !== 'today';
  const liveHour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const defaults = { live: liveHour, clear: season === 'midsummer' ? 19.5 : season === 'midwinter' ? 13.5 : 16.25, rain: 14, snow: 13, night: 21.5 };
  const hour = p.hour >= 0 ? p.hour : defaults[mode];
  const t = (mode === 'live' && !fixedDay && p.hour < 0) ? now : Date.UTC(Y, M, D) + (hour - UTC_OFF) * 3600e3;
  const sun = sunPos(t);

  const wx = {
    live: { cloud: 0.3, rain: 0, snow: 0, wind: 8 },
    clear: { cloud: 0.05, rain: 0, snow: 0, wind: 5 },
    rain: { cloud: 0.95, rain: p.rainRate, snow: 0, wind: 14 },
    snow: { cloud: 0.9, rain: 0, snow: p.snowRate, wind: 5 },
    night: { cloud: 0.12, rain: 0, snow: 0, wind: 4 }
  }[mode];
  const precip = wx.rain > 0 || wx.snow > 0 ? 1 : 0;
  const c = wx.cloud;

  // Outdoor daylight and golden-hour factors from the sun's altitude.
  const a = sun.alt;
  const Dl = a <= -8 ? 0 : a < 0 ? 0.28 * (a + 8) / 8 : a < 12 ? 0.28 + 0.62 * (a / 12) : Math.min(1, 0.9 + (a - 12) / 60);
  const gold = (a > -3 && a < 14 ? (a < 4 ? (a + 3) / 7 : (14 - a) / 10) : 0) * (1 - c * 0.85);
  const I = Dl * (1 - 0.32 * c - 0.1 * precip);
  const lampsOn = I < 0.5;
  const lk = lampsOn ? clamp(0.55 + (0.5 - I), 0.55, 1) : 0;

  let pal = mixPal(PAL.day, PAL.overcast, c);
  pal = mixPal(pal, PAL.golden, gold);
  const dn = clamp(Dl / 0.9, 0, 1);
  if (dn < 1) pal = dn > 0.35 ? mixPal(PAL.dusk, pal, (dn - 0.35) / 0.65) : mixPal(PAL.night, PAL.dusk, dn / 0.35);
  const sat = clamp((1 - 0.35 * c) * (0.3 + 0.7 * dn) + 0.08 * gold, 0.25, 1.08);
  const sk = wx.snow > 0 ? 'winter' : (M === 11 || M <= 2) ? 'winter' : (M === 9 || M === 10) ? 'autumn' : 'summer';

  // Indoor ambience.
  const dayC = mix('#ffffff', '#d9dbe1', c * 0.6 + precip * 0.35);
  const goldC = mix(dayC, '#ffe8cc', gold);
  const duskC = mix('#a39aa8', '#8d94a3', c);
  const nightC = lampsOn ? '#3b3440' : '#262a3c';
  let amb = I >= 0.9 ? goldC : I >= 0.3 ? mix(duskC, goldC, (I - 0.3) / 0.6) : mix(nightC, duskC, I / 0.3);

  const sp = sunPatches(sun.alt, sun.az);
  const S = (sun.alt > 0.3 ? smooth(0.3, 5, sun.alt) : 0) * Math.pow(1 - c, 1.5) * (precip ? 0 : 1);
  if (S > 0) amb = mix(amb, '#eadfcf', S * 0.4);

  // Seasonal corner and music for the date
  const occ = occasion(M, D), cfg = CORNER[occ.corner];
  if (cornerImg.dataset.key !== occ.corner) { cornerImg.src = cfg.src; cornerImg.dataset.key = occ.corner; place(corner, cfg.box); }
  cornerLights.hidden = !occ.lit;
  setTrack(MUSIC[occ.music] || MUSIC.default);

  const lvVal = lk.toFixed(3);
  const led = lampsOn ? (st.playing ? 1 : 0.8) : (st.playing ? 0.2 : 0);
  const ink = I > 0.55 ? { main: '#2b2420', muted: '#5b4c40' } : { main: '#f3eadc', muted: '#d2c4b2' };
  wxNow = { rain: wx.rain, snow: wx.snow, wind: wx.wind, vis: 0.35 + 0.65 * clamp(Dl, 0, 1) };
  dirty = true;

  // Colours and lamps
  app.style.setProperty('--ink', ink.main);
  app.style.setProperty('--ink-2', ink.muted);
  app.style.setProperty('--wall', mix('#cdb595', '#1b1714', 1 - clamp(I / 0.7, 0, 1)));
  scene.style.setProperty('--l0', lvVal);
  scene.style.setProperty('--l1', lvVal);
  scene.style.setProperty('--l5', lvVal);
  scene.style.setProperty('--l6', led.toFixed(3));
  scene.style.setProperty('--l7', occ.lit ? Math.max(0.3, lk).toFixed(3) : '0');
  scene.style.setProperty('--amb', amb);

  // Window
  $('win').style.background = pal.skyBot;
  $('skyTop').setAttribute('stop-color', pal.skyTop);
  $('skyBot').setAttribute('stop-color', pal.skyBot);
  $('stars').setAttribute('opacity', (clamp(1 - Dl / 0.3, 0, 1) * (1 - c)).toFixed(2));
  $('clouds').setAttribute('opacity', (0.12 + 0.85 * c).toFixed(2));
  $('clouds').setAttribute('fill', pal.cloud);
  $('landTintM').setAttribute('values', tintMatrix(pal.tint, sat));
  document.querySelectorAll('.season').forEach(img => { img.style.opacity = img.dataset.season === sk ? '1' : '0'; });
  $('fogFar').style.opacity = (wx.snow > 0 ? 0.75 : wx.rain > 0 ? 0.5 : c > 0.8 ? 0.22 : 0.04).toFixed(2);
  $('fogNear').style.opacity = (wx.snow > 0 ? 0.28 : wx.rain > 0 ? 0.18 : 0).toFixed(2);
  $('ground').style.background = 'linear-gradient(180deg, rgba(0,0,0,0), ' + GROUND[sk] + ' 40%)';
  $('sill').style.height = (wx.snow > 0 ? Math.round(clamp(4 + wx.snow * 4, 5, 14)) : 0) + 'px';
  $('refl').style.opacity = lampsOn && I < 0.35 ? '0.4' : '0';
  $('spill').style.opacity = (0.45 * I * (1 - precip * 0.4)).toFixed(2);

  // Sunlight
  $('sun').style.opacity = (S * 0.9).toFixed(3);
  $('sunFill').setAttribute('fill', mix('#fff0d6', '#ffb460', clamp(gold * 1.2, 0, 1)));
  ['w0', 'w1', 'f0', 'f1', 'f2'].forEach(k => $('sun-' + k).setAttribute('points', sp[k]));

  // Layout
  L = layout();
  sceneBox.style.height = L.stacked ? L.bandH + 'px' : '';
  scene.style.left = L.ox + 'px';
  scene.style.top = L.oy + 'px';
  scene.style.transform = 'scale(' + L.s + ')';
  const inv = (1 / L.s).toFixed(4);
  capEls.forEach((cap, i) => {
    cap.style.transform = cap.dataset.above ? 'scale(' + inv + ') translateY(-100%)' : 'scale(' + inv + ')';
    cap.classList.toggle('on', st.hover === i);
  });

  // Turntable
  const label = st.playing ? 'Lift the needle (pause music)' : 'Drop the needle (play music)';
  document.querySelectorAll('[data-spin]').forEach(e => e.classList.toggle('on', st.playing));
  document.querySelectorAll('[data-play]').forEach(b => {
    b.setAttribute('aria-label', label);
    if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', st.playing ? 'true' : 'false');
  });

  // Footer
  const lt = new Date(t + UTC_OFF * 3600e3);
  $('clock').textContent = String(lt.getUTCHours()).padStart(2, '0') + ':' + String(lt.getUTCMinutes()).padStart(2, '0');
  $('condition').textContent = mode === 'rain' ? 'Rain' : mode === 'snow' ? 'Snow' : mode === 'clear' ? 'Clear' : mode === 'night' ? 'Clear night' : 'Partly cloudy';
  $('wxIcon').setAttribute('d', mode === 'rain' ? ICONS.rain : mode === 'snow' ? ICONS.snow : (mode === 'night' || a < -6) ? ICONS.moon : mode === 'clear' ? ICONS.sun : ICONS.cloud);
  $('skyLabel').textContent = mode === 'live' ? 'Live sky' : 'Preview: ' + MODES.find(m => m[0] === mode)[1];
  $('skyBtn').setAttribute('aria-expanded', st.pop ? 'true' : 'false');
  $('pop').hidden = !st.pop;
  modeBtns.forEach(([id, b]) => b.setAttribute('aria-pressed', id === mode ? 'true' : 'false'));

  // Project panel
  const pr = PROJECTS[st.active], fb = frameBox(FRAMES[st.active]);
  const chip = CHIP[pr.status];
  $('panel').classList.toggle('open', st.open);
  $('pNum').textContent = String(st.active + 1).padStart(2, '0');
  const art = $('pArt');
  art.style.maxWidth = Math.round(Math.min(320, 360 * fb.w / fb.h)) + 'px';
  art.style.aspectRatio = fb.w + ' / ' + fb.h;
  setArt(art, pr);
  $('pChip').style.background = chip[0];
  $('pChip').style.color = chip[1];
  $('pStatus').textContent = pr.status;
  $('pKind').textContent = pr.kind;
  $('pName').textContent = pr.name;
  $('pTagline').textContent = pr.tagline;
  $('pDesc').textContent = pr.desc;
  $('pRole').textContent = pr.role;
  $('pYear').textContent = pr.year;
  $('panel').querySelector('.pcta').href = pr.href;

  updateFlight();
}

/* ---------- Rain, snow and drops on the glass ---------- */

function newDrop(w, h, slant, init) {
  const z = 0.35 + Math.random() * 0.65, span = w + h * Math.abs(slant);
  return { x: Math.random() * span - h * Math.max(0, slant), y: init ? Math.random() * h : -Math.random() * 60, z, l: 8 + z * 16, v: 9 + z * 9, a: 0.16 + z * 0.34 };
}
function loop(ts) {
  requestAnimationFrame(loop);
  const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  const wx = wxNow;
  if (!wx.rain && !wx.snow && !dirty) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  dirty = !!(wx.rain || wx.snow);
  const k = w / 364;
  const dt = reduce ? 0 : Math.min(3, (ts - (last || ts)) / 16.67); last = ts;
  const vis = wx.vis, slant = wx.wind / 70;

  const rainN = wx.rain > 0 ? Math.min(650, Math.round(40 + wx.rain * 70)) : 0;
  while (rain.length < rainN) rain.push(newDrop(w, h, slant, true));
  if (rain.length > rainN) rain.length = rainN;
  ctx.lineCap = 'round';
  for (const d of rain) {
    d.y += d.v * dt * k; d.x += slant * d.v * dt * k;
    if (d.y - d.l * k > h || d.x > w + 30) Object.assign(d, newDrop(w, h, slant, false));
    ctx.strokeStyle = 'rgba(214,224,236,' + (d.a * vis).toFixed(3) + ')';
    ctx.lineWidth = d.z * 1.1 * k;
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - slant * d.l * k, d.y - d.l * k); ctx.stroke();
  }

  const snowN = wx.snow > 0 ? Math.min(520, Math.round(50 + wx.snow * 170)) : 0;
  while (snow.length < snowN) { const z = 0.3 + Math.random() * 0.7; snow.push({ x: Math.random() * w, y: Math.random() * h, z, r: 0.6 + z * 1.9, v: 0.3 + z * 0.8, ph: Math.random() * 6.28 }); }
  if (snow.length > snowN) snow.length = snowN;
  for (const f of snow) {
    f.y += f.v * dt * k; f.x += (Math.sin(ts * 0.0011 + f.ph) * 0.35 * f.z + wx.wind * 0.012) * dt * k;
    if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
    if (f.x > w + 4) f.x = -4; if (f.x < -4) f.x = w + 4;
    ctx.fillStyle = 'rgba(255,255,255,' + ((0.5 + 0.45 * f.z) * vis).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * k, 0, 6.283); ctx.fill();
  }

  const glassN = wx.rain > 0 ? Math.min(90, Math.round(12 + wx.rain * 14)) : 0;
  while (glass.length < glassN) glass.push({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 2.6, slide: Math.random() < 0.3, v: 0, top: 0 });
  if (glass.length > glassN) glass.length = glassN;
  for (const g of glass) {
    if (g.slide) {
      if (g.v < 0.05 && Math.random() < 0.004 * dt) { g.v = 0.8 + Math.random() * 1.4; g.top = g.y; }
      g.y += g.v * dt * k * 0.5; g.v *= Math.pow(0.988, dt);
      if (g.v > 0.05 && g.y - g.top > 2) {
        ctx.strokeStyle = 'rgba(225,235,245,' + (0.12 * vis).toFixed(3) + ')'; ctx.lineWidth = g.r * 0.7 * k;
        ctx.beginPath(); ctx.moveTo(g.x, Math.max(g.top, g.y - 60 * k)); ctx.lineTo(g.x, g.y); ctx.stroke();
      }
      if (g.y > h + 6) { g.y = Math.random() * h * 0.5; g.x = Math.random() * w; g.v = 0; g.top = g.y; }
    }
    const rr = g.r * k;
    ctx.fillStyle = 'rgba(226,236,246,' + (0.2 * vis).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(g.x, g.y, rr, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(16,22,30,' + (0.3 * vis).toFixed(3) + ')'; ctx.lineWidth = 0.6 * k;
    ctx.beginPath(); ctx.arc(g.x, g.y, rr, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * vis).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(g.x - rr * 0.35, g.y - rr * 0.35, rr * 0.28, 0, 6.283); ctx.fill();
  }
}

/* ---------- Start ---------- */

render();
railButtons();
window.addEventListener('resize', () => { render(); railButtons(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
window.addEventListener('load', updateFlight);
setInterval(render, 30000);
nowPlaying();
setInterval(nowPlaying, 60000);
requestAnimationFrame(loop);
})();
