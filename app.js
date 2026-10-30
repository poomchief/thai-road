(() => {
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const H7 = 7 * 3600e3;
const stacked = () => matchMedia('(max-width:900px), (orientation:portrait) and (max-width:1100px)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hav = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const bearing = (a, b) => { const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r),
  x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r); return Math.atan2(y, x) / r; };
const fmtDur = m => { m = Math.round(m); const h = Math.floor(m / 60); return h ? `${h} ชม. ${m % 60} น.` : `${m} น.`; };
const fmtKm = k => k >= 10 ? Math.round(k) + ' กม.' : k.toFixed(1) + ' กม.';
const fmtClock = t => new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
const fmtDayClock = t => { const d = new Date(t), today = new Date();
  const sameDay = new Date(t + H7).toISOString().slice(0, 10) === new Date(today.getTime() + H7).toISOString().slice(0, 10);
  return (sameDay ? '' : d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' }) + ' ') + fmtClock(t); };
const localISO = t => new Date(t + H7).toISOString().slice(0, 13) + ':00';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
async function getJSON(url, opt = {}, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
function seeded(n) { let s = (n * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

/* ---------- icons ---------- */
const GLYPH = {
  accident: '<path d="M12 6v8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18" r="1.6" fill="#fff"/>',
  flood: '<path d="M5 10c2-2 3 2 5 0s3 2 5 0 3 2 4 0M5 15c2-2 3 2 5 0s3 2 5 0 3 2 4 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  work: '<path d="M12 5 7 19h10z" fill="#fff"/>',
  rain: '<path d="M7 13a3.5 3.5 0 1 1 1-6.8A4.5 4.5 0 0 1 17 8a2.5 2.5 0 0 1 0 5z" fill="#fff"/><path d="M9 16l-1 3M13 16l-1 3M17 16l-1 3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-1a3 3 0 0 0-3-3h-7v4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="10.5" r="1.8" fill="#fff"/>',
  home: '<path d="M3 11 12 3l9 8v10H3z" fill="var(--ok)" stroke="var(--route-casing)" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="7" fill="var(--route-casing)"/>'
};
const icon = (t, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${GLYPH[t]}</svg>`;
const TYPES = {
  accident: { label: 'อุบัติเหตุ', c: 'var(--danger)' }, work: { label: 'ซ่อมถนน', c: 'var(--warn)' },
  flood: { label: 'เสี่ยงน้ำท่วม', c: 'var(--flood)' }, rain: { label: 'ฝนตกหนัก', c: 'var(--rain)' }
};
const WTXT = { 0: 'ท้องฟ้าแจ่มใส', 1: 'แจ่มใสเป็นส่วนใหญ่', 2: 'มีเมฆบางส่วน', 3: 'เมฆมาก', 45: 'หมอก', 48: 'หมอกเกาะ', 51: 'ฝนปรอย', 53: 'ฝนปรอย', 55: 'ฝนปรอยหนาแน่น',
  61: 'ฝนเล็กน้อย', 63: 'ฝนปานกลาง', 65: 'ฝนหนัก', 80: 'ฝนซู่', 81: 'ฝนซู่ปานกลาง', 82: 'ฝนซู่หนัก', 95: 'พายุฝนฟ้าคะนอง', 96: 'พายุฝนฟ้าคะนอง', 99: 'พายุฝนฟ้าคะนอง' };
const wmo = c => c <= 1 ? 'sun' : c === 2 ? 'partly' : c === 3 ? 'cloud' : c === 45 || c === 48 ? 'fog' : c >= 95 ? 'storm' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? 'rain' : 'cloud';
function wxIcon(c, s = 28) {
  const sun = `<circle cx="12" cy="12" r="4.5" fill="#f2b52b"/><g stroke="#f2b52b" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>`;
  const cloud = (x = 0, y = 0, f = '#9fb0b8') => `<path transform="translate(${x} ${y})" d="M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 .5 7z" fill="${f}"/>`;
  const drops = `<g stroke="#2b72d6" stroke-width="1.8" stroke-linecap="round"><path d="M8 19l-1 3M12 19l-1 3M16 19l-1 3"/></g>`;
  const m = { sun, partly: `<g transform="translate(-3 -3) scale(.8)">${sun}</g>${cloud(1, 2, '#b4c2c8')}`, cloud: cloud(0, 0), rain: cloud(0, -2, '#8496a0') + drops,
    storm: cloud(0, -2, '#6e7f89') + `<path d="M12.5 15 10 19.5h2.5L11 23l4-5h-2.6l1.3-3z" fill="#f2b52b"/>`, fog: `<g stroke="#9fb0b8" stroke-width="2" stroke-linecap="round"><path d="M4 9h16M3 13h18M5 17h14"/></g>` };
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${m[c]}</svg>`;
}

/* ---------- toasts / status ---------- */
function toast(msg, c) {
  const d = document.createElement('div'); d.className = 'toast'; d.style.setProperty('--c', c || 'var(--accent)'); d.textContent = msg;
  const box = $('#toasts'); box.prepend(d); setTimeout(() => d.remove(), 6500); while (box.children.length > 3) box.lastChild.remove();
}
function status(msg, c) { const s = $('#status'); if (!msg) { s.hidden = true; return; } s.hidden = false; s.style.setProperty('--c', c || 'var(--accent)'); s.textContent = msg; }

/* ---------- map ---------- */
const CITIES = CITY.map(([id, name, lat, lon, reg, major]) => ({ id, name, lat, lon, reg, major }));
const map = L.map('map', { zoomControl: true, maxZoom: 20 }).setView([13.4, 101], 6);
const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const esri = s => `https://server.arcgisonline.com/ArcGIS/rest/services/${s}/MapServer/tile/{z}/{y}/{x}`;
// basemaps: all keyless (CARTO now requires an API key for unregistered sites)
const osm = (opt = {}) => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, maxNativeZoom: 19, className: 'basemap', attribution: OSM_ATTR, ...opt });
const BASE = {
  'ถนน (ชื่อภาษาไทย)': osm(),
  // detectRetina loads one zoom level deeper on retina screens: more streets and places, smaller text
  'ถนน ละเอียดสูง': osm({ detectRetina: true }),
  'ดาวเทียม + ชื่อสถานที่': L.layerGroup([
    L.tileLayer(esri('World_Imagery'), { maxZoom: 20, maxNativeZoom: 19, attribution: 'ภาพดาวเทียม © Esri, Maxar, Earthstar Geographics' }),
    L.tileLayer(esri('Reference/World_Transportation'), { maxZoom: 20, maxNativeZoom: 19 }),
    L.tileLayer(esri('Reference/World_Boundaries_and_Places'), { maxZoom: 20, maxNativeZoom: 19 })]),
  'ภูมิประเทศ': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { subdomains: 'abc', maxZoom: 20, maxNativeZoom: 17, className: 'basemap', attribution: OSM_ATTR + ', SRTM | © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' })
};
const baseName = store.get('thai-road-base');
(BASE[baseName] || BASE['ถนน (ชื่อภาษาไทย)']).addTo(map);
L.control.layers(BASE, null, { position: 'topleft' }).addTo(map);
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
map.on('baselayerchange', e => store.set('thai-road-base', e.name));
const divIcon = (html, size, cls = '') => L.divIcon({ html, className: cls, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const layers = { alts: L.layerGroup().addTo(map), route: L.layerGroup().addTo(map), hz: L.layerGroup().addTo(map), stays: L.layerGroup().addTo(map), pins: L.layerGroup().addTo(map) };
let markerA = null, markerB = null, homeMarker = null, meMarker = null, carMarker = null, doneLine = null;

/* ---------- places ---------- */
const P = { from: null, to: null };
let home = store.get('thai-road-home');

function parseLoc(t) {
  try { t = decodeURIComponent(t.trim()); } catch (e) { t = t.trim(); }
  const d = t.match(/(\d+(?:\.\d+)?)\s*°\s*([NS])[\s,]+(\d+(?:\.\d+)?)\s*°\s*([EW])/i);
  if (d) return [(d[2].toUpperCase() === 'S' ? -1 : 1) * d[1], (d[4].toUpperCase() === 'W' ? -1 : 1) * d[3]];
  const m = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    t.match(/[?&](?:q|query|ll|sll|coordinate|center|destination|daddr|saddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    t.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  return m ? [+m[1], +m[2]] : null;
}
const inThai = (lat, lon) => lat > 5.4 && lat < 20.6 && lon > 97.2 && lon < 105.8;

function getGPS() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('เบราว์เซอร์นี้ไม่รองรับ GPS'));
    if (!window.isSecureContext) return rej(new Error('GPS ใช้ได้เฉพาะเว็บที่เป็น https เท่านั้น'));
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      e => rej(new Error(e.code === 1 ? 'ยังไม่ได้อนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งให้เว็บนี้ในการตั้งค่าเบราว์เซอร์' : 'หาตำแหน่งไม่ได้ ลองอีกครั้งในที่โล่ง')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  });
}
// iPads without a cellular model have no GPS chip; their Wi-Fi position can be off by kilometres
function warnAccuracy(acc) {
  if (acc > 1000) toast(`ตำแหน่งคลาดเคลื่อนได้ถึง ${(acc / 1000).toFixed(1)} กม. อุปกรณ์นี้อาจไม่มี GPS (เช่น iPad รุ่น Wi‑Fi) ปักหมุดเองบนแผนที่ หรือเปิด Hotspot จากมือถือ`, 'var(--warn)');
  else if (acc > 200) toast(`ความแม่นยำประมาณ ${Math.round(acc)} ม. ปักหมุดเองถ้ายังไม่ตรง`, 'var(--warn)');
}
const meIcon = () => divIcon('<div class="me"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 20l-7-4-7 4z" fill="#fff"/></svg></div>', 26);
function showMe(p) {
  if (!meMarker) meMarker = L.marker([p.lat, p.lon], { icon: meIcon(), zIndexOffset: 1100, keyboard: false }).addTo(map);
  else meMarker.setLatLng([p.lat, p.lon]);
}

function setPlace(key, p, quiet) {
  P[key] = p; $('#' + key + 'In').value = p ? p.name : '';
  if (key === 'from') { markerA?.remove(); markerA = p ? L.marker([p.lat, p.lon], { icon: divIcon('<div class="pin-a"></div>', 18), title: 'ต้นทาง' }).addTo(layers.pins) : null; }
  else { markerB?.remove(); markerB = p ? L.marker([p.lat, p.lon], { icon: L.divIcon({ html: '<div class="pin-b"></div>', className: '', iconSize: [22, 22], iconAnchor: [11, 26] }), title: 'ปลายทาง' }).addTo(layers.pins) : null; }
  store.set('thai-road-places', { from: P.from, to: P.to });
  if (!quiet && P.from && P.to) findRoute();
  else if (p && !quiet) map.setView([p.lat, p.lon], Math.max(map.getZoom(), 10));
}

function setupPlace(key) {
  const inp = $('#' + key + 'In'), ul = $('#' + key + 'Sugg'); let timer, seq = 0, items = [];
  function localList(q) {
    const out = [];
    const cities = q ? CITIES.filter(c => c.name.includes(q)).slice(0, 6) : CITIES.filter(c => c.major);
    if (!q) out.push({ hdr: 'ตำแหน่ง' }, { gps: true, name: 'ตำแหน่งปัจจุบัน (GPS)', sub: 'ใช้ GPS ของอุปกรณ์นี้' });
    if (home && (!q || 'บ้านของฉัน'.includes(q))) { if (q) out.push({ hdr: 'ตำแหน่ง' }); out.push({ lat: home.lat, lon: home.lon, name: 'บ้านของฉัน', sub: 'ตำแหน่งที่บันทึกไว้' }); }
    const ll = q && parseLoc(q); if (ll && inThai(ll[0], ll[1])) out.push({ lat: ll[0], lon: ll[1], name: `${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}`, sub: 'พิกัดที่พิมพ์' });
    if (cities.length) out.push({ hdr: 'เมือง' }, ...cities.map(c => ({ lat: c.lat, lon: c.lon, name: c.name, sub: 'ตัวเมือง' })));
    return out;
  }
  function show(list) {
    items = list; ul.innerHTML = list.map((it, i) => it.hdr ? `<li class="hdr">${esc(it.hdr)}</li>` :
      `<li role="option" data-i="${i}"><span>${esc(it.name)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</li>`).join('');
    ul.hidden = !list.length;
  }
  async function search(q) {
    const my = ++seq;
    try {
      const r = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=th&accept-language=th&limit=6&q=${encodeURIComponent(q)}`);
      if (my !== seq || document.activeElement !== inp) return;
      const extra = r.map(x => ({ lat: +x.lat, lon: +x.lon, name: x.name || x.display_name.split(',')[0], sub: x.display_name }));
      show([...localList(q), ...(extra.length ? [{ hdr: 'ผลค้นหา OpenStreetMap' }, ...extra] : [{ hdr: 'ไม่พบสถานที่ ลองพิมพ์ชื่ออำเภอหรือจังหวัด' }])]);
    } catch (e) { if (my === seq && document.activeElement === inp) show([...localList(q), { hdr: 'ค้นหาออนไลน์ไม่ได้ในขณะนี้ เลือกจากรายการเมืองแทน' }]); }
  }
  async function pick(it) {
    ul.hidden = true;
    if (it.gps) {
      inp.value = 'กำลังหาตำแหน่ง…';
      try { const p = await getGPS(); showMe(p); setPlace(key, { lat: p.lat, lon: p.lon, name: 'ตำแหน่งปัจจุบัน' }); warnAccuracy(p.acc); }
      catch (e) { inp.value = P[key]?.name || ''; toast(e.message, 'var(--danger)'); }
      return;
    }
    setPlace(key, { lat: it.lat, lon: it.lon, name: it.name });
  }
  inp.addEventListener('focus', () => { inp.select(); show(localList('')); });
  inp.addEventListener('input', () => { const q = inp.value.trim(); show(localList(q)); clearTimeout(timer); if (q.length >= 2 && !parseLoc(q)) timer = setTimeout(() => search(q), 650); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const first = items.find(x => !x.hdr); if (first) pick(first); } if (e.key === 'Escape') ul.hidden = true; });
  inp.addEventListener('blur', () => setTimeout(() => { ul.hidden = true; if (!inp.value.trim() || inp.value === 'กำลังหาตำแหน่ง…') return; if (P[key] && inp.value !== P[key].name) inp.value = P[key].name; }, 180));
  ul.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (!li) return; e.preventDefault(); pick(items[+li.dataset.i]); });
}
setupPlace('from'); setupPlace('to');
$('#swap').onclick = () => { const a = P.from; setPlace('from', P.to, true); setPlace('to', a, true); if (P.from && P.to) findRoute(); };

/* ---------- home ---------- */
function renderHome() {
  homeMarker?.remove(); homeMarker = null;
  $('#homeClear').hidden = !home;
  if (!home) { $('#homeInfo').textContent = 'ยังไม่ได้ตั้งตำแหน่ง'; return; }
  const near = CITIES.map(c => ({ c, d: hav(home, c) })).sort((a, b) => a.d - b.d)[0];
  $('#homeInfo').textContent = `${home.lat.toFixed(4)}, ${home.lon.toFixed(4)} · ใกล้${near.c.name} (${Math.round(near.d)} กม.)`;
  homeMarker = L.marker([home.lat, home.lon], { icon: divIcon(`<div class="pin-home">${icon('home', 26)}</div>`, 26), title: 'บ้านของฉัน' })
    .addTo(map).bindPopup('<h3>บ้านของฉัน</h3><button class="btn" data-go="from">เริ่มจากบ้าน</button> <button class="btn" data-go="to">กลับบ้าน</button>');
}
function setHome(lat, lon) {
  if (!inThai(lat, lon)) { toast('ตำแหน่งนี้อยู่นอกประเทศไทย ตรวจลำดับพิกัด (ละติจูด, ลองจิจูด) อีกครั้ง', 'var(--danger)'); return false; }
  home = { lat, lon }; store.set('thai-road-home', home); renderHome();
  if (!P.from || P.from.name === 'บ้านของฉัน') setPlace('from', { lat, lon, name: 'บ้านของฉัน' });
  toast('บันทึกตำแหน่งบ้านแล้ว', 'var(--ok)'); return true;
}
$('#gpsHome').onclick = async () => { const b = $('#gpsHome'); b.disabled = true; b.textContent = 'กำลังหาตำแหน่ง…';
  try { const p = await getGPS(); showMe(p); setHome(p.lat, p.lon); map.setView([p.lat, p.lon], 13); warnAccuracy(p.acc); }
  catch (e) { toast(e.message, 'var(--danger)'); }
  b.disabled = false; b.textContent = 'ใช้ GPS ตอนนี้เป็นบ้าน'; };
$('#homeSet').onclick = () => {
  const v = $('#homeIn').value.trim(); if (!v) { toast('วางพิกัดหรือลิงก์แผนที่ก่อน', 'var(--warn)'); return; }
  if (/goo\.gl|maps\.app/.test(v)) { toast('ลิงก์แบบย่ออ่านพิกัดไม่ได้ เปิดลิงก์ในแอปแผนที่ แล้วคัดลอกตัวเลขพิกัดมาวางแทน', 'var(--warn)'); return; }
  const ll = parseLoc(v); if (!ll) { toast('อ่านพิกัดไม่ได้ ใช้รูปแบบ 13.80, 100.55', 'var(--danger)'); return; }
  if (setHome(ll[0], ll[1])) { $('#homeIn').value = ''; map.setView(ll, 13); }
};
$('#homeIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('#homeSet').click(); });
let pinMode = false;
function setPin(v) { pinMode = v; $('#homePin').setAttribute('aria-pressed', v); $('#map').classList.toggle('pinning', v); }
$('#homePin').onclick = () => { setPin(!pinMode); if (pinMode) { toast('แตะตำแหน่งบ้านบนแผนที่ ซูมเข้าก่อนเพื่อให้แม่นยำ'); if (stacked()) $('#wrap').scrollIntoView({ behavior: 'smooth' }); } };
$('#homeClear').onclick = () => { home = null; store.del('thai-road-home'); renderHome(); toast('ลบตำแหน่งบ้านแล้ว'); };
map.on('click', e => {
  const { lat, lng } = e.latlng;
  if (pinMode) { if (setHome(lat, lng)) setPin(false); return; }
  L.popup().setLatLng(e.latlng).setContent(`<p>${lat.toFixed(5)}, ${lng.toFixed(5)}</p><button class="btn" data-pt="from">เริ่มจากที่นี่</button> <button class="btn" data-pt="to">ไปที่นี่</button> <button class="btn" data-near>ที่พักใกล้จุดนี้</button>`).openOn(map);
});
map.on('popupopen', e => {
  const el = e.popup.getElement(), ll = e.popup.getLatLng();
  el.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { map.closePopup(); setPlace(b.dataset.pt, { lat: ll.lat, lon: ll.lng, name: `จุดบนแผนที่ ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}` }); });
  el.querySelectorAll('[data-near]').forEach(b => b.onclick = () => { map.closePopup(); findNearStays({ lat: ll.lat, lon: ll.lng }, 'จุดที่เลือก'); });
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { map.closePopup(); setPlace(b.dataset.go, { lat: home.lat, lon: home.lon, name: 'บ้านของฉัน' }); });
});

/* ---------- routing ---------- */
const MAN = { 'turn': 'เลี้ยว', 'new name': 'ตรงไป', 'continue': 'ตรงไป', 'merge': 'เข้าร่วม', 'on ramp': 'ขึ้นทางลาด', 'off ramp': 'ออกทางลาด', 'fork': 'ชิด', 'end of road': 'สุดทาง เลี้ยว',
  'roundabout': 'เข้าวงเวียน', 'rotary': 'เข้าวงเวียน', 'exit roundabout': 'ออกจากวงเวียน', 'exit rotary': 'ออกจากวงเวียน', 'depart': 'ออกเดินทาง', 'arrive': 'ถึงปลายทาง' };
const MOD = { 'left': 'ซ้าย', 'right': 'ขวา', 'slight left': 'ซ้ายเล็กน้อย', 'slight right': 'ขวาเล็กน้อย', 'sharp left': 'ซ้ายหักศอก', 'sharp right': 'ขวาหักศอก', 'uturn': 'กลับรถ', 'straight': 'ตรง' };
function stepText(s) {
  const m = s.maneuver || {}, road = [s.ref, s.name].filter(Boolean).join(' ');
  let act = MAN[m.type] || 'ตรงไป';
  if (m.modifier === 'uturn') act = 'กลับรถ';
  else if (['turn', 'fork', 'end of road', 'merge', 'on ramp', 'off ramp'].includes(m.type) && m.modifier) act += MOD[m.modifier] || '';
  if (m.type === 'roundabout' || m.type === 'rotary') act += m.exit ? ` ออกทางที่ ${m.exit}` : '';
  return { text: act + (road && m.type !== 'arrive' ? ' เข้าสู่ ' + road : ''), km: s.distance / 1000, lat: m.location?.[1], lon: m.location?.[0] };
}
async function osrm(a, b) {
  const r = await getJSON(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&alternatives=3&steps=true`, {}, 25000);
  if (r.code !== 'Ok' || !r.routes?.length) throw new Error(r.message || 'ไม่พบเส้นทาง');
  return r.routes.map(rt => ({ coords: rt.geometry.coordinates.map(([lo, la]) => [la, lo]), dist: rt.distance / 1000, dur: rt.duration / 60,
    steps: rt.legs.flatMap(l => l.steps).map(stepText).filter(s => s.km > 0.05 || /ถึง/.test(s.text)), via: rt.legs.map(l => l.summary).filter(Boolean).join(', '), src: 'osrm' }));
}
// offline fallback: main-highway graph from data.js
function graphRoute(a, b) {
  const C = Object.fromEntries(CITIES.map(c => [c.id, c])), ADJ = {}, E = {};
  const key = (x, y) => x < y ? x + '|' + y : y + '|' + x;
  const addE = (x, y, hw, len, sp) => { E[key(x, y)] = { hw, len, sp }; (ADJ[x] = ADJ[x] || []).push(y); (ADJ[y] = ADJ[y] || []).push(x); };
  ROADS.forEach(([x, y, hw]) => addE(x, y, hw, hav(C[x], C[y]) * 1.22, hw === '7' ? 100 : 85));
  C.A = { id: 'A', name: a.name, lat: a.lat, lon: a.lon }; C.B = { id: 'B', name: b.name, lat: b.lat, lon: b.lon };
  for (const id of ['A', 'B']) CITIES.map(c => ({ c, d: hav(C[id], c) })).sort((p, q) => p.d - q.d).slice(0, 2)
    .forEach(({ c, d }, i, arr) => { if (i === 0 || d < arr[0].d * 1.6) addE(id, c.id, 'ถนนท้องถิ่น', d * 1.3, 50); });
  const dist = {}, prev = {}, done = new Set(); for (const id in C) dist[id] = Infinity; dist.A = 0;
  for (;;) { let u = null, best = Infinity; for (const id in dist) if (!done.has(id) && dist[id] < best) { best = dist[id]; u = id; }
    if (u === null || u === 'B') break; done.add(u);
    for (const v of ADJ[u] || []) { const e = E[key(u, v)], w = e.len / e.sp * 60; if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } } }
  if (dist.B === Infinity) throw new Error('ไม่พบเส้นทาง');
  const path = ['B']; while (path[0] !== 'A') path.unshift(prev[path[0]]);
  const steps = []; let km = 0;
  for (let i = 0; i < path.length - 1; i++) { const e = E[key(path[i], path[i + 1])]; km += e.len;
    steps.push({ text: `ใช้${/^\d+$/.test(e.hw) ? ' ทล.' + e.hw : e.hw} ไป${C[path[i + 1]].name}`, km: e.len, lat: C[path[i]].lat, lon: C[path[i]].lon }); }
  return [{ coords: path.map(id => [C[id].lat, C[id].lon]), dist: km, dur: dist.B, steps, via: 'ทางหลวงสายหลัก (โดยประมาณ)', src: 'graph' }];
}
function prepRoute(rt, idx) {
  rt.idx = idx; rt.cum = [0];
  for (let i = 1; i < rt.coords.length; i++) rt.cum.push(rt.cum[i - 1] + hav({ lat: rt.coords[i - 1][0], lon: rt.coords[i - 1][1] }, { lat: rt.coords[i][0], lon: rt.coords[i][1] }));
  rt.gkm = rt.cum[rt.cum.length - 1] || rt.dist;
  const step = clamp(rt.gkm / 18, 20, 60); rt.samples = [];
  for (let k = 0; k < rt.gkm; k += step) rt.samples.push({ km: k, ...pointAt(rt, k) });
  rt.samples.push({ km: rt.gkm, ...pointAt(rt, rt.gkm) });
  rt.thin = []; for (let k = 0; k <= rt.gkm; k += 2) rt.thin.push({ km: k, ...pointAt(rt, k) });
  // simulated road incidents, stable for the same route
  const rnd = seeded(Math.round(rt.dist * 10) + rt.coords.length), n = Math.min(3, Math.floor(rt.gkm / 220 + rnd() * 1.6));
  const ACC = ['รถบรรทุกพลิกคว่ำ ปิด 1 ช่องจราจร', 'รถยนต์ชนท้ายกันหลายคัน การจราจรติดขัด', 'รถกระบะเสียหลักตกข้างทาง เจ้าหน้าที่อยู่ในพื้นที่'];
  rt.sim = []; for (let i = 0; i < n; i++) { const km = rt.gkm * (0.1 + rnd() * 0.8), acc = rnd() < 0.65;
    rt.sim.push({ type: acc ? 'accident' : 'work', km, ...pointAt(rt, km), sim: true, title: acc ? 'อุบัติเหตุ' : 'ซ่อมถนน',
      desc: acc ? ACC[Math.floor(rnd() * ACC.length)] : 'ซ่อมผิวทาง ปิด 1 ช่องจราจร', penalty: acc ? 25 : 10, factor: acc ? 0.45 : 0.65 }); }
  return rt;
}
function pointAt(rt, km) {
  const c = rt.cum, n = c.length; if (n < 2) return { lat: rt.coords[0][0], lon: rt.coords[0][1], hd: 0, i: 0 };
  km = clamp(km, 0, c[n - 1]); let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= km) lo = m; else hi = m; }
  const t = (km - c[lo]) / ((c[hi] - c[lo]) || 1), a = { lat: rt.coords[lo][0], lon: rt.coords[lo][1] }, b = { lat: rt.coords[hi][0], lon: rt.coords[hi][1] };
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, hd: bearing(a, b), i: lo };
}

/* ---------- weather ---------- */
const WX = new Map(); let wxOk = true;
const wxKey = p => p.lat.toFixed(2) + ',' + p.lon.toFixed(2);
async function fetchWx(points) {
  const need = [...new Set(points.map(wxKey))].filter(k => !WX.has(k));
  for (let i = 0; i < need.length; i += 40) {
    const chunk = need.slice(i, i + 40), la = chunk.map(k => k.split(',')[0]).join(','), lo = chunk.map(k => k.split(',')[1]).join(',');
    let r = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=5`, {}, 20000);
    if (!Array.isArray(r)) r = [r]; chunk.forEach((k, j) => WX.set(k, r[j]));
  }
}
function hazardsFor(rt, T0) {
  const hz = [];
  for (const p of rt.samples) {
    const w = WX.get(wxKey(p)); if (!w?.hourly) continue;
    const eta = T0 + p.km / rt.gkm * rt.dur * 60000, iso = localISO(eta), hi = w.hourly.time.indexOf(iso);
    const mmh = hi >= 0 ? Math.max(w.hourly.precipitation[hi] || 0, w.hourly.precipitation[hi + 1] || 0) : 0, code = hi >= 0 ? w.hourly.weather_code[hi] : 0;
    const di = w.daily.time.indexOf(iso.slice(0, 10)), day = di >= 0 ? w.daily.precipitation_sum[di] || 0 : 0;
    if (day >= 50) hz.push({ type: 'flood', km: p.km, lat: p.lat, lon: p.lon, level: day >= 90 ? 2 : 1, title: day >= 90 ? 'เสี่ยงน้ำท่วมสูง' : 'เสี่ยงน้ำท่วม',
      desc: `พยากรณ์ฝนสะสมทั้งวันประมาณ ${Math.round(day)} มม. ถนนที่ต่ำหรือใกล้ลำน้ำอาจมีน้ำท่วมขัง`, penalty: day >= 90 ? 120 : 30, factor: day >= 90 ? 0.5 : 0.75 });
    if (mmh >= 7.5 || code >= 95) hz.push({ type: 'rain', km: p.km, lat: p.lat, lon: p.lon, level: 1, title: code >= 95 ? 'พายุฝนฟ้าคะนอง' : 'ฝนตกหนัก',
      desc: `ช่วงที่คาดว่าจะผ่าน (${fmtDayClock(eta)}) ฝนประมาณ ${mmh.toFixed(1)} มม./ชม. ถนนลื่น ทัศนวิสัยต่ำ`, penalty: 10, factor: 0.75 });
  }
  const merged = [];
  for (const h of hz.sort((a, b) => a.km - b.km)) { const last = merged.findLast?.(m => m.type === h.type) ?? [...merged].reverse().find(m => m.type === h.type);
    if (last && h.km - last.kmEnd < 45) { last.kmEnd = h.km; if (h.level > last.level) Object.assign(last, { ...h, km: last.km, kmEnd: h.km }); }
    else merged.push({ ...h, kmEnd: h.km }); }
  if ($('#simInc').checked) merged.push(...rt.sim);
  return merged.sort((a, b) => a.km - b.km);
}
const score = (rt, hz) => rt.dur + hz.reduce((s, h) => s + h.penalty, 0);

/* ---------- route state ---------- */
let routes = [], cur = null, curHz = [], T0 = Date.now(), lastPlanKey = '';
async function findRoute(keepDrive) {
  if (!P.from || !P.to) { toast('เลือกต้นทางและปลายทางก่อน', 'var(--warn)'); return; }
  if (hav(P.from, P.to) < 0.2) { toast('ต้นทางและปลายทางอยู่ที่เดียวกัน', 'var(--warn)'); return; }
  if (!keepDrive) stopDrive();
  status('กำลังหาเส้นทาง…'); $('#findBtn').disabled = true;
  let src = 'osrm';
  try { routes = await osrm(P.from, P.to); }
  catch (e) { routes = graphRoute(P.from, P.to); src = 'graph'; }
  routes.forEach(prepRoute);
  status('กำลังตรวจพยากรณ์อากาศตลอดเส้นทาง…');
  T0 = Date.now();
  try { await fetchWx(routes.flatMap(r => r.samples)); wxOk = true; } catch (e) { wxOk = false; }
  $('#findBtn').disabled = false;
  const msgs = [];
  if (src === 'graph') msgs.push('บริการหาเส้นทางออนไลน์ไม่ตอบสนอง จึงใช้เส้นทางทางหลวงหลักโดยประมาณแทน');
  if (!wxOk) msgs.push('โหลดพยากรณ์อากาศไม่ได้ จึงยังไม่มีการเตือนฝนและน้ำท่วม');
  status(msgs.join(' · '), msgs.length ? 'var(--warn)' : null);
  routes.forEach(r => { r.hz = hazardsFor(r, T0); r.score = score(r, r.hz); });
  const fastest = routes.reduce((a, b) => b.dur < a.dur ? b : a), safest = routes.reduce((a, b) => b.score < a.score ? b : a);
  routes.forEach(r => { r.fast = r === fastest; r.safe = r === safest && safest !== fastest; });
  selectRoute($('#avoid').checked ? safest : fastest, !keepDrive);
  if ($('#avoid').checked && safest !== fastest) toast(`เลือกเส้นทางที่เลี่ยงจุดเสี่ยง (ช้ากว่าเส้นทางเร็วสุด ${fmtDur(safest.dur - fastest.dur)})`, 'var(--ok)');
}
function selectRoute(rt, fit) {
  cur = rt; curHz = rt.hz;
  drawRoutes(); renderAlts(); renderTrip(0); renderAlerts(0); renderStays(); renderWeather(); drawHazards();
  $('#simBtn').disabled = $('#navBtn').disabled = false;
  if (fit) map.fitBounds(L.latLngBounds(rt.coords), { padding: [40, 40] });
}
function drawRoutes() {
  layers.alts.clearLayers(); layers.route.clearLayers(); doneLine = null;
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
  for (const r of routes) if (r !== cur) L.polyline(r.coords, { color: col('--alt'), weight: 5, opacity: .8 }).addTo(layers.alts)
    .on('click', () => selectRoute(r)).bindTooltip(`${fmtKm(r.dist)} · ${fmtDur(r.dur)} · แตะเพื่อเลือก`, { sticky: true });
  L.polyline(cur.coords, { color: col('--route-casing'), weight: 10, opacity: 1 }).addTo(layers.route);
  L.polyline(cur.coords, { color: col('--route'), weight: 6, opacity: 1 }).addTo(layers.route);
  doneLine = L.polyline([], { color: col('--done'), weight: 6, opacity: 1 }).addTo(layers.route);
}
function drawHazards() {
  layers.hz.clearLayers();
  for (const h of curHz) { const t = TYPES[h.type];
    L.marker([h.lat, h.lon], { icon: divIcon(`<div class="mk${h.sim ? ' sim' : ''}" style="--c:${t.c};width:26px;height:26px">${icon(h.type, 16)}</div>`, 26), title: h.title })
      .bindPopup(`<h3 style="color:${t.c}">${esc(h.title)}${h.sim ? ' <span class="tag" style="--c:var(--muted)">จำลอง</span>' : ''}</h3><p>${esc(h.desc)}</p><p>กม. ${Math.round(h.km)} จากต้นทาง</p>`).addTo(layers.hz);
  }
}
function renderAlts() {
  $('#alts').innerHTML = routes.length < 2 ? '' : routes.map((r, i) => `<button class="alt" data-i="${i}" aria-pressed="${r === cur}">
    <span>เส้นทาง ${i + 1}${r.fast ? '<span class="tag" style="--c:var(--accent)">เร็วที่สุด</span>' : ''}${r.safe ? '<span class="tag" style="--c:var(--ok)">ปลอดภัยกว่า</span>' : ''}</span>
    <b>${fmtDur(r.dur)}</b><small>${fmtKm(r.dist)}${r.via ? ' · ผ่าน ' + esc(r.via) : ''} · ${r.hz.length ? 'จุดเตือน ' + r.hz.length + ' จุด' : 'ไม่มีจุดเตือน'}</small></button>`).join('');
  $('#alts').querySelectorAll('.alt').forEach(b => b.onclick = () => selectRoute(routes[+b.dataset.i]));
}
function remainingMin(km) { return cur.dur * (1 - km / cur.gkm); }
function renderTrip(km, now) {
  $('#trip').hidden = false;
  const left = cur.gkm - km, scale = cur.dist / cur.gkm;
  $('#sDist').textContent = fmtKm(left * scale);
  $('#sTime').textContent = fmtDur(remainingMin(km));
  $('#sEta').textContent = fmtDayClock((now || Date.now()) + remainingMin(km) * 60000);
  $('#prog').style.width = clamp(km / cur.gkm * 100, 0, 100) + '%';
  if (!renderTrip.sig || renderTrip.sig !== cur) {
    renderTrip.sig = cur;
    $('#stepCount').textContent = `(${cur.steps.length})`;
    $('#steps').innerHTML = cur.steps.map(s => `<li>${esc(s.text)} <span class="km">${fmtKm(s.km)}</span></li>`).join('');
  }
}
function hazardsAhead(km) { return curHz.filter(h => (h.kmEnd ?? h.km) >= km - 0.2).map(h => ({ h, d: Math.max(0, h.km - km) })); }
function renderAlerts(km) {
  const list = hazardsAhead(km);
  $('#alertCount').textContent = list.length ? `${list.length} จุด` : '';
  $('#routeAlerts').innerHTML = list.length ? list.map(({ h, d }, i) => { const t = TYPES[h.type];
    return `<button class="alert" style="--c:${t.c}" data-i="${i}"><span class="ic">${icon(h.type)}</span><span><b>${esc(h.title)}</b>${h.sim ? '<span class="tag" style="--c:var(--muted)">จำลอง</span>' : ''} <span class="km">· ${d < 0.5 ? 'ช่วงนี้' : 'อีก ' + fmtKm(d)}</span><p>${esc(h.desc)}</p></span></button>`; }).join('')
    : `<div class="empty">${wxOk ? 'ไม่พบฝนตกหนักหรือความเสี่ยงน้ำท่วมตามช่วงเวลาที่จะผ่าน' : 'ยังตรวจสภาพอากาศไม่ได้'}${$('#simInc').checked ? '' : ' (ปิดการแสดงเหตุจำลองอยู่)'}</div>`;
  $('#routeAlerts').querySelectorAll('.alert').forEach(b => b.onclick = () => { const { h } = list[+b.dataset.i]; setFollow(false); map.setView([h.lat, h.lon], 12);
    if (stacked()) $('#wrap').scrollIntoView({ behavior: 'smooth' }); });
}

/* ---------- stopovers ---------- */
const STAY = { SSK: 'อัมพวา: โฮมสเตย์และรีสอร์ตริมคลอง', PBI: 'ตัวเมืองเพชรบุรี หรือชะอำริมหาด', HHN: 'รีสอร์ตริมหาดหัวหิน และย่านตลาดฉัตรไชย', PKN: 'โรงแรมริมอ่าวประจวบ',
  CPN: 'ตัวเมืองชุมพร หรือหาดทุ่งวัวแล่น', SNI: 'ตัวเมืองสุราษฎร์ฯ ริมแม่น้ำตาปี', TSG: 'ใกล้สถานีรถไฟทุ่งสง', NST: 'ตัวเมืองนครศรีฯ ใกล้วัดพระมหาธาตุ', HDY: 'ย่านนิพัทธ์อุทิศ ใจกลางหาดใหญ่' };
let stopList = [];
function renderStays() {
  layers.stays.clearLayers();
  const near = [];
  for (const c of CITIES) { let best = null; for (const p of cur.thin) { const d = hav(c, p); if (!best || d < best.d) best = { d, km: p.km }; }
    if (best.d < 12 && best.km > 25 && best.km < cur.gkm - 15) near.push({ name: c.name, id: c.id, lat: c.lat, lon: c.lon, km: best.km }); }
  near.sort((a, b) => a.km - b.km);
  near.push({ name: P.to.name, lat: P.to.lat, lon: P.to.lon, km: cur.gkm, dest: true });
  near.forEach(s => { s.min = s.km / cur.gkm * cur.dur; });
  const total = cur.dur, target = total < 14 * 60 ? total / 2 : 6.5 * 60, mids = near.filter(s => !s.dest);
  const rec = total > 7 * 60 && mids.length ? mids.reduce((a, b) => Math.abs(b.min - target) < Math.abs(a.min - target) ? b : a) : null;
  stopList = near; stopList.rec = rec;
  $('#stayNote').textContent = total > 7 * 60 ? `ขับรวม ${fmtDur(total)} ควรพัก 1 คืน` : `ขับรวม ${fmtDur(total)} ขับรวดเดียวได้ แวะพักทุก 2 ชม.`;
  $('#stays').innerHTML = near.map((s, i) => {
    const isRec = s === rec, w = WX.get(wxKey(cur.samples.reduce((a, b) => Math.abs(b.km - s.km) < Math.abs(a.km - s.km) ? b : a)));
    const flood = w?.daily && Math.max(...w.daily.precipitation_sum.slice(0, 2)) >= 50;
    const q = encodeURIComponent('ที่พัก ' + s.name);
    return `<div class="stay${isRec ? ' rec' : ''}"><span class="ic" style="--c:${isRec ? 'var(--accent)' : 'var(--muted)'}">${icon('bed')}</span><span>
      <b>${esc(s.name)}</b>${isRec ? '<span class="tag" style="--c:var(--accent)">แนะนำพักคืนนี้</span>' : ''}${s.dest ? '<span class="tag" style="--c:var(--ok)">ปลายทาง</span>' : ''}
      <span class="km">${fmtKm(s.km * cur.dist / cur.gkm)} · ${fmtDur(s.min)} · ถึงประมาณ ${fmtDayClock(T0 + s.min * 60000)}</span>
      <p>${esc(STAY[s.id] || (s.dest ? 'รอบจุดหมายปลายทาง' : 'โรงแรมและห้องพักในตัวเมือง'))}</p>
      ${flood ? '<p style="color:var(--flood)">พยากรณ์ฝนหนักในพื้นที่ เลือกที่พักที่มีที่จอดรถบนที่สูง</p>' : ''}
      <p><button class="linkbtn" data-hotels="${i}">ดูที่พักใกล้เคียงบนแผนที่</button> · <a href="https://www.google.com/maps/search/${q}/@${s.lat},${s.lon},13z" target="_blank" rel="noopener">Google Maps</a> · <a href="https://www.booking.com/searchresults.th.html?ss=${encodeURIComponent(s.name)}&latitude=${s.lat}&longitude=${s.lon}" target="_blank" rel="noopener">Booking.com</a></p>
      <ul id="hotels${i}" hidden></ul></span></div>`; }).join('');
  $('#stays').querySelectorAll('[data-hotels]').forEach(b => b.onclick = () => loadHotels(+b.dataset.hotels, b));
  if (rec) L.marker([rec.lat, rec.lon], { icon: divIcon(`<div class="mk" style="--c:var(--accent);width:28px;height:28px">${icon('bed', 16)}</div>`, 28), title: 'แนะนำพักคืนนี้: ' + rec.name })
    .bindPopup(`<h3>${esc(rec.name)}</h3><p>แนะนำพักค้างคืน · ถึงประมาณ ${fmtDayClock(T0 + rec.min * 60000)}</p>`).addTo(layers.stays);
}
async function loadHotels(i, btn) {
  const s = stopList[i], ul = $('#hotels' + i); btn.disabled = true; btn.textContent = 'กำลังค้นหา…';
  const q = `[out:json][timeout:20];nwr["tourism"~"^(hotel|guest_house|motel|hostel|apartment)$"]["name"](around:6000,${s.lat},${s.lon});out center 12;`;
  try {
    const r = await getJSON('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 25000);
    const hs = (r.elements || []).map(e => ({ name: e.tags['name:th'] || e.tags.name, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, stars: e.tags.stars, kind: e.tags.tourism })).filter(h => h.lat);
    ul.hidden = false;
    ul.innerHTML = hs.length ? hs.map(h => `<li><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}%20${h.lat},${h.lon}" target="_blank" rel="noopener">${esc(h.name)}</a>${h.stars ? ` · ${esc(h.stars)} ดาว` : ''}</li>`).join('')
      : '<li>ยังไม่มีข้อมูลที่พักในบริเวณนี้บน OpenStreetMap ลองค้นใน Google Maps</li>';
    hs.forEach(h => L.marker([h.lat, h.lon], { icon: divIcon(`<div class="mk" style="--c:var(--muted);width:22px;height:22px">${icon('bed', 13)}</div>`, 22), title: h.name })
      .bindPopup(`<h3>${esc(h.name)}</h3><p><a href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lon}" target="_blank" rel="noopener">เปิดใน Google Maps</a></p>`).addTo(layers.stays));
    if (hs.length) { setFollow(false); map.setView([s.lat, s.lon], 13); }
    btn.textContent = `พบ ${hs.length} แห่ง (ข้อมูล OpenStreetMap)`;
  } catch (e) { btn.disabled = false; btn.textContent = 'ค้นไม่สำเร็จ ลองอีกครั้ง'; }
}

/* ---------- weather panel ---------- */
let wxSel = 0;
function renderWeather() {
  const spots = [{ name: 'ต้นทาง', km: 0 }, { name: 'กลางทาง', km: cur.gkm / 2 }];
  if (stopList.rec) spots.push({ name: 'จุดพัก ' + stopList.rec.name, km: stopList.rec.km });
  spots.push({ name: 'ปลายทาง', km: cur.gkm });
  wxSel = Math.min(wxSel, spots.length - 1);
  $('#wxChips').innerHTML = spots.map((s, i) => `<button class="chip" data-i="${i}" aria-pressed="${i === wxSel}">${esc(s.name)}</button>`).join('');
  $('#wxChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { wxSel = +b.dataset.i; renderWeather(); });
  const s = spots[wxSel], p = cur.samples.reduce((a, b) => Math.abs(b.km - s.km) < Math.abs(a.km - s.km) ? b : a), w = WX.get(wxKey(p));
  if (!w?.current) { $('#wx').innerHTML = '<div class="empty">โหลดพยากรณ์อากาศไม่ได้ในขณะนี้ ลองกด "หาเส้นทาง" อีกครั้ง หรือดูที่ <a href="https://www.tmd.go.th" target="_blank" rel="noopener">กรมอุตุนิยมวิทยา</a></div>'; return; }
  const c = w.current, d = w.daily, wet = d.precipitation_sum.map((x, i) => [x, i]).filter(([x]) => x >= 50);
  $('#wx').innerHTML = `<div class="wx-now">${wxIcon(wmo(c.weather_code), 52)}<div><span class="t">${Math.round(c.temperature_2m)}°</span>
    <p><b style="color:var(--ink)">${WTXT[c.weather_code] || 'มีเมฆ'}</b><br>ความชื้น ${c.relative_humidity_2m}% · ลม ${Math.round(c.wind_speed_10m)} กม./ชม. · ฝนตอนนี้ ${c.precipitation} มม.</p></div></div>
    <div class="wx-days">${d.time.map((t, i) => `<div class="day"><span class="d">${new Date(t + 'T12:00:00+07:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' })}</span>${wxIcon(wmo(d.weather_code[i]), 26)}
      <span class="tt">${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°</span><span class="rp">ฝน ${d.precipitation_probability_max[i] ?? '–'}%</span></div>`).join('')}</div>
    ${wet.length ? `<div class="warnbox" style="--c:var(--flood)">พยากรณ์ฝนสะสม ${wet.map(([x, i]) => `${new Date(d.time[i] + 'T12:00:00+07:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' })} ${Math.round(x)} มม.`).join(', ')} เสี่ยงน้ำท่วมขังในที่ต่ำ ติดตามประกาศจาก ปภ. 1784</div>` : ''}`;
}

/* ---------- drive: simulation & GPS navigation ---------- */
const drive = { mode: null, km: 0, t: 0, raf: 0, watch: null, said: new Set(), off: 0, lastReroute: 0, lastPan: 0, wake: null, nextSpawn: 0 };
let follow = true;
function setFollow(v) { follow = v; $('#follow').setAttribute('aria-pressed', v); }
$('#follow').onclick = () => { setFollow(!follow); const m = drive.mode === 'sim' ? carMarker : (live.watch != null ? meMarker : carMarker); if (follow && m) map.setView(m.getLatLng(), Math.max(map.getZoom(), 15)); };
map.on('dragstart', () => setFollow(false));
const carIcon = () => divIcon('<div class="car"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2 20 21l-8-4-8 4z" fill="#fff"/></svg></div>', 26);
function placeCar(km, gpsLL) {
  const p = pointAt(cur, km), ll = gpsLL || [p.lat, p.lon];
  if (!carMarker) carMarker = L.marker(ll, { icon: carIcon(), zIndexOffset: 1000, keyboard: false }).addTo(map); else carMarker.setLatLng(ll);
  const svg = carMarker.getElement()?.querySelector('svg'); if (svg) svg.style.transform = `rotate(${p.hd}deg)`;
  doneLine?.setLatLngs([...cur.coords.slice(0, p.i + 1), [p.lat, p.lon]]);
  const now = performance.now();
  if (follow && now - drive.lastPan > 400) { drive.lastPan = now; map.panTo(ll, { animate: true, duration: .4 }); }
}
function factorAt(km) { let f = 1; for (const h of curHz) { const r = h.type === 'rain' || h.type === 'flood' ? 10 : 3; if (km >= h.km - r && km <= (h.kmEnd ?? h.km) + r) f = Math.min(f, h.factor); } return f; }
function speak(msg) { if (!$('#voice').checked || !window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(msg); u.lang = 'th-TH'; speechSynthesis.speak(u); }
const banner = $('#banner');
function updateBanner(km) {
  const next = hazardsAhead(km).find(x => x.d <= 40);
  if (!next) { banner.hidden = true; return; }
  const { h, d } = next, t = TYPES[h.type];
  const act = h.type === 'flood' ? 'ลดความเร็ว หลีกเลี่ยงช่องทางที่น้ำลึก ห้ามขับฝ่าน้ำไหลแรง' : h.type === 'rain' ? 'เปิดไฟหน้า ลดความเร็ว เว้นระยะห่าง' : 'ลดความเร็ว ระวังเจ้าหน้าที่บนถนน';
  banner.hidden = false; banner.style.setProperty('--c', t.c);
  banner.innerHTML = `<span class="ic">${icon(h.type, 24)}</span><div><b>${d < 0.5 ? 'ช่วงนี้' : 'อีก ' + fmtKm(d)} · ${esc(h.title)}${h.sim ? ' (จำลอง)' : ''}</b><span>${act}</span></div>`;
  const id = h.type + Math.round(h.km);
  if (d <= 20 && !drive.said.has(id)) { drive.said.add(id); speak(`${d < 1 ? 'ช่วงนี้' : 'อีก ' + Math.round(d) + ' กิโลเมตร'} ${h.title} ${act}`); }
}
async function keepAwake() {
  try { drive.wake = await navigator.wakeLock.request('screen'); }
  catch (e) { toast('เปิดหน้าจอค้างไว้ไม่ได้ ระหว่างขับให้ตั้ง การตั้งค่า → จอภาพและความสว่าง → ล็อกอัตโนมัติ → ไม่ใช้', 'var(--warn)'); }
}
// Safari only lets speech start from a tap, so speak once inside the tap handler
$('#voice').onchange = () => { if ($('#voice').checked) speak('เปิดเสียงเตือนแล้ว'); };
function stopDrive() {
  cancelAnimationFrame(drive.raf);
  drive.wake?.release?.().catch(() => {}); Object.assign(drive, { mode: null, watch: null, wake: null });
  banner.hidden = true; $('#speedBox').hidden = true;
  $('#simBtn').textContent = 'จำลองการขับ'; $('#simBtn').className = 'btn'; $('#navBtn').textContent = 'นำทางด้วย GPS'; $('#navBtn').className = 'btn';
  if (typeof ensureWatch === 'function') ensureWatch();
}
function arrive() { const name = P.to.name; stopDrive(); toast(`ถึง${name}แล้ว`, 'var(--ok)'); speak(`ถึงปลายทาง ${name} แล้ว`); renderTrip(cur.gkm, drive.t || Date.now()); }
$('#simBtn').onclick = () => {
  if (drive.mode === 'sim') { stopDrive(); return; }
  if (!cur) return; stopDrive();
  Object.assign(drive, { mode: 'sim', km: 0, t: Date.now(), said: new Set(), nextSpawn: 30 });
  $('#simBtn').textContent = 'หยุดจำลอง'; $('#simBtn').className = 'btn stop'; $('#speedBox').hidden = false; speak('เริ่มจำลองการเดินทาง');
  setFollow(true); map.setView([cur.coords[0][0], cur.coords[0][1]], 14);
  if (stacked()) $('#wrap').scrollIntoView({ behavior: 'smooth' });
  let last = performance.now(), uiAt = 0, simMin = 0;
  const step = now => {
    const dt = Math.min((now - last) / 1000, .1); last = now; const dm = dt * +$('#spd').value; simMin += dm;
    drive.t += dm * 60000; drive.km += cur.gkm / cur.dur * factorAt(drive.km) * dm;
    if ($('#simInc').checked && simMin > drive.nextSpawn) { drive.nextSpawn += 30;
      if (Math.random() < 0.12) { const km = drive.km + 15 + Math.random() * 45; if (km < cur.gkm - 5) {
        const h = { type: 'accident', km, ...pointAt(cur, km), sim: true, title: 'อุบัติเหตุ', desc: 'เกิดเหตุใหม่ระหว่างเดินทาง การจราจรติดขัด', penalty: 25, factor: 0.45 };
        curHz = [...curHz, h].sort((a, b) => a.km - b.km); drawHazards(); toast(`เกิดอุบัติเหตุใหม่ข้างหน้า อีก ${fmtKm(km - drive.km)} (จำลอง)`, 'var(--danger)'); } } }
    if (drive.km >= cur.gkm) { drive.km = cur.gkm; placeCar(drive.km); arrive(); return; }
    placeCar(drive.km); updateBanner(drive.km);
    if (now - uiAt > 500) { uiAt = now; renderTrip(drive.km, drive.t); renderAlerts(drive.km); $('#clock').textContent = 'เวลาจำลอง ' + fmtDayClock(drive.t); }
    drive.raf = requestAnimationFrame(step);
  };
  drive.raf = requestAnimationFrame(step);
};
function nearestOnRoute(lat, lon) {
  const me = { lat, lon }; let best = { d: Infinity, i: 0 };
  const from = drive.mode === 'nav' && drive.idx != null ? Math.max(0, drive.idx - 200) : 0, to = drive.mode === 'nav' && drive.idx != null ? Math.min(cur.coords.length, drive.idx + 2000) : cur.coords.length;
  for (let i = from; i < to; i++) { const d = hav(me, { lat: cur.coords[i][0], lon: cur.coords[i][1] }); if (d < best.d) best = { d, i }; }
  return best;
}
$('#navBtn').onclick = () => {
  if (drive.mode === 'nav') { stopDrive(); return; }
  if (!cur) return;
  if (!navigator.geolocation || !window.isSecureContext) { toast('การนำทางด้วย GPS ต้องเปิดเว็บผ่าน https', 'var(--danger)'); return; }
  stopDrive(); Object.assign(drive, { mode: 'nav', said: new Set(), off: 0, idx: null, accWarned: false });
  carMarker?.remove(); carMarker = null;
  $('#navBtn').textContent = 'หยุดนำทาง'; $('#navBtn').className = 'btn stop'; setFollow(true); keepAwake();
  if (stacked()) $('#wrap').scrollIntoView({ behavior: 'smooth' });
  toast('เริ่มนำทาง ระบบจะเตือนเมื่อใกล้จุดเสี่ยง'); speak('เริ่มนำทาง');
  live.zoomed = false; ensureWatch();
  if (live.last) navFix(live.last);
};
function navFix(p) {
  const n = nearestOnRoute(p.lat, p.lon); drive.idx = n.i; const km = cur.cum[n.i], acc = p.acc / 1000;
  if (!drive.accWarned && acc > 1) { drive.accWarned = true; warnAccuracy(p.acc); }
  if (n.d > Math.max(0.35, acc * 1.5)) drive.off++; else drive.off = 0;
  if (drive.off >= 3 && Date.now() - drive.lastReroute > 45000) {
    drive.lastReroute = Date.now(); drive.off = 0; toast('ออกนอกเส้นทาง กำลังหาเส้นทางใหม่', 'var(--warn)'); speak('ออกนอกเส้นทาง กำลังหาเส้นทางใหม่');
    setPlace('from', { lat: p.lat, lon: p.lon, name: 'ตำแหน่งปัจจุบัน' }, true); findRoute(true).then(() => { drive.idx = null; }); return;
  }
  doneLine?.setLatLngs(cur.coords.slice(0, n.i + 1));
  updateBanner(km); renderTrip(km); renderAlerts(km);
  if (cur.gkm - km < 0.15) arrive();
}

/* ---------- live location: one GPS watch shared by "my location" and navigation ---------- */
const live = { on: false, watch: null, last: null, hd: null, anim: 0, circle: null, zoomed: false, errAt: 0 };
const speedo = $('#speedo');
function ensureWatch() {
  const need = live.on || drive.mode === 'nav';
  if (need && live.watch == null) {
    if (!navigator.geolocation || !window.isSecureContext) { toast('การติดตามตำแหน่งต้องเปิดเว็บผ่าน https', 'var(--danger)'); return; }
    live.watch = navigator.geolocation.watchPosition(onFix, onGeoErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    speedo.hidden = false; speedo.textContent = 'กำลังรอสัญญาณ GPS…';
  }
  if (!need && live.watch != null) {
    navigator.geolocation.clearWatch(live.watch); live.watch = null; speedo.hidden = true;
    live.circle?.remove(); live.circle = null;
  }
}
function onGeoErr(e) {
  if (e.code === 1) { toast('ยังไม่ได้อนุญาตให้ใช้ตำแหน่ง เปิดได้ที่ การตั้งค่า → ความเป็นส่วนตัว → บริการหาตำแหน่ง → เว็บไซต์ Safari', 'var(--danger)');
    live.on = false; $('#locate').setAttribute('aria-pressed', 'false'); if (drive.mode === 'nav') stopDrive(); ensureWatch(); return; }
  speedo.textContent = 'สัญญาณ GPS อ่อน กำลังค้นหา…';
  if (Date.now() - live.errAt > 60000) { live.errAt = Date.now(); toast('สัญญาณ GPS ขาดหาย ระบบยังค้นหาต่อ', 'var(--warn)'); }
}
function onFix(pos) {
  const c = pos.coords, p = { lat: c.latitude, lon: c.longitude, acc: c.accuracy || 0, t: pos.timestamp || Date.now() }, prev = live.last;
  // ignore a coarse fix right after a precise one (Wi-Fi fallback jumps)
  if (prev && p.acc > 150 && prev.acc < 50 && p.t - prev.t < 10000) return;
  const moved = prev ? hav(prev, p) : 0, dtH = prev ? Math.max((p.t - prev.t) / 3600000, 1 / 3600) : 0;
  let kmh = c.speed != null && c.speed >= 0 ? c.speed * 3.6 : prev ? moved / dtH : 0;
  const jump = kmh > 250; if (jump) kmh = 0; // a GPS jump, not real movement
  if (c.heading != null && !isNaN(c.heading) && kmh > 4) live.hd = c.heading;
  else if (prev && moved > 0.015 && !jump) live.hd = bearing(prev, p);
  live.last = p;
  showMe(prev || p); animateMe(p);
  const el = meMarker.getElement()?.querySelector('.me');
  if (el) { el.classList.toggle('dir', live.hd != null); el.style.setProperty('--hd', (live.hd || 0) + 'deg'); }
  if (!live.circle) live.circle = L.circle([p.lat, p.lon], { radius: p.acc, color: '#2b72d6', weight: 1, fillOpacity: .1, interactive: false }).addTo(map);
  else live.circle.setLatLng([p.lat, p.lon]).setRadius(p.acc);
  speedo.textContent = `${jump ? '–' : Math.round(kmh)} กม./ชม. · แม่นยำ ±${p.acc < 1000 ? Math.round(p.acc) + ' ม.' : (p.acc / 1000).toFixed(1) + ' กม.'}`;
  if (!live.zoomed) { live.zoomed = true; map.setView([p.lat, p.lon], drive.mode === 'nav' ? 17 : 16); if (live.on) warnAccuracy(p.acc); }
  if (drive.mode === 'nav') navFix(p);
}
// glide the marker between fixes so it moves like a car instead of jumping
function animateMe(p) {
  cancelAnimationFrame(live.anim);
  const a = meMarker.getLatLng(), t0 = performance.now(), dur = 900;
  const frame = now => {
    const k = Math.min(1, (now - t0) / dur), ll = [a.lat + (p.lat - a.lat) * k, a.lng + (p.lon - a.lng) * k];
    meMarker.setLatLng(ll);
    if (follow && (live.on || drive.mode === 'nav')) map.panTo(ll, { animate: false });
    if (k < 1) live.anim = requestAnimationFrame(frame);
  };
  live.anim = requestAnimationFrame(frame);
}

/* ---------- stays near me: real places from OpenStreetMap, tonight's prices on booking sites ---------- */
const nearLayer = L.layerGroup().addTo(map);
const ymd = t => new Date(t + H7).toISOString().slice(0, 10);
// before 6 a.m. tonight's stay started yesterday
const defaultCheckIn = () => ymd(Date.now() - (new Date(Date.now() + H7).getUTCHours() < 6 ? 864e5 : 0));
const ciIn = $('#ciDate'), adIn = $('#adults');
ciIn.value = defaultCheckIn(); ciIn.min = ymd(Date.now() - 864e5);
const stayOpt = store.get('thai-road-stayopt'); if (stayOpt?.adults) adIn.value = stayOpt.adults;
adIn.onchange = () => { store.set('thai-road-stayopt', { adults: adIn.value }); if (nearPt) findNearStays(nearPt, nearLabel); };
const KIND = { hotel: 'โรงแรม', guest_house: 'เกสต์เฮาส์', motel: 'โมเต็ล', hostel: 'โฮสเทล', apartment: 'ห้องพักรายวัน', chalet: 'บ้านพัก/รีสอร์ต' };
function priceLinks(lat, lon, name) {
  const a = ciIn.value || defaultCheckIn(), b = ymd(Date.parse(a + 'T12:00:00+07:00') + 864e5), n = +adIn.value || 2, q = name ? encodeURIComponent(name) : '';
  return {
    agoda: `https://www.agoda.com/th-th/search?${q ? 'textToSearch=' + q + '&' : ''}latitude=${lat}&longitude=${lon}&checkIn=${a}&checkOut=${b}&los=1&rooms=1&adults=${n}&children=0&sort=priceLowToHigh`,
    booking: `https://www.booking.com/searchresults.th.html?${q ? 'ss=' + q + '&' : ''}latitude=${lat}&longitude=${lon}&checkin=${a}&checkout=${b}&group_adults=${n}&no_rooms=1&group_children=0&order=price`,
    gmaps: name ? `https://www.google.com/maps/search/?api=1&query=${q}%20${lat},${lon}` : `https://www.google.com/maps/search/${encodeURIComponent('ที่พัก')}/@${lat},${lon},14z`
  };
}
async function overpass(q) {
  const body = 'data=' + encodeURIComponent(q), opt = { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
  try { return await getJSON('https://overpass-api.de/api/interpreter', opt, 25000); }
  catch (e) { return await getJSON('https://overpass.kumi.systems/api/interpreter', opt, 25000); }
}
let nearItems = [], nearPt = null, nearLabel = '';
async function findNearStays(pt, label) {
  nearPt = pt; nearLabel = label;
  const btn = $('#nearBtn'); btn.disabled = true; btn.textContent = 'กำลังค้นหา…';
  $('#h-near').scrollIntoView({ behavior: 'smooth', block: 'start' });
  let items = [], radius = 5;
  try {
    for (radius of [5, 15]) {
      const r = await overpass(`[out:json][timeout:25];nwr["tourism"~"^(hotel|guest_house|motel|hostel|apartment|chalet)$"]["name"](around:${radius * 1000},${pt.lat},${pt.lon});out center 80;`);
      items = (r.elements || []).map(e => { const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        return { name: t['name:th'] || t.name, lat, lon, kind: KIND[t.tourism] || 'ที่พัก', stars: t.stars, phone: t.phone || t['contact:phone'] || t['contact:mobile'],
          price: t.price || t.charge || t['price:room'], web: t.website || t['contact:website'] }; })
        .filter(h => h.lat != null).map(h => ({ ...h, d: hav(pt, h) })).sort((a, b) => a.d - b.d).slice(0, 20);
      if (items.length >= 5) break;
    }
  } catch (e) { btn.disabled = false; btn.textContent = 'ค้นที่พักรอบตัวฉัน'; toast('ค้นข้อมูลที่พักไม่สำเร็จ ลองอีกครั้ง หรือกดลิงก์ Agoda / Booking ด้านล่าง', 'var(--danger)'); items = []; }
  btn.disabled = false; btn.textContent = 'ค้นใหม่จากตำแหน่งตอนนี้';
  nearItems = items; nearLayer.clearLayers();
  const area = priceLinks(pt.lat.toFixed(5), pt.lon.toFixed(5));
  $('#nearNote').textContent = `รอบ${label} ${items.length} แห่ง ในรัศมี ${radius} กม.`;
  $('#nearArea').innerHTML = `<div class="area"><span>ดูราคาคืนนี้ทุกที่พักรอบ${esc(label)} เรียงจากถูกสุด</span>
    <span><a href="${area.agoda}" target="_blank" rel="noopener">Agoda</a> · <a href="${area.booking}" target="_blank" rel="noopener">Booking.com</a> · <a href="${area.gmaps}" target="_blank" rel="noopener">Google Maps</a></span></div>`;
  $('#nearList').innerHTML = items.length ? items.map((h, i) => { const L2 = priceLinks(h.lat, h.lon, h.name);
    return `<div class="stay"><span class="ic" style="--c:var(--accent)">${icon('bed')}</span><span>
      <b>${esc(h.name)}</b><span class="km">${esc(h.kind)}${h.stars ? ' · ' + esc(h.stars) + ' ดาว' : ''} · ห่าง ${fmtKm(h.d)}</span>
      ${h.price ? `<p>ราคาที่บันทึกไว้ใน OpenStreetMap: ${esc(h.price)} (อาจไม่เป็นปัจจุบัน)</p>` : ''}
      ${h.phone ? `<p>โทร <a href="tel:${esc(h.phone.split(/[;,]/)[0].replace(/\s/g, ''))}">${esc(h.phone.split(/[;,]/)[0])}</a></p>` : ''}
      <p class="links">ราคาคืนนี้: <a href="${L2.agoda}" target="_blank" rel="noopener">Agoda</a> · <a href="${L2.booking}" target="_blank" rel="noopener">Booking.com</a> · <a href="${L2.gmaps}" target="_blank" rel="noopener">Google Maps</a>${h.web ? ` · <a href="${esc(h.web)}" target="_blank" rel="noopener">เว็บที่พัก</a>` : ''} · <button class="linkbtn" data-near-show="${i}">ดูบนแผนที่</button></p>
    </span></div>`; }).join('')
    : '<div class="empty">ยังไม่มีที่พักในบริเวณนี้บน OpenStreetMap ลองกดลิงก์ Agoda / Booking ด้านบน ซึ่งมีรายการมากกว่า</div>';
  $('#nearList').querySelectorAll('[data-near-show]').forEach(b => b.onclick = () => { const h = nearItems[+b.dataset.nearShow]; setFollow(false); map.setView([h.lat, h.lon], 16); h.marker.openPopup(); if (stacked()) $('#wrap').scrollIntoView({ behavior: 'smooth' }); });
  items.forEach(h => { const L2 = priceLinks(h.lat, h.lon, h.name);
    h.marker = L.marker([h.lat, h.lon], { icon: divIcon(`<div class="mk" style="--c:var(--accent);width:26px;height:26px">${icon('bed', 15)}</div>`, 26), title: h.name })
      .bindPopup(`<h3>${esc(h.name)}</h3><p>${esc(h.kind)} · ห่าง ${fmtKm(h.d)}${h.phone ? ` · <a href="tel:${esc(h.phone.split(/[;,]/)[0].replace(/\s/g, ''))}">โทร</a>` : ''}</p><p>ราคาคืนนี้: <a href="${L2.agoda}" target="_blank" rel="noopener">Agoda</a> · <a href="${L2.booking}" target="_blank" rel="noopener">Booking</a></p>`).addTo(nearLayer); });
  if (items.length) { setFollow(false); map.fitBounds(L.latLngBounds([[pt.lat, pt.lon], ...items.slice(0, 10).map(h => [h.lat, h.lon])]), { padding: [50, 50], maxZoom: 16 }); }
}
async function nearMe() {
  let pt = live.last;
  if (!pt) { try { pt = await getGPS(); showMe(pt); warnAccuracy(pt.acc); } catch (e) { toast(e.message + ' หรือแตะจุดบนแผนที่แล้วเลือก "ที่พักใกล้จุดนี้"', 'var(--danger)'); return; } }
  findNearStays(pt, 'ตัวคุณ');
}
$('#nearBtn').onclick = nearMe;
$('#nearStay').onclick = nearMe;
ciIn.onchange = () => { if (nearPt) findNearStays(nearPt, nearLabel); };

/* ---------- controls ---------- */
$('#findBtn').onclick = () => findRoute();
$('#avoid').onchange = () => { if (routes.length && !drive.mode) { const pick = $('#avoid').checked ? routes.reduce((a, b) => b.score < a.score ? b : a) : routes.reduce((a, b) => b.dur < a.dur ? b : a); selectRoute(pick); } };
$('#simInc').onchange = () => { if (!routes.length) return; routes.forEach(r => { r.hz = hazardsFor(r, T0); r.score = score(r, r.hz); }); selectRoute(cur); };
$('#locate').onclick = () => {
  live.on = !live.on; $('#locate').setAttribute('aria-pressed', live.on);
  if (live.on) { setFollow(true); live.zoomed = false; if (live.last) map.setView([live.last.lat, live.last.lon], 16); toast('ติดตามตำแหน่งสด แตะอีกครั้งเพื่อหยุด'); }
  ensureWatch();
};
let radar = null;
$('#tRadar').onclick = async () => {
  const b = $('#tRadar');
  if (radar) { radar.remove(); radar = null; b.setAttribute('aria-pressed', 'false'); return; }
  try { const r = await getJSON('https://api.rainviewer.com/public/weather-maps.json'); const f = r.radar.past[r.radar.past.length - 1];
    radar = L.tileLayer(`${r.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: .6, maxNativeZoom: 7, maxZoom: 19, attribution: 'เรดาร์ฝน © RainViewer' }).addTo(map);
    b.setAttribute('aria-pressed', 'true'); toast(`เรดาร์ฝนล่าสุด ${fmtClock(f.time * 1000)}`); }
  catch (e) { toast('โหลดเรดาร์ฝนไม่ได้ในขณะนี้', 'var(--danger)'); }
};
setInterval(() => { if (drive.mode !== 'sim') $('#clock').textContent = fmtDayClock(Date.now()); }, 1000 * 20);
$('#clock').textContent = fmtDayClock(Date.now());

/* ---------- start ---------- */
renderHome();
const saved = store.get('thai-road-places');
if (saved?.from) setPlace('from', saved.from, true); else if (home) setPlace('from', { ...home, name: 'บ้านของฉัน' }, true);
if (saved?.to) setPlace('to', saved.to, true);
if (P.from && P.to) findRoute();
else if (home) map.setView([home.lat, home.lon], 11);
})();
