/* Maps of the Ideaverse: the map itself. Ported from the standalone HTML map (index.html) with its logic intact:
   the page's code runs inside the plugin's view, scoped to `root`, with Obsidian handling storage, events and notes. */
import { sanitizeHTMLToDom } from "obsidian";

export const VIEWS_ON = ["emergence", "spacetime", "gravity", "stars", "sense"];   // Chord and ARC stay in the lab for now

export function mountMap(root, D, host) {
"use strict";
const doc = root.ownerDocument, win = doc.defaultView;
const $ = s => root.querySelector(s);
const dbg = host.debug || {};
let dead = false;
const frames = new Set();
const RAF = f => { const id = win.requestAnimationFrame(t => { frames.delete(id); if (!dead) f(t); }); frames.add(id); return id; };
const on = (target, type, fn, opts) => host.registerDomEvent(target, type, fn, opts);
const onKey = fn => on(doc, "keydown", e => { if (!dead && host.isActive() && (!doc.activeElement || doc.activeElement === doc.body || root.contains(doc.activeElement))) fn(e); });
// HTML built from note titles and numbers goes through Obsidian's sanitizer (titles are also escaped with esc())
const html = el => ({ set v(h) { el.empty(); el.append(sanitizeHTMLToDom(h)); } });
const PACKS0 = (D.settings && D.settings.packs) || "";
const cv = $("#cv"), ctx = cv.getContext("2d");

const N = D.nodes, E = D.edges, n = N.length;
const LEVELS = [
  {lv:5, name:"Home & hubs"}, {lv:4, name:"Maps of maps"}, {lv:3, name:"Maps of content"},
  {lv:2, name:"Linked notes"}, {lv:1, name:"Unlinked notes"}];
const LV = Object.fromEntries(LEVELS.map(l => [l.lv, l]));
const ACE = ["+","Atlas","Calendar","Efforts","x"];   // x sits at the far right
// the top-level folders the scan found (ACE order first, any others A–Z); notes at the vault's top level always show
const FOLD = (() => { const seen = new Set(N.filter(d => !d.archive && d.ace && d.ace !== "(root)").map(d => d.ace));
  return [...ACE.filter(a => seen.has(a)), ...[...seen].filter(a => !ACE.includes(a)).sort((a,b) => a.localeCompare(b))]; })();
// "+" and "x" are shown as the symbol, large, with their name small in parentheses
const ACE_SYM = {"+":["+","(Inbox)"], "x":["x","(Xtras)"]};
const GRAD = {5:["#f7c948","#e8538a"], 4:["#8a5bd6","#3466d6"], 3:["#4fc3ef","#5b2e91"]};

// ---------- adjacency ----------
const out = Array.from({length:n}, () => []), inn = Array.from({length:n}, () => []);
for (const [a,b] of E) { out[a].push(b); inn[b].push(a); }
const REL = new Set(); for (const [a,b,t] of E) if (t === 4) { REL.add(a*n + b); REL.add(b*n + a); }   // links named in a "related" property: drawn purple, up or down
// a link's kind as written in the ACTIVE note: key a*n + b is the link from a to b, as a wrote it (its up, related or another property);
// a link only the other note wrote (for example, a note whose up names this one) has no entry here and is placed by emergence
const EKIND = new Map(); for (const [a,b,t] of E) { const key = a*n + b, o = EKIND.get(key); if (o == null || (t === 1 || t === 4 || t === 5) && !(o === 1 || o === 4)) EKIND.set(key, t); }
// Link colors (Display → Link colors): "dir" up/down by level, related purple · "props" every frontmatter link purple · "each" up property yellow, related purple, other properties slate
let linkCol = "dir";   // read from saved settings once they load (below)
function edgeColor(a, b, upward){ const k = EKIND.get(a*n + b);
  if (linkCol === "props" && (k === 1 || k === 4 || k === 5)) return css.rel;
  if (linkCol === "each") { if (k === 1) return css.upp; if (k === 4) return css.rel; if (k === 5) return css.prop; }
  if (linkCol === "dir" && k === 4) return css.rel;   // k is the kind as the active note (a) wrote it
  return upward ? css.up : css.down; }

// ---------- stable pseudo-random per note ----------
function hash(s, seed) { let h = 2166136261 ^ seed; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h>>>0) % 100000) / 100000; }

// ---------- layout (world units) ----------
const WW = 3200, WH = 1800, TOP = 0;
const FR = {5:.10, 4:.14, 3:.19, 2:.285, 1:.285};     // band heights
const GAP_Y = 18;
const bandY = {}; { let y = TOP; for (const L of LEVELS) { const h = WH*FR[L.lv]; bandY[L.lv] = {y0:y, y1:y+h-GAP_Y}; y += h; } }

// ---------- what's visible: the x/z archive layer and the year range ----------
const DAY = 864e5, YEAR = 365.2425*DAY;
const T1 = (Date.parse((D.generated||"").slice(0,10)) || Date.now()) + 45*DAY;
const NOW_Y = new Date(T1).getUTCFullYear();
const TV = new Float64Array(n); N.forEach((d,i) => TV[i] = /^\d{4}-\d{2}-\d{2}$/.test(d.date||"") ? Date.parse(d.date) : NaN);
const ARCH = Uint8Array.from(N, d => d.archive ? 1 : 0), hasArch = ARCH.some(v => v);
let minYear = NOW_Y; for (let i=0;i<n;i++) if (!isNaN(TV[i])) minYear = Math.min(minYear, new Date(TV[i]).getUTCFullYear());
// the sliders start at the first year with a real body of notes (10+), so a stray 1984 note doesn't waste most of the track; older notes sit in "Before"
const SLMIN = (() => { const c = {}; for (let i=0;i<n;i++) if (!isNaN(TV[i])) { const y = new Date(TV[i]).getUTCFullYear(); c[y] = (c[y]||0) + 1; }
  for (let y = minYear; y <= NOW_Y; y++) if ((c[y]||0) >= 10) return y; return minYear; })();
const pref = (key, v) => { const s = host.store.get(key); return s === undefined ? v : s; };
const save = (key, v) => host.store.set(key, v);
let showArch = !!pref("iv-arch", true), fromY = +pref("iv-from", 2016);
{ // Full scale from was retired (Oct 11). If one was set, start the timeline there instead: same recent years, older ones in "Before".
  if (!pref("iv-mig-full", false)) { const oldFull = +pref("iv-full", 2016);   // 2016 was the old default
    if (oldFull > fromY && oldFull <= NOW_Y) { fromY = oldFull; save("iv-from", fromY); }
    host.store.set("iv-full", undefined); save("iv-mig-full", true); } }
fromY = Math.max(SLMIN, Math.min(NOW_Y, fromY));
let fullY = fromY;   // kept equal to the start: every shown year at full scale
let subOff = new Set(Array.isArray(pref("iv-subsoff", null)) ? pref("iv-subsoff", null) : []);   // subfolders switched off inside a shown folder (the buried › in Folders)
let folders = pref("iv-folders", null); if (!Array.isArray(folders)) folders = [...FOLD]; folders = folders.filter(f => FOLD.includes(f));
let colls = pref("iv-coll", []); if (!Array.isArray(colls)) colls = colls ? [String(colls).toLowerCase()] : [];
let collMode = pref("iv-collmode", "any") === "all" ? "all" : "any";
N.forEach(d => d._cl = (d.collections || []).map(c => c.toLowerCase()));
const collOK = d => !colls.length || (collMode === "all" ? colls.every(c => d._cl.includes(c)) : colls.some(c => d._cl.includes(c)));
const vis = new Uint8Array(n);
// focus: show one note and the notes linked to it (out, in or both; 1 or 2 steps)
let focus = -1, fDepth = 1, fDir = "both", fset = null;
let rec = null;   // a tour being recorded: {notes:[paths], start:{view state}}
function computeFocus(){
  if (focus < 0) { fset = null; return; }
  fset = new Uint8Array(n); fset[focus] = 1; let front = [focus];
  for (let s = 0; s < fDepth; s++) { const next = [];
    for (const i of front) { const nb = fDir === "out" ? out[i] : fDir === "in" ? inn[i] : out[i].concat(inn[i]);
      for (const j of nb) if (!fset[j]) { fset[j] = 1; next.push(j); } }
    front = next; }
}

// ---- folder tree for the buried › drill-down: any depth. subOff holds folder paths switched off (a whole folder and
// everything under it) and "<folder>/." for the notes sitting directly in a folder that also has subfolders.
const DIRN = new Array(n);   // each note's folder path
const FT = new Map();        // folder path → {path, name, kids:[paths], direct, total}
for (let i=0;i<n;i++) { const d = N[i]; if (d.archive || !FOLD.includes(d.ace)) { DIRN[i] = null; continue; }
  const dir = d.path.includes("/") ? d.path.slice(0, d.path.lastIndexOf("/")) : d.ace; DIRN[i] = dir;
  const parts = dir.split("/"); let p = "";
  for (let j = 0; j < parts.length; j++) { const parent = p; p = p ? p + "/" + parts[j] : parts[j];
    if (!FT.has(p)) { FT.set(p, {path: p, name: parts[j], kids: [], direct: 0, total: 0}); if (parent) FT.get(parent).kids.push(p); }
    FT.get(p).total++; }
  FT.get(dir).direct++; }
for (const f of FT.values()) f.kids.sort((a, b) => FT.get(a).name.localeCompare(FT.get(b).name, undefined, {sensitivity: "base", numeric: true}));   // A–Z
const subHid = new Uint8Array(n);
function subCompute(){ subHid.fill(0); if (!subOff.size) return;
  for (let i=0;i<n;i++) { const dir = DIRN[i]; if (!dir) continue;
    if (subOff.has(dir + "/.")) { subHid[i] = 1; continue; }
    let p = dir; while (p) { if (subOff.has(p)) { subHid[i] = 1; break; } const k_ = p.lastIndexOf("/"); p = k_ > 0 ? p.slice(0, k_) : ""; } } }
// old saves kept a subfolder key equal to the folder itself for its loose notes
for (const k_ of [...subOff]) if (FOLD.includes(k_)) { subOff.delete(k_); subOff.add(k_ + "/."); }
// learning packs (x/Packs) are on the map but off by default: tick them in the drill-down when you want one
const PACKS = PACKS0, defSubs = () => new Set(FT.has(PACKS) ? [PACKS] : []), isDefSubs = () => subOff.size === defSubs().size && [...defSubs()].every(k_ => subOff.has(k_));
if (!pref("iv-packs1", false)) { if (FT.has(PACKS)) subOff.add(PACKS); save("iv-packs1", true); save("iv-subsoff", [...subOff]); }
subCompute();

// every filter except focus: archive, folders, collection (years no longer hide notes: older ones gather in Time's "Before" strip)
function baseOK(i){ const d = N[i];
  return (!ARCH[i] || showArch)
    && (folders.includes(d.ace) || !FOLD.includes(d.ace))
    && !subHid[i]
    && collOK(d); }
const visBase = baseOK;
function computeVis(){ const fs = new Set(folders);
  for (let i=0;i<n;i++) { const d = N[i];
    vis[i] = ((!ARCH[i] || showArch)
      && (fs.has(d.ace) || !FOLD.includes(d.ace))    // vault-root notes always show
      && !subHid[i]
      && collOK(d)
      && (!fset || fset[i])) ? 1 : 0; }
  if (focus >= 0) vis[focus] = 1; }

const XA = new Float32Array(n), XT = new Float32Array(n), X = new Float32Array(n), Y = new Float32Array(n), R = new Float32Array(n);

// ---------- ACE layout: columns sized by sqrt(count); subfolders split each column per level band ----------
let aceArc = null;   // Gravity's ACE clock, rebuilt when the columns change
let cols = [], lanes = pref("iv-lanes", "spread"), subOrder = pref("iv-suborder", "az");
const subCmp = (p,q) => subOrder === "az" ? p[0].split("/").pop().localeCompare(q[0].split("/").pop(), undefined, {sensitivity:"base"}) : q[1].length - p[1].length;
function layoutACE(){
  const AC = FOLD.filter(a => folders.includes(a));   // ACE folders first, then any others A–Z
  const groups = {}; for (const a of AC) groups[a] = {};
  for (let i=0;i<n;i++) { if (!vis[i]) continue; const d = N[i];
    if (!groups[d.ace]) { XA[i] = WW/2 + (hash(d.path,13)-.5)*40; continue; }   // vault-root notes (Home Base) sit centered
    (groups[d.ace][d.sub] ||= []).push(i); }
  for (let q = AC.length-1; q >= 0; q--) if (!Object.keys(groups[AC[q]]).length) { delete groups[AC[q]]; AC.splice(q, 1); }   // drop columns a filter left empty
  const GAP_X = 60, MINW = 140;
  const weights = AC.map(a => Math.max(MINW, Math.sqrt(Object.values(groups[a]).reduce((s,g)=>s+g.length,0))*24));
  const scale = (WW - GAP_X*Math.max(AC.length-1,0)) / Math.max(weights.reduce((s,w)=>s+w,0), 1);
  let x = 0; cols = [];
  AC.forEach((a, kk) => {
    const w = weights[kk]*scale, col = {ace:a, x0:x, x1:x+w, bands:{}, count:0};
    // fixed lanes: every band uses the same subfolder strips, sized by the whole column
    const allSubs = Object.entries(groups[a]).sort(subCmp), laneW = {};
    { const sw = allSubs.map(([,ids]) => Math.sqrt(ids.length)+1), tot = sw.reduce((s,v)=>s+v,0); let sx0 = x;
      allSubs.forEach(([name], j) => { laneW[name] = [sx0, sx0 + w*sw[j]/tot]; sx0 += w*sw[j]/tot; }); }
    for (const L of LEVELS) {
      const per = {};
      for (const [name, ids] of allSubs) { const m = ids.filter(i => N[i].level === L.lv); if (m.length || lanes === "fixed") per[name] = m; }
      const subs = Object.entries(per).sort(subCmp);
      const sw = subs.map(([,ids]) => Math.sqrt(ids.length)+1), tot = sw.reduce((s,v)=>s+v,0);
      let sx0 = x; col.bands[L.lv] = [];
      (lanes === "fixed" ? allSubs.map(([name]) => [name, per[name]]) : subs).forEach(([name, ids], j) => {
        const ww = lanes === "fixed" ? laneW[name][1] - laneW[name][0] : w*sw[j]/tot;
        if (lanes === "fixed") sx0 = laneW[name][0];
        col.bands[L.lv].push({name, x0:sx0, x1:sx0+ww, n:ids.length});
        const pad = Math.min(6, ww*.1);
        for (const i of ids) XA[i] = sx0 + pad + hash(N[i].path, 13) * (ww - 2*pad);
        sx0 += ww;
      });
    }
    col.count = Object.values(groups[a]).reduce((s,g)=>s+g.length,0);
    cols.push(col); x += w + GAP_X;
  });
  aceArc = null;
}

// ---------- live scoring: weights and cut-offs (defaults match scanner.py exactly) ----------
const DEF = { w: {in: 1, out: .6, up: .3, both: .8, coll: 0}, top: 25, l4: 6.5, l3: 5.5 };
{ const s = D.settings || {}; if (s.weights) DEF.w = {in: s.weights.body_in, out: s.weights.body_out, up: s.weights.up_in, both: s.weights.both, coll: s.weights.coll_in};
  if (s.l5_top) DEF.top = s.l5_top; if (s.promote_l4) DEF.l4 = s.promote_l4; if (s.promote_l3) DEF.l3 = s.promote_l3; }
let S = JSON.parse(JSON.stringify(DEF)); { const sv = pref("iv-score", null); if (sv && sv.w) { delete sv.w.reach; S = Object.assign(S, sv, {w: Object.assign({}, DEF.w, sv.w)}); } }   // reach was tried and removed (Oct 11)
const L4_MAPS = (D.settings && D.settings.l4_map_links) || 3;
const r3 = v => Math.round(v*1000)/1000;
function rescore(){
  const w = S.w;
  for (const d of N) { if (!d.s) continue;
    const [a, b, u, c] = d.s, bi = Math.log1p(a), bo = Math.log1p(b);
    d.score = r3(d.archive ? w.in*bi + w.out*bo + w.both*Math.sqrt(bi*bo)
                           : w.in*bi + w.out*bo + w.up*Math.log1p(u) + w.both*Math.sqrt(bi*bo) + w.coll*Math.log1p(c)); }
  const top = new Set(N.map((d,i) => i).filter(i => !N[i].archive && N[i].s && !(PACKS0 && N[i].path.startsWith(PACKS0 + "/"))).sort((a,b) => N[b].score - N[a].score).slice(0, S.top));
  N.forEach((d,i) => { if (!d.s) return;
    const mm = d.is_map && d.maps_linked >= L4_MAPS;
    let lv, why;
    if (!d.archive && (d.home || top.has(i))) { lv = 5; why = d.home ? "home note" : "top score"; }
    else if (mm || d.score >= S.l4) { lv = 4; why = mm ? "map linking maps" : "highly linked"; }
    else if (d.is_map || d.score >= S.l3) { lv = 3; why = d.is_map ? "higher-order note" : "highly linked"; }
    else if (d.lk) { lv = 2; why = "linked"; } else { lv = 1; why = "no links"; }
    d.level = lv; d.why = why; });
  // score rank, cached: ties share a rank; archive notes rank among themselves
  for (const ar of [false, true]) { const ids = N.map((d,i) => i).filter(i => !!N[i].archive === ar && N[i].s).sort((a,b) => N[b].score - N[a].score);
    let r = 0, prev = null; ids.forEach((i, k) => { if (N[i].score !== prev) { r = k + 1; prev = N[i].score; } RANK[i] = r; }); }
}
const RANK = new Int32Array(n);
// ---- time-lapse growth (Emergence, Gravity): what a note's links, score and level were as of a date ----
// Like Obsidian's graph time-lapse, the vault keeps no history of when a link was written, so a link counts from the
// day both of its notes exist (the newer note's created date). Each count the scanner gave is scaled by the share of
// that note's linked notes that exist yet, so at today's date every note lands exactly where it is now.
const EIN = Array.from({length:n}, () => []), EOUT = Array.from({length:n}, () => []);
for (const [a,b,t] of E) { EOUT[a].push(b, t); EIN[b].push(a, t); }
const LVUP = new Float64Array(n), LVPREV = new Int8Array(n);   // when a note last moved up a level (ms), and from which level
let GROWN = false;
function growAt(t){
  const w = S.w, alive = i => !(TV[i] > t);   // undated notes count as always there
  const sc = new Float64Array(n), lk = new Uint8Array(n);
  for (let i=0;i<n;i++) { const d = N[i]; if (!d.s || !alive(i)) continue;
    let bi = 0, bt = 0, ui = 0, ut = 0, ai = 0, at = 0, bo = 0, bot = 0;
    for (let q = 0; q < EIN[i].length; q += 2) { const j = EIN[i][q], k_ = EIN[i][q+1], on = alive(j);
      at++; if (on) ai++; if (k_ === 1 || k_ === 4) { ut++; if (on) ui++; } if (k_ !== 1 && k_ !== 5) { bt++; if (on) bi++; } }
    for (let q = 0; q < EOUT[i].length; q += 2) { const j = EOUT[i][q], k_ = EOUT[i][q+1]; if (k_ === 1 || k_ === 5) continue; bot++; if (alive(j)) bo++; }
    const f = (num, tot) => tot ? num/tot : 1;
    const a = Math.round(d.s[0]*f(bi, bt)), b = Math.round(d.s[1]*f(bo, bot)), u = Math.round(d.s[2]*f(ui, ut)), c = Math.round(d.s[3]*f(ai, at));
    const ln_a = Math.log1p(a), ln_b = Math.log1p(b);
    sc[i] = r3(d.archive ? w.in*ln_a + w.out*ln_b + w.both*Math.sqrt(ln_a*ln_b) : w.in*ln_a + w.out*ln_b + w.up*Math.log1p(u) + w.both*Math.sqrt(ln_a*ln_b) + w.coll*Math.log1p(c));
    lk[i] = d.lk && (a + b + u + c > 0 || (!EIN[i].length && !EOUT[i].length)) ? 1 : 0; }
  const pool = N.map((d,i) => i).filter(i => !N[i].archive && N[i].s && !(PACKS0 && N[i].path.startsWith(PACKS0 + "/"))), live = pool.filter(alive);   // "top N" shrinks with the vault: 2017's handful of notes shouldn't all be Level 5
  const top = new Set(live.sort((a,b) => sc[b] - sc[a]).slice(0, Math.max(1, Math.round(S.top*live.length/Math.max(1, pool.length)))));
  const now = performance.now();
  N.forEach((d,i) => { if (!d.s || !alive(i)) return; const mm = d.is_map && d.maps_linked >= L4_MAPS, was = d.level;
    d.score = sc[i];
    d.level = !d.archive && (d.home || top.has(i)) ? 5 : mm || sc[i] >= S.l4 ? 4 : d.is_map || sc[i] >= S.l3 ? 3 : lk[i] ? 2 : 1;
    if (GROWN && d.level > was && TV[i] <= t - 1) { LVUP[i] = now; LVPREV[i] = was; } });
  GROWN = true; layoutY();
}
function ungrow(){ if (!GROWN) return; GROWN = false; LVUP.fill(0); rescore(); layoutY(); }
const YE = new Float32Array(n);                 // emergence Y: level band, then rank within the band
const pct = new Float32Array(n);
function layoutY(){
  const byLv = {}; N.forEach((d,i) => (byLv[d.level + (d.archive ? "a" : "")] ||= []).push(i));
  for (const ids of Object.values(byLv)) { ids.sort((a,b) => N[a].score - N[b].score); const m = ids.length;
    let j = 0; while (j < m) { let e = j; while (e+1 < m && N[ids[e+1]].score === N[ids[j]].score) e++; const v = m > 1 ? ((j+e)/2)/(m-1) : .5; for (let q=j;q<=e;q++) pct[ids[q]] = v; j = e+1; } }
  N.forEach((d,i) => {
    const b = bandY[d.level], h = b.y1 - b.y0, j = hash(d.path, 7);
    YE[i] = d.level === 1 ? b.y0 + 10 + j*(h - 20) : b.y0 + 10 + (1 - pct[i]) * (h - 20) * 0.8 + j * (h - 20) * 0.2;
    R[i] = d.level >= 3 ? 2.2 + d.score*0.75 : d.level === 2 ? 1.5 + d.score*0.22 : 1.3;
  });
}
const scannerLevels = N.map(d => d.level);
rescore();
{ let diff = 0; N.forEach((d,i) => { if (d.level !== scannerLevels[i]) diff++; }); dbg.rescoreDiff = diff; }
layoutY();

// ---------- Time layout: [No date] [Before start] [start → Full scale from, compressed] [Full scale from → today] ----------
const ND = [0,110], COMP = 0.2;     // a compressed year is a fifth of a full-scale year
let X0T = 170, ER = null;           // ER: the "Before <start>" strip, when any note is older than the timeline's start
let TF = 0, TS = 0, UT = 1;
const units = v => v < TS ? (v - TF)/YEAR*COMP : (TS - TF)/YEAR*COMP + (v - TS)/YEAR;
const xTime = v => X0T + units(v)/UT * (WW - X0T);
const dayFull = () => (WW - X0T)/UT/365.2425;   // world width of one day at full scale
function layoutTime(){
  TF = Date.UTC(fromY,0,1); TS = Date.UTC(fullY,0,1);
  let tmin = Infinity; for (let i=0;i<n;i++) if (TV[i] < tmin) tmin = TV[i];
  ER = tmin < TF ? [140, 300] : null; X0T = ER ? 340 : 170;
  UT = Math.max(units(T1), .5);
  const d1 = dayFull();
  for (let i=0;i<n;i++) { const j = hash(N[i].path, 13);
    if (isNaN(TV[i])) XT[i] = ND[0] + 8 + j*(ND[1]-ND[0]-16);
    else if (TV[i] < TF) XT[i] = ER[0] + 8 + Math.sqrt((TV[i] - tmin)/Math.max(TF - tmin, 1))*(ER[1]-ER[0]-16) + (j - .5)*6;   // kept in date order, older to the left
    else XT[i] = xTime(TV[i]) + (j - .5) * d1 * (TV[i] < TS ? COMP : 1) * 3; }   // ±1.5 days, so same-day notes stay a stripe
}

// ---------- property axes: Rank (top-level) and the "More axes" set ----------
const AXES = {
  "p:w":   {name:"Length (words)", get:d => d.p && d.p.w, kind:"log", jit:.006},
  "p:kb":  {name:"Size (KB)", get:d => d.p && d.p.kb, kind:"log", jit:.006},
  "links": {name:"Links (in + out)", get:d => d.body_in + d.body_out, kind:"log", jit:.01},
  "upin":  {name:"Uplinks (notes that link up to it)", get:d => d.up_in, kind:"log", jit:.01}};
const axisHas = m => !!AXES[m] && N.some(d => { const v = AXES[m].get(d); return v != null && isFinite(v); });
const XP = new Float32Array(n), X0P = 170;
let PA = null;   // the active property axis: {ax, umin, umax}
const uOf = (ax, v) => ax.kind === "log" ? Math.log10(v + 1) : ax.kind === "year" && ax.anchor != null && v < ax.anchor ? -1.5*Math.sqrt(ax.anchor - v) : ax.kind === "year" && ax.anchor != null ? v - ax.anchor : v;
const xOfU = u => X0P + (u - PA.umin)/Math.max(PA.umax - PA.umin, 1e-9) * (WW - X0P - 30);
function layoutProp(){
  const ax = AXES[mode]; if (!ax) { PA = null; return; }
  let lo = Infinity, hi = -Infinity; const val = new Float64Array(n).fill(NaN);
  for (let i=0;i<n;i++) { const v = ax.get(N[i]); if (v == null || !isFinite(v)) continue; const u = uOf(ax, +v); val[i] = u; if (vis[i]) { if (u < lo) lo = u; if (u > hi) hi = u; } }
  if (!isFinite(lo)) { lo = 0; hi = 1; } if (hi - lo < 1e-6) { lo -= .5; hi += .5; }
  let miss = 0; for (let i=0;i<n;i++) if (vis[i] && isNaN(val[i])) miss++;
  PA = {ax, umin: lo, umax: hi, miss};
  const perU = (WW - X0P - 30)/Math.max(hi - lo, 1e-9);
  for (let i=0;i<n;i++) { const j = hash(N[i].path, 13);
    if (isNaN(val[i])) XP[i] = ND[0] + 8 + j*(ND[1]-ND[0]-16);
    else XP[i] = xOfU(val[i]) + (j - .5)*2*ax.jit*perU*(ax.kind === "year" && ax.anchor != null && val[i] < 0 ? .3 : 1); }
}
const yrLabel = v => v < 0 ? `${-v} BC` : String(v);
function propTicks(){   // [{u, label, major}]
  const {ax, umin, umax} = PA, out = [];
  if (ax.kind === "log") { [[0,"0"],[1,"10"],[2,"100"],[3,"1k"],[4,"10k"],[5,"100k"]].forEach(([u,l]) => { if (u >= umin - .01 && u <= umax + .01) out.push({u, label:l, major:true}); }); return out; }
  if (ax.kind === "lin") { for (let v = Math.ceil(umin/ax.tick)*ax.tick; v <= umax + 1e-9; v += ax.tick) out.push({u:v, label: Math.round(v*100)/100 + (ax.unit || ""), major:true}); return out; }
  const A = ax.anchor, vMin = A != null && umin < 0 ? A - Math.pow(umin/1.5, 2) : umin + (A || 0), vMax = umax + (A || 0);
  const lo2 = A != null ? Math.max(vMin, A) : vMin, span = vMax - lo2, step = span > 120 ? 20 : span > 40 ? 10 : 5;
  for (let v = Math.ceil(lo2/step)*step; v <= vMax; v += step) out.push({u: uOf(ax, v), label: String(v), major:true});
  if (A != null && vMin < A) for (const v of [-600,-400,-200,0,500,1000,1500,1700]) if (v >= vMin - 1 && v < A - 40) out.push({u: uOf(ax, v), label: yrLabel(v), major:false});
  return out.sort((a,b) => a.u - b.u);
}
function axisValue(d){   // "Rank 4.5", "Released 1972", … for the active Rank / More axes view; "" otherwise
  const ax = AXES[mode]; if (!ax) return "";
  const v = ax.get(d); if (v == null || !isFinite(v)) return `No ${ax.name.toLowerCase()}`;
  switch (mode) {
    case "rank": return `Rank ${+v}`;
    case "p:yx": return `Experienced ${Math.round(v)}`;
    case "p:im": return `IMDb ${(+v).toFixed(1)}`;
    case "p:born": return `Born ${yrLabel(Math.round(v))}`;
    case "p:w": return `${Math.round(v).toLocaleString()} words`;
    case "p:kb": return v >= 1024 ? `${(v/1024).toFixed(1)} MB` : `${(+v).toFixed(v < 10 ? 1 : 0)} KB`;
    case "links": return `${v} links (${d.body_in} in · ${d.body_out} out)`;
    case "upin": return `${v} ${v === 1 ? "note links" : "notes link"} up to it`;
  } return "";
}
const curX = () => mode === "ace" ? XA : mode === "time" ? XT : XP;

// ---------- Space-Time: time left to right, one row per top folder (ACE first); inside each row, a small Emergence (higher levels higher) ----------
const YST = new Float32Array(n); let ROWS = [];
const STH = WH*.74;
const rowKey = i => ARCH[i] ? "\u0000arch" : FOLD.includes(N[i].ace) ? N[i].ace : "\u0000root";
function layoutSpace(){
  const cnt = new Map(); for (let i=0;i<n;i++) if (vis[i]) { const r = rowKey(i); cnt.set(r, (cnt.get(r) || 0) + 1); }
  const keys = [...FOLD.filter(f => cnt.has(f)), ...["\u0000root", "\u0000arch"].filter(r => cnt.has(r))];
  const wt = keys.map(r => Math.sqrt(cnt.get(r)) + 6), tot = wt.reduce((a, b) => a + b, 0) || 1, G = 24, avail = WH - G*Math.max(0, keys.length - 1);
  let y = 0; ROWS = keys.map((r, j) => { const h = Math.max(avail*.05, avail*wt[j]/tot), row = {key: r, y0: y, y1: y + h, n: cnt.get(r)}; y += h + G; return row; });
  const sc = y > G ? STH/(y - G) : 1; for (const r of ROWS) { r.y0 *= sc; r.y1 *= sc; }   // rows fill the top of the map; the bottom stays clear for the legend and timeline (desktop)
  const at = new Map(ROWS.map(r => [r.key, r]));
  for (let i=0;i<n;i++) { const r = at.get(rowKey(i)) || ROWS[0]; YST[i] = r ? r.y0 + (YE[i]/WH)*(r.y1 - r.y0) : YE[i]; }
}
const rowName = k => k === "\u0000arch" ? "Archive" : k === "\u0000root" ? "Top level" : ACE_SYM[k] ? ACE_SYM[k][0] + " " + ACE_SYM[k][1].replace(/[()]/g, "") : k;

// ---------- hit-test grid ----------
const CELL = 24; let grid = new Map();
function buildGrid(){ grid = new Map(); for (let i=0;i<n;i++) { if (!vis[i]) continue; const c = Math.floor(X[i]/CELL)+","+Math.floor(Y[i]/CELL); (grid.get(c) || grid.set(c, []).get(c)).push(i); } }
let mode = "time"; { const m = pref("iv-x", "time"); if (m === "ace" || m === "time" || (AXES[m] && axisHas(m))) mode = m; }
computeVis(); layoutACE(); layoutTime(); layoutProp();
// ---------- Gravity view: emergence as rings (Level 5 at the center), Time or ACE goes around ----------
let view = pref("iv-view", "emergence"); if (!VIEWS_ON.includes(view)) view = "emergence";
let modeKeep = null;   // Space-Time is always by time: the Emergence axis you had comes back when you leave it
if (view === "spacetime" && mode !== "time") { modeKeep = mode; mode = "time"; }
const GC = {x: WW/2, y: WH/2}, GR = 880;
const RING = {5:[0,.12], 4:[.15,.31], 3:[.34,.52], 2:[.55,.77], 1:[.80,1]};
const ANG0 = Math.PI/2 + .03*Math.PI, ANGS = Math.PI*2 - ANG0;   // Rank and More axes: clockwise from 6:00, ending at 3:00; the open quarter (3:00–6:00) holds the ring numbers
const T_GAP = 10*Math.PI/180;   // Time: the whole circle, a 10° gap just after 3:00 for the ring numbers; latest dates end at 3:00
const a0 = () => mode === "time" ? T_GAP : ANG0, aS = () => mode === "time" ? Math.PI*2 - T_GAP : ANGS;
const GX = new Float32Array(n), GY = new Float32Array(n);
function layoutGravity(){
  const src = curX();
  for (let i=0;i<n;i++) { const d = N[i], [a,b] = RING[d.level], j = hash(d.path, 7);
    const rr = GR * (d.level === 1 ? a + j*(b-a) : a + (1 - pct[i])*(b-a)*.8 + j*(b-a)*.2);
    const ang = angOf(src[i]);
    GX[i] = GC.x + rr*Math.cos(ang); GY[i] = GC.y + rr*Math.sin(ang); }
}
// ACE around the clock: + (Inbox) centered at 8:00, Atlas starting at 9:30, then Calendar, Efforts and x clockwise.
// The gap between + and Atlas (about 9:00) holds the ring names. Time and the other axes start at 12:00, gap at the top.
const DEG = Math.PI/180, PLUS_AT = 150, ATLAS_AT = 195, ACE_GAP = 12;   // degrees clockwise from 3:00 (8:00 = 150°, 9:30 = 195°)
function buildAceArc(){   // + at 8:00 · Atlas from 9:30 · Efforts from 3:00 · x before + (degrees clockwise from 3:00)
  const plus = cols.find(c => c.ace === "+"), rest = cols.filter(c => c.ace !== "+");
  if (!rest.length && !plus) { aceArc = null; return; }
  const P = plus ? plus.x1 - plus.x0 : 0, e = rest.findIndex(c => c.ace === "Efforts");
  if (e > 0) {   // two segments: Atlas…Calendar fill 9:30 → 3:00; Efforts…x fill 3:00 → just before +
    const A0 = rest[0].x0, B0 = rest[e].x0, B1 = rest[rest.length-1].x1;
    const dA = (360 - ATLAS_AT)/Math.max(B0 - A0, 1), dB = (PLUS_AT - ACE_GAP)/Math.max(B1 - B0 + P/2, 1);
    aceArc = {plus, rest, split: true, A0, B0, dA, d: dB, gap: ((plus ? PLUS_AT + P*dB/2 : PLUS_AT) + ATLAS_AT)/2}; return; }
  const O = rest.length ? rest[rest.length-1].x1 - rest[0].x0 : 0;
  const d = (360 + PLUS_AT - ATLAS_AT - ACE_GAP) / Math.max(O + P/2, 1);
  aceArc = {plus, rest, split: false, d, gap: ((plus ? PLUS_AT + P*d/2 : PLUS_AT) + ATLAS_AT)/2};
}
function angOf(x){
  if (mode !== "ace") return a0() + (x/WW) * aS();
  if (!aceArc) buildAceArc(); const A = aceArc; if (!A) return ANG0;
  const {plus, rest, d} = A;
  if (plus && (!rest.length || x < (plus.x1 + rest[0].x0)/2)) return (PLUS_AT + (x - (plus.x0 + plus.x1)/2)*d) * DEG;
  if (A.split) return (x < A.B0 ? ATLAS_AT + (x - A.A0)*A.dA : 360 + (x - A.B0)*d) * DEG;
  return (ATLAS_AT + (x - rest[0].x0)*d) * DEG;
}
const gapAng = () => mode === "ace" ? ((aceArc || (buildAceArc(), aceArc)) ? aceArc.gap*DEG : Math.PI/4) : a0()/2;
// ---------- Starfield: each Level 5 hub is a galaxy core; notes join the hub they reach in the fewest links ----------
// Inside a galaxy, emergence sets the distance from the core (maps in the bulge, linked notes out along the arms).
// Unlinked notes drift in nebulae, one per ACE folder. The x/z archive is an old elliptical galaxy at the edge.
// The home notes sit at the center of the universe. Star color follows the Time / ACE / Rank switch.
const SX = new Float32Array(n), SY = new Float32Array(n), SR = new Float32Array(n), SC = new Uint8Array(n);
const BOD = new Int32Array(n).fill(-1), COREB = new Int32Array(n).fill(-1);
let BODIES = [], UB = {x0:0, y0:0, x1:WW, y1:WH}, starsDirty = true, starVer = 0;
const UC = {x: WW/2, y: WH/2};
const SADJ = Array.from({length:n}, () => []);
for (const [a,b,t] of E) if ((t <= 1 || t === 4) && !ARCH[a] && !ARCH[b]) { SADJ[a].push(b); SADJ[b].push(a); }
const GHUE = ["#7b5cff","#ff4fa3","#2fc6ff","#ff9f43","#3ee0a0","#c46bff","#ff6b6b","#4f8cff","#ffd166","#5eead4","#f472b6","#a3e635"];
const NEBC = {"+":"#38d6c4", "Atlas":"#e0a84a", "Calendar":"#e05a8c", "Efforts":"#4a8fe0", "x":"#9a6bff"};
const NEB_PAL = ["#7bd66a","#f08a5d","#5ec8f2","#d58cf0","#f2d16b","#6be0c4","#f07aa0","#8fa6ff"];
const NEBKEYS = [...FOLD, "(root)"]; NEBKEYS.forEach((a, j) => { if (!NEBC[a]) NEBC[a] = NEB_PAL[j % NEB_PAL.length]; });
const NEBNAME = {"+":"Inbox Nebula", "Atlas":"Atlas Nebula", "Calendar":"Calendar Nebula", "Efforts":"Efforts Nebula", "x":"Xtras Nebula", "(root)":"Loose Nebula"};
// star colors: 0–9 temperature (old red → new blue), 10 no value, 11–15 ACE folders, 16 vault root
const SPAL = ["#ff4b3a","#ff6d3f","#ff8f4a","#ffb35c","#ffd27f","#fff0c9","#eef2ff","#c9dbff","#9fc0ff","#78a4ff",
              "#8d93a6", "#5eead4","#ffd166","#ff8fab","#7cc4ff","#c3a6ff", "#ffffff"];
const ACEC = {"+":11, "Atlas":12, "Calendar":13, "Efforts":14, "x":15}; FOLD.filter(a => ACEC[a] == null).forEach((a, j) => ACEC[a] = 11 + j % 5);
function gauss(s, seed){ const u = Math.max(1e-6, hash(s, seed)), v = hash(s, seed + 101); return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v); }
function layoutStars(){
  if (!starsDirty) return; starsDirty = false; starVer++;
  BOD.fill(-1); COREB.fill(-1);
  const homes = [], cores = [];
  for (let i=0;i<n;i++) if (N[i].level === 5 && !ARCH[i]) (N[i].home ? homes : cores).push(i);
  const isHome = new Uint8Array(n); homes.forEach(i => isHome[i] = 1);
  // capture: breadth-first from every core at once; at equal distance the stronger core wins
  const own = new Int32Array(n).fill(-1), hop = new Uint8Array(n).fill(255), qq = [];
  cores.sort((a,b) => N[b].score - N[a].score).forEach(c => { own[c] = c; hop[c] = 0; qq.push(c); });
  for (let h=0; h<qq.length; h++) { const u = qq[h]; for (const v of SADJ[u]) { if (isHome[v] || own[v] >= 0) continue; own[v] = own[u]; hop[v] = Math.min(254, hop[u]+1); qq.push(v); } }
  const B = []; const add = b => { b.id = B.length; B.push(b); return b; };
  const home = add({kind:"home", name:"Home", members:[...homes], x:0, y:0, fixed:true});
  const byCore = new Map();
  for (const c of cores) byCore.set(c, add({kind:"gal", core:c, name:N[c].title, members:[]}));
  for (let i=0;i<n;i++) if (own[i] >= 0) byCore.get(own[i]).members.push(i);
  // linked notes no core reached: small clusters, or (linked only to a home note) Home's orbit
  const seen = new Uint8Array(n), field = [];
  for (let i=0;i<n;i++) { if (seen[i] || own[i] >= 0 || isHome[i] || ARCH[i] || N[i].level < 2) continue;
    const comp = [i]; seen[i] = 1;
    for (let h=0; h<comp.length; h++) for (const v of SADJ[comp[h]]) if (!seen[v] && !isHome[v] && own[v] < 0 && !ARCH[v]) { seen[v] = 1; comp.push(v); }
    if (comp.length >= 2) { comp.sort((a,b) => N[b].score - N[a].score); add({kind:"dwarf", core:comp[0], name:N[comp[0]].title, members:comp}); }
    else if (out[i].some(j => isHome[j]) || inn[i].some(j => isHome[j])) home.members.push(i);
    else field.push(i); }
  const taken = new Uint8Array(n); for (const b of B) for (const i of b.members) taken[i] = 1;
  const nebs = {};
  for (let i=0;i<n;i++) { if (ARCH[i] || taken[i]) continue; const a = NEBKEYS.includes(N[i].ace) ? N[i].ace : "(root)"; (nebs[a] ||= []).push(i); }
  const nebB = NEBKEYS.filter(a => nebs[a]).map(a => add({kind:"neb", ace:a, name:NEBNAME[a] || a + " Nebula", members:nebs[a]}));
  const arch = []; for (let i=0;i<n;i++) if (ARCH[i]) arch.push(i);
  const old = arch.length ? add({kind:"old", name:"Archive · Ancient Elliptical", members:arch}) : null;
  for (const b of B) for (const i of b.members) BOD[i] = b.id;
  // sizes
  for (const b of B) { const m = b.members.length;
    b.r = b.kind === "gal" ? 50 + 7.5*Math.sqrt(m) : b.kind === "dwarf" ? 16 + 6*Math.sqrt(m) : b.kind === "neb" ? 70 + 5.2*Math.sqrt(m) : b.kind === "old" ? 80 + 5*Math.sqrt(m) : 60 + 3.2*Math.sqrt(m);
    b.seed = b.kind + b.name; }
  // links between bodies: the cosmic web
  const L = new Map();
  for (const [a,b,t] of E) { if (t > 1 && t !== 4) continue; const p = BOD[a], q2 = BOD[b]; if (p < 0 || q2 < 0 || p === q2) continue;
    const kk = Math.min(p,q2) + "," + Math.max(p,q2); L.set(kk, (L.get(kk)||0) + 1); }
  const web = [...L.entries()].map(([kk,v]) => { const [p,q2] = kk.split(",").map(Number); return {a:p, b:q2, n:v}; });
  // place galaxies and clusters around Home: a few hundred steps of springs (links) and pushing apart (no overlaps)
  const inner = B.filter(b => b.kind === "gal" || b.kind === "dwarf").sort((p,q2) => q2.r - p.r);
  inner.forEach((b, j) => { const ang = j*2.39996 + .6, d = home.r + 160 + 230*Math.sqrt(j + .5); b.x = Math.cos(ang)*d; b.y = Math.sin(ang)*d; });
  const live = [home, ...inner], spr = web.filter(w => B[w.a].kind !== "neb" && B[w.b].kind !== "neb" && B[w.a].kind !== "old" && B[w.b].kind !== "old");
  for (let it=0; it<420; it++) {
    const cool = 1 - it/420;
    for (const w of spr) { const p = B[w.a], q2 = B[w.b], dx = q2.x - p.x, dy = q2.y - p.y, d = Math.hypot(dx,dy) || 1, d0 = p.r + q2.r + 70;
      if (d <= d0) continue; const f = .012 * Math.min(1, Math.log1p(w.n)/4) * (d - d0) / d;
      if (!p.fixed) { p.x += dx*f; p.y += dy*f; } if (!q2.fixed) { q2.x -= dx*f; q2.y -= dy*f; } }
    for (const b of inner) { b.x *= 1 - .006*cool - .001; b.y *= 1 - .006*cool - .001; }
    for (let a=0;a<live.length;a++) for (let c=a+1;c<live.length;c++) { const p = live[a], q2 = live[c];
      const dx = q2.x - p.x, dy = q2.y - p.y, d = Math.hypot(dx,dy) || .01, gap = (p.kind === "dwarf" || q2.kind === "dwarf") ? 40 : 120, m = p.r + q2.r + gap;
      if (d >= m) continue; const push = (m - d)/d * .5;
      if (p.fixed) { q2.x += dx*push*2; q2.y += dy*push*2; } else { p.x -= dx*push; p.y -= dy*push; q2.x += dx*push; q2.y += dy*push; } }
  }
  for (const b of inner) b.x *= 1.22;   // a little wider than tall, for screens
  // the outer bodies: nebulae and the ancient elliptical, around the edge
  let Rc = 0; for (const b of live) Rc = Math.max(Rc, Math.hypot(b.x/1.22, b.y) + b.r);
  const outer = [...nebB, ...(old ? [old] : [])], ANGS = {"+":-28, "Atlas":-152, "Calendar":30, "Efforts":-90, "x":88}; { const rest = nebB.filter(b => ANGS[b.ace] == null); rest.forEach((b, j) => ANGS[b.ace] = -170 + (j + .5)*300/rest.length); }
  for (const b of outer) { const deg = b.kind === "old" ? 148 : ANGS[b.ace], ang = deg*Math.PI/180;   // walk out along its bearing until clear of the galaxies
    let d = home.r + b.r; do { d += 20; b.x = Math.cos(ang)*d*1.22; b.y = Math.sin(ang)*d; } while (d < Rc*1.3 && live.some(q2 => Math.hypot(b.x - q2.x, b.y - q2.y) < b.r + q2.r + 70)); }
  const all = [...live, ...outer];
  for (let it=0; it<160; it++) for (const p of outer) for (const q2 of all) { if (p === q2) continue;
    const dx = p.x - q2.x, dy = p.y - q2.y, d = Math.hypot(dx,dy) || .01, m = p.r + q2.r + 50; if (d >= m) continue;
    const push = (m - d)/d; if (outer.includes(q2)) { p.x += dx*push*.5; p.y += dy*push*.5; } else { p.x += dx*push; p.y += dy*push; } }
  // shapes
  for (const b of B) { const h = (s) => hash(b.seed, s);
    b.pa = h(1)*Math.PI; b.q = b.kind === "gal" ? .5 + .45*h(2) : b.kind === "old" ? .62 : b.kind === "dwarf" ? .7 + .25*h(2) : 1;
    b.arms = b.kind === "gal" ? (b.members.length > 260 ? 2 + (h(3) < .4 ? 1 : 0) : b.members.length > 50 ? 2 : 0) : 0;
    b.tw = (h(4) < .5 ? -1 : 1) * (2.4 + 1.4*h(5)); }
  inner.filter(b => b.kind === "gal").forEach((b, j) => b.hue = GHUE[j % GHUE.length]);
  for (const b of B) if (!b.hue) b.hue = b.kind === "neb" ? NEBC[b.ace] : b.kind === "old" ? "#ff8a4c" : b.kind === "home" ? "#ffe2a8" : "#8fa6ff";
  // stars
  const place = (i, b, lx, ly) => { ly *= b.q; const c = Math.cos(b.pa), s = Math.sin(b.pa);
    SX[i] = UC.x + b.x + lx*c - ly*s; SY[i] = UC.y + b.y + lx*s + ly*c; };
  for (const b of B) {
    if (b.core != null) COREB[b.core] = b.id;
    for (const i of b.members) { const d = N[i], p = d.path, j = hash(p, 31), g1 = gauss(p, 41), g2 = gauss(p, 43);
      if (b.kind === "home") {
        if (d.home) { const k3 = homes.indexOf(i), a = -Math.PI/2 + k3*2.0944; SX[i] = UC.x + b.x + Math.cos(a)*16; SY[i] = UC.y + b.y + Math.sin(a)*16; continue; }
        const rr = b.r*(.42 + .55*j), a = hash(p, 33)*6.2832; place(i, {x:b.x, y:b.y, q:.42, pa:-.35}, Math.cos(a)*rr, Math.sin(a)*rr); continue; }
      if (b.kind === "gal") {
        if (i === b.core) { SX[i] = UC.x + b.x; SY[i] = UC.y + b.y; continue; }
        const pc = pct[i], h = hop[i];
        let t = d.level >= 4 ? .03 + (1-pc)*.12 + j*.05 : d.level === 3 ? .09 + (1-pc)*.28 + j*.1
              : (() => { const base = h <= 1 ? .2 : h === 2 ? .34 : .48; return base + (1-base)*(.08 + .92*(.55*hash(p,35) + .45*(1-pc))); })();
        t = Math.min(1, t);
        let a;
        if (b.arms && t > .14) { const arm = Math.floor(hash(p, 37)*b.arms), wide = hash(p, 39) < .22;
          a = arm*6.2832/b.arms + b.tw*Math.log(1 + 7*t)/Math.log(8) + g1*(wide ? .7 : .2 + .28*(1-t)); }
        else a = hash(p, 37)*6.2832;
        const rr = t*b.r*(1 + g2*.05); place(i, b, Math.cos(a)*rr, Math.sin(a)*rr); continue; }
      if (b.kind === "dwarf") { if (i === b.core) { SX[i] = UC.x + b.x; SY[i] = UC.y + b.y; continue; }
        const rr = Math.min(1, .25 + Math.abs(g1)*.35)*b.r, a = hash(p, 37)*6.2832; place(i, b, Math.cos(a)*rr, Math.sin(a)*rr); continue; }
      if (b.kind === "old") { const pc = pct[i];
        const t = d.level >= 3 ? .05 + (1-pc)*.15 : d.level === 2 ? .1 + .35*Math.abs(g1) : Math.min(1, .15 + Math.abs(g1)*.42);
        const a = hash(p, 37)*6.2832, rr = t*b.r; place(i, b, Math.cos(a)*rr, Math.sin(a)*rr); continue; }
      if (b.kind === "neb") { // wisps: notes along a few curved filaments, plus a diffuse cloud
        const nf = 4, f = Math.floor(hash(p, 45)*nf), u = hash(p, 47), fs = b.seed + f;
        const ax = (hash(fs, 1)-.5)*1.6*b.r, ay = (hash(fs, 2)-.5)*1.6*b.r, bx = (hash(fs, 3)-.5)*1.6*b.r, by = (hash(fs, 4)-.5)*1.6*b.r, cx = (hash(fs, 5)-.5)*1.2*b.r, cy = (hash(fs, 6)-.5)*1.2*b.r;
        let lx = (1-u)*(1-u)*ax + 2*(1-u)*u*cx + u*u*bx, ly = (1-u)*(1-u)*ay + 2*(1-u)*u*cy + u*u*by;
        const wdt = b.r*(.05 + .12*Math.sin(Math.PI*u)) * (hash(p, 49) < .25 ? 3.2 : 1);
        lx += g1*wdt; ly += g2*wdt; const m = Math.hypot(lx, ly); if (m > b.r) { lx *= b.r/m; ly *= b.r/m; }
        SX[i] = UC.x + b.x + lx; SY[i] = UC.y + b.y + ly; continue; }
    } }
  for (let i=0;i<n;i++) { const lv = N[i].level;
    SR[i] = (lv === 5 ? 3.4 + Math.min(N[i].score, 30)*.08 : lv === 4 ? 2.4 : lv === 3 ? 1.6 : lv === 2 ? 1 + Math.min(N[i].score, 5)*.1 : .8) * (ARCH[i] ? .85 : 1); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of B) { x0 = Math.min(x0, UC.x + b.x - b.r); x1 = Math.max(x1, UC.x + b.x + b.r); y0 = Math.min(y0, UC.y + b.y - b.r); y1 = Math.max(y1, UC.y + b.y + b.r); }
  UB = {x0: x0 - 80, y0: y0 - 80, x1: x1 + 80, y1: y1 + 80};
  BODIES = B; BODIES.web = web;
}
function colorStars(){
  if (mode === "ace") { for (let i=0;i<n;i++) SC[i] = ACEC[N[i].ace] ?? 16; return; }
  const src = curX(), x0 = mode === "time" ? X0T : X0P, span = WW - x0 - (mode === "time" ? 0 : 30);
  for (let i=0;i<n;i++) { const v = src[i]; SC[i] = v < ND[1] + 10 ? 10 : Math.max(0, Math.min(9, Math.floor((v - x0)/span*10))); }
}
// glow sprites, one per color
const SPR = new Map();
function sprite(col){ let s = SPR.get(col); if (s) return s;
  s = doc.createElement("canvas"); s.width = s.height = 64; const c = s.getContext("2d"), g = c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0, col); g.addColorStop(.18, col + "aa"); g.addColorStop(.45, col + "33"); g.addColorStop(1, col + "00");
  c.fillStyle = g; c.fillRect(0,0,64,64); SPR.set(col, s); return s; }
// the soft light of the universe (galaxy glows, arms, nebulae, the cosmic web), drawn once to an offscreen canvas
let GLOW = null, WEB = null, glowKey = "";
function buildGlow(){
  const VG = i => vis[i] && (senseT == null || TV[i] <= senseT);   // the glow follows the timeline by step, not by each pop (so it is rebuilt once a step)
  let h = 0; for (let i=0;i<n;i++) if (VG(i)) h = (Math.imul(h, 31) + i) | 0;
  const key = starVer + ":" + h + ":" + mode + ":" + fromY + ":" + fullY; if (key === glowKey && GLOW) return; glowKey = key;
  const ww = UB.x1 - UB.x0, wh = UB.y1 - UB.y0, gs = Math.min(1, (isPhone() ? 1400 : 2000)/Math.max(ww, wh));
  GLOW ||= doc.createElement("canvas"); GLOW.width = Math.ceil(ww*gs); GLOW.height = Math.ceil(wh*gs); GLOW.gs = gs;
  const c = GLOW.getContext("2d"); c.clearRect(0,0,GLOW.width,GLOW.height); c.globalCompositeOperation = "lighter";
  const gx = x => (x - UB.x0)*gs, gy = y => (y - UB.y0)*gs;
  const shown = b => { for (const i of b.members) if (VG(i)) return true; return false; };
  const on = BODIES.on = BODIES.map(shown);
  // cosmic web: links between galaxies, as faint curved filaments (its own layer, so it can fade on zoom)
  WEB ||= doc.createElement("canvas"); WEB.width = GLOW.width; WEB.height = GLOW.height;
  const wc = WEB.getContext("2d"); wc.clearRect(0,0,WEB.width,WEB.height); wc.globalCompositeOperation = "lighter"; wc.lineCap = "round";
  for (const w of BODIES.web) { if (!on[w.a] || !on[w.b] || w.n < 4) continue; const p = BODIES[w.a], q2 = BODIES[w.b];
    const x1 = gx(UC.x+p.x), y1 = gy(UC.y+p.y), x2 = gx(UC.x+q2.x), y2 = gy(UC.y+q2.y), bend = (hash(p.seed + q2.seed, 1) - .5)*.35;
    const mx = (x1+x2)/2 - (y2-y1)*bend, my = (y1+y2)/2 + (x2-x1)*bend, sz = Math.log1p(w.n);
    for (const [lw, al] of [[40, .018], [14, .035], [5, .09]]) { wc.lineWidth = lw*gs*(.5 + sz*.18); wc.strokeStyle = `rgba(140,160,255,${Math.min(.3, al*(.4 + sz*.25))})`;
      wc.beginPath(); wc.moveTo(x1,y1); wc.quadraticCurveTo(mx,my,x2,y2); wc.stroke(); } }
  for (const b of BODIES) { if (!on[b.id]) continue; const cx = gx(UC.x+b.x), cy = gy(UC.y+b.y), R = b.r*gs;
    const halo = (rad, col, a0) => { const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, col + a0); g.addColorStop(1, col + "00"); c.fillStyle = g;
      c.save(); c.translate(cx, cy); c.rotate(b.pa || 0); c.scale(1, b.q || 1); c.translate(-cx, -cy); c.beginPath(); c.arc(cx, cy, rad, 0, 6.2832); c.fill(); c.restore(); };
    if (b.kind === "gal") { halo(R*1.1, b.hue, "30"); halo(R*.6, b.hue, "22"); halo(R*.3, "#fff1d6", "aa"); halo(R*.1, "#ffffff", "dd"); }
    else if (b.kind === "dwarf") halo(R*1.1, b.hue, "26");
    else if (b.kind === "old") { halo(R*1.1, "#ff7a3c", "28"); halo(R*.45, "#ffb070", "40"); halo(R*.12, "#fff0d8", "88"); }
    else if (b.kind === "home") { halo(R*1.3, "#ffd27a", "30"); halo(R*.35, "#ffffff", "bb");
      c.save(); c.translate(cx, cy); c.rotate(-.35); c.scale(1, .42); c.lineWidth = 7*gs; c.strokeStyle = "rgba(255,190,110,.22)"; c.beginPath(); c.arc(0, 0, R*.7, 0, 6.2832); c.stroke();
      c.lineWidth = 2.5*gs; c.strokeStyle = "rgba(255,226,170,.5)"; c.beginPath(); c.arc(0, 0, R*.6, 0, 6.2832); c.stroke(); c.restore(); }
    else if (b.kind === "neb") halo(R*.9, b.hue, "18");
    // every note adds a little light where it sits: this is what draws the arms and the wisps
    const big = b.kind === "neb" ? 30 : b.kind === "old" ? 18 : 20;
    for (const i of b.members) { if (!VG(i)) continue; const lv = N[i].level, s = (lv >= 3 ? big*1.6 : big)*gs*2;
      c.globalAlpha = b.kind === "neb" ? .08 : lv >= 3 ? .35 : .2; c.drawImage(sprite(b.kind === "neb" ? b.hue : SPAL[SC[i]]), gx(SX[i]) - s/2, gy(SY[i]) - s/2, s, s); }
    c.globalAlpha = 1; }
}
// faraway stars behind everything, moving slower than the map
const BGS = (() => { let a = 1234567; const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return [{p:.05, T:640, n:230}, {p:.14, T:900, n:150}].map(L => ({...L, pts: Array.from({length:L.n}, () => [r()*L.T, r()*L.T, .4 + r()*r()*1.3, .15 + r()*.6, r() < .12])})); })();
function starsBg(){
  const g = ctx.createRadialGradient(W*.5, H*.45, 0, W*.5, H*.45, Math.hypot(W, H)*.65);
  g.addColorStop(0, "#0c1126"); g.addColorStop(.6, "#060814"); g.addColorStop(1, "#020307");
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  if (senseT != null) { const lc = isPhone() ? 0 : 400; drawWatermark(lc + (W - lc - sideW())/2, H*.46, Math.min(W, H)*.36, "#9fb0ff", .07); }
  for (const L of BGS) { const ox = ((tx*L.p) % L.T + L.T) % L.T, oy = ((ty*L.p) % L.T + L.T) % L.T;
    for (let gx0 = ox - L.T; gx0 < W; gx0 += L.T) for (let gy0 = oy - L.T; gy0 < H; gy0 += L.T)
      for (const [x, y, s, a, blue] of L.pts) { const px = gx0 + x, py = gy0 + y; if (px < 0 || px > W || py < 0 || py > H) continue;
        ctx.globalAlpha = a; ctx.fillStyle = blue ? "#b8ccff" : "#ffffff"; ctx.fillRect(px, py, s, s); } }
  ctx.globalAlpha = 1;
  colorStars();
  const bgDim = sel >= 0 ? .22 : focus >= 0 ? .7 : 1;   // a selected note dims the galaxies so its links read clearly
  if (S3D) { halos3D(bgDim); return; }
  buildGlow();
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = bgDim;
  ctx.drawImage(GLOW, sx(UB.x0), sy(UB.y0), (UB.x1 - UB.x0)*k, (UB.y1 - UB.y0)*k);
  const wf = Math.max(0, Math.min(1, (.7 - k)/.45));   // the cosmic web fades out as you zoom into a galaxy
  if (wf > 0 && showAll) { ctx.globalAlpha = wf*bgDim; ctx.drawImage(WEB, sx(UB.x0), sy(UB.y0), (UB.x1 - UB.x0)*k, (UB.y1 - UB.y0)*k); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}
function starsNotes(lit, dim){
  const vx0 = -30, vx1 = W+30, vy0 = -30, vy1 = H+30, bins = new Map(), bright = [];
  for (let i=0;i<n;i++) { if (!VV(i)) continue; const x = sx(X[i]), y = sy(Y[i]); if (x<vx0||x>vx1||y<vy0||y>vy1) continue;
    if (N[i].level >= 3) { bright.push(i); continue; }
    const key = N[i].level*32 + SC[i]; (bins.get(key) || bins.set(key, []).get(key)).push(i); }
  ctx.globalCompositeOperation = "lighter";
  for (const [key, ids] of bins) { const lv = key >> 5, col = SPAL[key & 31];
    ctx.globalAlpha = (lv === 1 ? .5 : .85) * dim; ctx.fillStyle = col; ctx.beginPath();
    for (const i of ids) { const x = sx(X[i]), y = sy(Y[i]), r = rad(i); if (r < 1.4) ctx.rect(x - r, y - r, 2*r, 2*r); else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); } }
    ctx.fill(); }
  bright.sort((a,b) => N[a].level - N[b].level);
  for (const i of bright) { const lv = N[i].level, x = sx(X[i]), y = sy(Y[i]), r = rad(i), col = SPAL[SC[i]];
    const a = (lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .2 : .7) : 1);
    ctx.globalAlpha = a * (lv === 3 ? .55 : lv === 4 ? .75 : .9); const s = r*(lv === 5 ? 9 : 7); ctx.drawImage(sprite(col), x - s/2, y - s/2, s, s);
    if (lv >= 4) { const sl = r*(lv === 5 ? 11 : 6.5); ctx.globalAlpha = a*.5; ctx.strokeStyle = col; ctx.lineWidth = lv === 5 ? 1.1 : .8;
      ctx.beginPath(); ctx.moveTo(x - sl, y); ctx.lineTo(x + sl, y); ctx.moveTo(x, y - sl); ctx.lineTo(x, y + sl); ctx.stroke();
      if (lv === 5) { const d2 = sl*.35; ctx.globalAlpha = a*.3; ctx.beginPath(); ctx.moveTo(x - d2, y - d2); ctx.lineTo(x + d2, y + d2); ctx.moveTo(x - d2, y + d2); ctx.lineTo(x + d2, y - d2); ctx.stroke(); } }
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*.8, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, r*.45, 0, 6.2832); ctx.fill(); }
  if (lit) for (const i of lit) { if (!VV(i) || N[i].level >= 3) continue; const x = sx(X[i]), y = sy(Y[i]), r = Math.max(rad(i), 1.8);
    ctx.globalAlpha = 1; ctx.drawImage(sprite(SPAL[SC[i]]), x - r*4, y - r*4, r*8, r*8); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}
const galLabelOn = b => { const rr = b.r*k; return rr >= 16 && rr <= Math.min(W, H)*.8; };
function starLabels(){
  ctx.globalAlpha = sel >= 0 ? .5 : 1;   // galaxy names step back while a note is selected
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const hasLS = "letterSpacing" in ctx, taken = [];
  for (const b of [...BODIES].sort((p,q2) => q2.r - p.r)) {
    if (b.kind === "home" || (b.kind === "dwarf" && b.members.length < 12) || !galLabelOn(b)) continue;
    let any = false; for (const i of b.members) if (VV(i)) { any = true; break; } if (!any) continue;
    const [bpx, bpy] = bodyPos(b), cx = sx(bpx), cy = sy(bpy), rr = b.r*k*(S3D && B3[b.id] ? B3[b.id].s*B3[b.id].flatK : 1), y = cy + rr*Math.max(b.q || 1, .55)*.92 + 8;
    if (cx < -200 || cx > W + 200 || y < -20 || y > H + 20) continue;
    const nm = b.name.length > 34 ? b.name.slice(0, 33) + "…" : b.name;
    ctx.font = `600 ${b.kind === "dwarf" ? 9.5 : 11}px ${css.mono}`; if (hasLS) ctx.letterSpacing = "2px";
    const tw = ctx.measureText(nm.toUpperCase()).width + 8, box = [cx - tw/2, y - 2, tw, 32];
    if (taken.some(t => box[0] < t[0]+t[2] && box[0]+box[2] > t[0] && box[1] < t[1]+t[3] && box[1]+box[3] > t[1])) { if (hasLS) ctx.letterSpacing = "0px"; continue; }
    taken.push(box); if (b.core != null) LH.push([box[0], box[1], box[2], 30, b.core]);
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(3,4,10,.85)"; ctx.strokeText(nm.toUpperCase(), cx, y);
    ctx.fillStyle = b.kind === "gal" ? "rgba(236,240,255,.92)" : "rgba(200,208,235,.75)"; ctx.fillText(nm.toUpperCase(), cx, y);
    if (hasLS) ctx.letterSpacing = "0px"; ctx.font = `500 9.5px ${css.mono}`; ctx.fillStyle = b.hue;
    const sub = b.kind === "neb" ? `${b.members.length.toLocaleString()} unlinked` : b.kind === "old" ? `${b.members.length.toLocaleString()} notes` : `${b.members.length.toLocaleString()} stars`;
    ctx.strokeText(sub, cx, y + 15); ctx.fillText(sub, cx, y + 15); }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1;
}
const SPACE = {bg:"#04050c", ink:"#eef1ff", muted:"#8f98b8", line:"rgba(160,180,255,.14)", accent:"#b9a6ff", up:"#ffcf6e", down:"#6fd3ff", rel:"#c9a2ff", upp:"#fff09a", prop:"#a9b4c8", "edge-faint":"rgba(150,170,255,.08)"};
// ---------- Sensemaking map: the four sensemaking archetypes as a 2×2 ----------
// Left → right: Reflection → Expression. Bottom → top: Bottom-up → Top-down.
// Synthesizer (top left) · Producer (top right) · Inner Guide (bottom left) · Creative (bottom right).
// v1 places notes by rules on structure and place (no AI); a one-time AI pass can later replace x/y per note.
const SNX = new Float32Array(n), SNY = new Float32Array(n), SXR = new Float32Array(2*n), SXA = new Float32Array(2*n), AIW = new Array(n).fill(null);
let SXY = SXR;
const SR0 = 820;                                        // half-width of the plane in world units
const SC_ = {x: WW/2, y: WH/2};
const ARCH4 = [ // name, quadrant sign (x, y), soft fill, darker ink for text on light themes
  ["Synthesizer", -1,  1, "#4fb38a", "#23805c"], ["Producer", 1, 1, "#e46a6a", "#b83c3c"],
  ["Inner Guide", -1, -1, "#e6c94a", "#9a7708"], ["Creative", 1, -1, "#8f7ae0", "#5f47b8"]];
const EXPR_COLL = new Set(["works","drafts","newsletters","scripts","posts","videos","projects","courses","products","talks","essays","articles"]);
const REFL_COLL = new Set(["sources","books","movies","people","quotes","clippings","podcasts","highlights","reviews","journals","statements"]);

function senseRules(d, why){   // returns [x, y] in −1…1; `why` collects the reasons (for the note panel)
  const p = d.path, ti = d.title, w = Math.max((d.p && d.p.w) || 0, 1), sf = (d.p && d.p.sf) || [0,0,0,0,0,0];
  const [h, li, cb, fp, q, fl] = sf, c = new Set((d.collections || []).map(x => x.toLowerCase()));
  let x = 0, y = 0; const add = (ax, v, txt) => { if (!v) return; if (ax === "x") x += v; else y += v; if (why) why.push([ax, v, txt]); };
  // Reflection (−) ↔ Expression (+)
  if (p.startsWith("Efforts/")) add("x", .9, "in Efforts");
  if (p.includes("/Projects/Active/")) add("x", .3, "an active project");
  if (p.startsWith("Calendar/")) add("x", -.5, "in Calendar");
  const daily = /Calendar\/(Days|Journal|Journals)\//.test(p);
  if (daily) add("x", -.3, "a daily or journal note");
  const source = /Atlas\/Sources\/|Clippings|Readwise/.test(p);
  if (source) add("x", -.7, "a source or clipping");
  if (p.startsWith("Atlas/")) add("x", -.25, "in Atlas");
  if ([...c].some(k => EXPR_COLL.has(k))) add("x", .6, "in a works collection");
  if ([...c].some(k => REFL_COLL.has(k))) add("x", -.4, "in a reading or people collection");
  if (/\b(draft|script|outline|launch|newsletter|email|post|video|course|workshop|cohort)\b/i.test(ti)) add("x", .4, "its title names something to ship");
  if (fl & 1) add("x", .4, "has a status");
  if (fl & 2) add("x", .4, "has a due date");
  if (cb) add("x", Math.min(.6, cb*.08), `${cb} checkbox${cb === 1 ? "" : "es"}`);
  const fpr = fp/(w/100); if (fp) add("x", -Math.min(.6, fpr*.12), `first-person writing (${fp} I/me/my)`);
  if (q) add("x", -Math.min(.3, q*.03), `${q} question${q === 1 ? "" : "s"}`);
  // Bottom-up (−) ↔ Top-down (+)
  if (d.is_map) add("y", .8, "a map");
  if (fl & 4) add("y", .5, "runs a query");
  if (d.density) add("y", Math.min(.5, d.density*.6), "lines full of links");
  if (w > 40 && h) add("y", Math.min(.5, h/(w/100)*.25), `${h} heading${h === 1 ? "" : "s"}`);
  if (li) add("y", Math.min(.4, li/Math.max(1, w/12)*.5), "lists");
  if (fl & 1 || d.rank != null) add("y", .2, "tracked with properties");
  if (source) add("y", .3, "processed from a source");
  if (daily) add("y", -1.1, "a daily or journal note");
  if (p.startsWith("+/")) add("y", -.4, "in the inbox");
  if (d.level === 1) add("y", -.3, "not linked yet");
  if (w > 250 && !h && li < 3) add("y", -.5, "long free-flowing prose");
  if (/\b(spark|freewrite|journal|musing|thought)\b/i.test(ti)) add("y", -.3, "a spark or freewrite");
  return [Math.tanh(x), Math.tanh(y)];
}
for (let i=0;i<n;i++) { const [x, y] = senseRules(N[i]); SXR[2*i] = x; SXR[2*i+1] = y; }
// the one-time AI pass (ideaverse-sense-ai.js, keyed by path): notes it never saw (added since) fall back to the rules
const SAI = null;
let aiCount = 0;
for (let i=0;i<n;i++) { const a = SAI && SAI.notes[N[i].path];
  if (a) { SXA[2*i] = a[0]; SXA[2*i+1] = a[1]; AIW[i] = a[2] || ""; aiCount++; } else { SXA[2*i] = SXR[2*i]; SXA[2*i+1] = SXR[2*i+1]; } }
let senseSrc = SAI && pref("iv-ssrc", "ai") !== "rules" ? "ai" : "rules";
SXY = senseSrc === "ai" ? SXA : SXR;
const quadOf = i => (SXY[2*i] < 0 ? (SXY[2*i+1] >= 0 ? 0 : 2) : (SXY[2*i+1] >= 0 ? 1 : 3));
function layoutSense(){
  for (let i=0;i<n;i++) { const p = N[i].path, j = .045;
    SNX[i] = SC_.x + (SXY[2*i] + gauss(p, 61)*j) * SR0;
    SNY[i] = SC_.y - (SXY[2*i+1] + gauss(p, 63)*j) * SR0; }
}
function senseTip(i){ const q = ARCH4[quadOf(i)][0], x = SXY[2*i], y = SXY[2*i+1];
  return `${q}${senseSrc === "ai" && AIW[i] ? ` · “${AIW[i]}”` : ""} · ${x < 0 ? "reflection" : "expression"} ${Math.abs(x).toFixed(2)}, ${y >= 0 ? "top-down" : "bottom-up"} ${Math.abs(y).toFixed(2)}`; }
function senseWhy(i){   // for the note panel: the archetype and the clues that put it there
  const why = []; senseRules(N[i], why);
  const fmt = ax => why.filter(r => r[0] === ax).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).map(([, v, t]) => `${t} (${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)})`).join(", ") || "no clues";
  const qr = (SXR[2*i] < 0 ? (SXR[2*i+1] >= 0 ? 0 : 2) : (SXR[2*i+1] >= 0 ? 1 : 3));
  return {q: ARCH4[quadOf(i)][0], x: SXY[2*i], y: SXY[2*i+1], xr: fmt("x"), yr: fmt("y"), ai: senseSrc === "ai" ? (AIW[i] != null ? AIW[i] || "placed" : null) : undefined, rq: ARCH4[qr][0]};
}
// ---- time: notes appear as they were created; a dot follows where attention went ----
let senseT = null;                                // null = everything; else a time (ms): only notes created by then
const SENSE_WIN = 90*DAY;                         // "recent" = the trailing 90 days
let SY0 = SLMIN, SY1 = NOW_Y;   // Sensemaking shows only notes dated in these years (the full span also keeps undated notes)
{ const r = pref("iv-syears", null); if (Array.isArray(r)) { SY0 = Math.max(SLMIN, Math.min(NOW_Y, +r[0] || SLMIN)); SY1 = Math.max(SY0, Math.min(NOW_Y, +r[1] || NOW_Y)); } }
const syFull = () => SY0 <= SLMIN && SY1 >= NOW_Y;
const syT0 = () => SY0 <= SLMIN ? -Infinity : Date.UTC(SY0, 0, 1), syT1 = () => Date.UTC(SY1 + 1, 0, 1) - 1;
const inYears = i => syFull() || (TV[i] >= syT0() && TV[i] <= syT1());
const born = i => senseT == null || (TV[i] <= senseT && !(POP[i] > popNow));   // on the timeline, a note shows once its date has passed (and its pop has started)
const shownAt = i => view === "sense" ? inYears(i) && born(i) : born(i);   // scheduled pops stay hidden until they burst
const VV = i => vis[i] && shownAt(i);
let senseTrail = [];                              // (kept empty: the averaged trail was replaced by popcorn)
const SPEEDS = {xslow: [12, 6000/1100], slow: [6, 4000/1100], normal: [2.6, 1.6], fast: [1, 1]};   // shifted one notch slower (Nick, Oct 11)   // [step ×, flight ×]: slow spaces the arrivals out more than it slows each flight, so fewer overlap and more names show
let senseSpeed = SPEEDS[pref("iv-sspeed", "normal")] ? pref("iv-sspeed", "normal") : "normal";
const POP = new Float64Array(n), popMs = () => 1100*SPEEDS[senseSpeed][1], stepMs = () => (senseStep === "week" ? 240 : 520)*SPEEDS[senseSpeed][0];   // when each note pops (performance.now ms); 0 = no pop
let popNow = 0, popEnd = 0, popping = false, popFrozen = false, frozenAt = 0;
function popLoop(){ if (popFrozen) { popping = false; return; } popNow = performance.now(); render(); if (popNow < popEnd + Math.max(popMs()*1.6, LINGER()) + 30) RAF(popLoop); else { popping = false; popEnd = 0; buildGrid(); draw(); } }
function senseGuides(){
  const cx = sx(SC_.x), cy = sy(SC_.y), R = SR0*k*1.08;
  if (senseT != null) drawWatermark(cx, cy - R*.06, R*.42, css.ink, .11);
  ARCH4.forEach(([, qx, qy, col]) => { ctx.fillStyle = col; ctx.globalAlpha = parseFloat(css.qa) || .07; ctx.fillRect(qx < 0 ? cx - R : cx, qy > 0 ? cy - R : cy, R, R); });
  ctx.globalAlpha = 1; ctx.strokeStyle = css.ink; ctx.globalAlpha = .55; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = css.line; ctx.setLineDash([2,4]); ctx.beginPath();
  for (const f of [-.5, .5]) { ctx.moveTo(cx + f*R, cy - R); ctx.lineTo(cx + f*R, cy + R); ctx.moveTo(cx - R, cy + f*R); ctx.lineTo(cx + R, cy + f*R); }
  ctx.stroke(); ctx.setLineDash([]);
}
function senseLabels(){
  const cx = sx(SC_.x), cy = sy(SC_.y), R = SR0*k*1.08;
  ctx.lineWidth = 5; ctx.strokeStyle = css.bg; ctx.lineJoin = "round";
  const put = (t, x, y, font, col, align) => { ctx.font = font; ctx.textAlign = align || "center"; ctx.fillStyle = col; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
  const ax = `500 12px ${css.mono}`;
  ctx.textBaseline = "middle";
  put("REFLECTION", cx - R - 10, cy, ax, css.muted, "right"); put("EXPRESSION", cx + R + 10, cy, ax, css.muted, "left");
  put("TOP-DOWN", cx, cy - R - 16, ax, css.muted); put("BOTTOM-UP", cx, cy + R + 16, ax, css.muted);
  // archetype names, with the share of notes in view (and, while the timeline runs, the share of the last 90 days)
  const all = [0,0,0,0], recent = [0,0,0,0]; let ta = 0, tr = 0;
  for (let i=0;i<n;i++) { if (!VV(i)) continue; const qd = quadOf(i); all[qd]++; ta++; if (senseT != null && TV[i] > senseT - SENSE_WIN) { recent[qd]++; tr++; } }
  ARCH4.forEach(([name, qx, qy, col0, colD], j) => { const col = root.dataset.theme === "dark" || root.dataset.theme === "lyt" ? col0 : colD;
    const x = cx + qx*R*.5, y = cy - qy*(R + 42);   // names sit just outside the box, clear of the notes
    put(name, x, y, `${css.dw} ${Math.max(15, Math.min(26, R/18))}px ${css.display}`, css.ink);
    const pc = ta ? Math.round(all[j]*100/ta) : 0;
    put(`${pc}% of notes` + (senseT != null && tr ? ` · ${Math.round(recent[j]*100/tr)}% lately` : ""), x, y + (qy > 0 ? 22 : -22), `500 11px ${css.mono}`, col);
  });
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  drawPops();
}
// the timeline's arrivals (Sensemaking and Starfield): popcorn, comets, rain, swirl out, swirl in.
// The centre each note flies from is the middle of the 2×2, or in Starfield its own galaxy's core.
// the date behind the map while the timeline runs: the year huge, the month under it, and the week when stepping by week
let senseStepStart = null;
function drawWatermark(cx, cy, size, col, alpha){
  const d = new Date(senseStepStart != null ? senseStepStart : senseT), y = d.getUTCFullYear();
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `${css.dw} ${Math.round(size)}px ${css.display}`; ctx.fillText(String(y), cx, cy);
  ctx.font = `500 ${Math.round(size*.24)}px ${css.mono}`; ctx.fillText(MON[d.getUTCMonth()].toUpperCase(), cx, cy + size*.72);
  if (senseStep === "week") { ctx.font = `500 ${Math.round(size*.15)}px ${css.mono}`; ctx.fillText(`WEEK ${Math.floor((d - Date.UTC(y, 0, 1))/(7*DAY)) + 1}`, cx, cy + size*1.02); }
  ctx.restore(); }
// arrivals' names: shown while a note arrives and for a while after (they linger), clickable like any label
const LINGER = () => popMs() + Math.max(2800, popMs()*1.6);
function arrivalLabels(taken, fly){
  const now = popNow, L = LINGER(), F = popMs(), cand = [];
  for (let i=0;i<n;i++) { const t0 = POP[i]; if (!t0 || now < t0 || now - t0 >= L || !VV(i)) continue; cand.push(i); }
  if (!cand.length) return;
  const busy = cand.length*F/L;   // about how many arrive at once
  cand.sort((a,b) => N[b].level - N[a].level || N[b].score - N[a].score);
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  for (const i of cand) { const lv = N[i].level; if (!(lv >= 4 || (lv === 3 && busy <= 30) || busy <= 14)) continue;
    const p = fly && fly.get(i), x = p ? p[0] : sx(X[i]), y = p ? p[1] : sy(Y[i]) - Math.max(2, rad(i)) - 3;
    const t_ = N[i].title, tw = t_.length*(lv >= 4 ? 7.6 : 6.6), bx = [x - tw/2, y - 17, tw, 17];
    if (LH.some(q => q[4] === i) || taken.some(q => bx[0] < q[0]+q[2] && bx[0]+bx[2] > q[0] && bx[1] < q[1]+q[3] && bx[1]+bx[3] > q[1])) continue;
    taken.push(bx); LH.push(bx.concat(i));
    const a = (now - POP[i])/L; ctx.globalAlpha = a < .8 ? 1 : (1 - a)/.2; ctx.font = `600 ${lv >= 4 ? 14 : 12}px ${css.body}`;
    ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.strokeText(t_, x, y); ctx.fillStyle = css.ink; ctx.fillText(t_, x, y); }
  ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }
function drawGrowth(){
  const now = popNow, D_ = popMs(), taken = LH.map(b => b.slice(0, 4)), named = new Set(LH.map(b => b[4]));   // the map's own labels are already there: don't write over them
  if ((view === "emergence" || view === "spacetime") && mode === "time") { const x = sx(xTime(Math.min(senseT, T1))); ctx.strokeStyle = css.accent; ctx.globalAlpha = .55; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);   // the "now" line sweeping across the years
    ctx.beginPath(); ctx.moveTo(x, sy(0) - 20); ctx.lineTo(x, H); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  const ups = []; for (let i=0;i<n;i++) if (LVUP[i] && now - LVUP[i] < D_*1.6 && VV(i)) ups.push(i);
  ups.sort((a,b) => N[b].level - N[a].level || N[b].score - N[a].score);
  for (const i of ups) { const e = (now - LVUP[i])/(D_*1.6), x = sx(X[i]), y = sy(Y[i]), r = Math.max(3, rad(i)), lv = N[i].level, col = GRAD[lv] ? GRAD[lv][0] : css.accent;
    for (const lag of [0, .2]) { const g = (e - lag)/(1 - lag); if (g <= 0) continue; ctx.globalAlpha = .7*Math.pow(1 - g, 1.4); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r*(1.5 + 7*g), 0, 6.2832); ctx.stroke(); }
    const t_ = `${N[i].title} ↑ ${lv}`, tw = t_.length*6.6, bx = [x - tw/2, y - r - 22, tw, 16];
    if ((lv >= 3 || ups.length <= 12) && !named.has(i) && !taken.some(q => bx[0] < q[0]+q[2] && bx[0]+bx[2] > q[0] && bx[1] < q[1]+q[3] && bx[1]+bx[3] > q[1])) { taken.push(bx); LH.push(bx.concat(i)); named.add(i);
      ctx.globalAlpha = e < .7 ? 1 : (1 - e)/.3; ctx.font = `600 ${lv >= 4 ? 14 : 12}px ${css.body}`; ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.strokeText(t_, x, y - r - 6); ctx.fillStyle = css.ink; ctx.fillText(t_, x, y - r - 6); } }
  arrivalLabels(taken, null);
  for (let i=0;i<n;i++) { const t0 = POP[i]; if (!t0 || now < t0 || now - t0 >= D_ || !vis[i]) continue;   // new notes: a soft bloom where they land
    const e = (now - t0)/D_, x = sx(X[i]), y = sy(Y[i]), r = Math.max(2, rad(i));
    ctx.globalAlpha = .3*(1 - e); ctx.fillStyle = css.accent; ctx.beginPath(); ctx.arc(x, y, r*(1 + 1.8*(1 - e)), 0, 6.2832); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}
function popCentre(i){
  if (view === "stars") { const b = BOD[i] >= 0 ? BODIES[BOD[i]] : null;
    return b ? (([bx_, by_]) => [sx(bx_), sy(by_), Math.max(40, b.r*k*1.25)])(bodyPos(b)) : [sx(UC.x), sy(UC.y), Math.max(60, (UB.x1 - UB.x0)*k*.3)]; }
  return [sx(SC_.x), sy(SC_.y), SR0*k*1.25];
}
function drawPops(){
  if (senseT != null && POP.some(v => v)) { const now = popNow, few = [], fly = new Map();
    for (let i=0;i<n;i++) { const t0 = POP[i]; if (!t0 || now < t0 || now - t0 >= popMs() || !vis[i] || (view === "sense" && !inYears(i))) continue; few.push(i); }
    few.sort((a,b) => N[a].level - N[b].level);
    ctx.textAlign = "center"; ctx.textBaseline = "bottom"; const taken = LH.map(b => b.slice(0, 4));
    few.sort((a,b) => N[b].level - N[a].level || N[b].score - N[a].score);   // biggest names claim label space first; draw order doesn't matter much
    for (const i of few) { const e = (now - POP[i])/popMs(), lv = N[i].level, col = view === "stars" ? SPAL[SC[i]] : ARCH4[quadOf(i)][3], r = Math.max(2.2, rad(i));
      const hx = sx(X[i]), hy = sy(Y[i]); let x = hx, y = hy, sc = 1;
      if (senseFx === "pop") {   // popcorn: burst big, hop, settle
        const burst = e < .14 ? e/.14 : 1, settle = e < .14 ? 0 : (e - .14)/.86, big = (2.6 + lv*1.3)/Math.sqrt(1 + few.length/20);
        sc = e < .14 ? 1 + big*Math.sin(burst*Math.PI/2) : 1 + big*Math.pow(1 - settle, 2.4) - .25*Math.sin(settle*Math.PI*2)*(1 - settle);
        y = hy - Math.sin(Math.min(1, e*1.15)*Math.PI)*(10 + lv*4);
        ctx.globalAlpha = .45*Math.pow(1 - e, 2); ctx.strokeStyle = col; ctx.lineWidth = 1.2;   // the shock ring
        ctx.beginPath(); ctx.arc(hx, hy, r*(1.6 + 6*Math.sqrt(e)), 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = .9 - .35*e; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = .9*(1 - e); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x - r*sc*.25, y - r*sc*.25, r*sc*.35, 0, 6.2832); ctx.fill(); }
      else if (senseFx === "comet") {   // comets: streak in from the rim, along the line out from the centre, trailing light
        const [cx0, cy0, Rr] = popCentre(i), dx = hx - cx0, dy = hy - cy0, d = Math.hypot(dx, dy) || 1, ux = dx/d, uy = dy/d;
        const sxp = cx0 + ux*Rr + uy*Rr*.35*(gauss(N[i].path, 71)), syp = cy0 + uy*Rr - ux*Rr*.35*(gauss(N[i].path, 71));   // a slight curve, different per note
        const at = f => { const q = 1 - Math.pow(1 - Math.min(1, f), 3), bx = (sxp + hx)/2 + uy*40, by = (syp + hy)/2 - ux*40;
          return [(1-q)*(1-q)*sxp + 2*(1-q)*q*bx + q*q*hx, (1-q)*(1-q)*syp + 2*(1-q)*q*by + q*q*hy]; };
        const fly = Math.min(1, e/.7); [x, y] = at(fly);
        if (fly < 1) { ctx.lineCap = "round"; for (let s = 0; s < 6; s++) { const f0 = Math.max(0, fly - (s + 1)*.05), f1 = Math.max(0, fly - s*.05), [ax, ay] = at(f0), [bx2, by2] = at(f1);
            ctx.globalAlpha = .55*(1 - s/6); ctx.strokeStyle = col; ctx.lineWidth = r*1.6*(1 - s/7); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.stroke(); } }
        else { const g = (e - .7)/.3; ctx.globalAlpha = .6*(1 - g); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, r*(1 + 4*g), 0, 6.2832); ctx.fill(); }   // a flash on landing
        sc = fly < 1 ? 1.6 : 1; ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.globalAlpha = fly < 1 ? .9 : .9*(1 - (e - .7)/.3); ctx.beginPath(); ctx.arc(x, y, r*sc*.45, 0, 6.2832); ctx.fill(); }
      else if (senseFx === "swirl" || senseFx === "swirlin") {   // swirl out: born at the core, spiralling out along an arm; swirl in: drawn in from the rim, like a galaxy forming
        const [cx0, cy0, Rr] = popCentre(i), dx = hx - cx0, dy = hy - cy0, rf = Math.hypot(dx, dy), th = Math.atan2(dy, dx), turns = 1.1 + .35*gauss(N[i].path, 73), inw = senseFx === "swirlin";
        const r0 = Math.max(rf*1.6, Rr*1.15);
        const at = q => { const rr = inw ? rf + (r0 - rf)*Math.pow(1 - q, 1.3) : rf*Math.pow(q, .85), a = th - turns*2*Math.PI*(1 - q) /* clockwise on screen, in and out */; return [cx0 + rr*Math.cos(a), cy0 + rr*Math.sin(a)]; };
        const fly = Math.min(1, e/.8), q = 1 - Math.pow(1 - fly, 2.2); [x, y] = at(q);
        if (fly < 1) for (let s = 1; s <= 16; s++) { const [tx_, ty_] = at(Math.max(0, q - s*.028)); ctx.globalAlpha = .6*(1 - s/17)*(1 - fly*.3); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tx_, ty_, r*Math.max(.25, 1.1 - s*.055), 0, 6.2832); ctx.fill(); }
        else { const g = (e - .8)/.2; ctx.globalAlpha = .5*(1 - g); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, r*(1.4 + 3*g), 0, 6.2832); ctx.stroke(); }
        sc = fly < 1 ? 1.4 : 1; ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.globalAlpha = fly < 1 ? .85 : 0; ctx.beginPath(); ctx.arc(x, y, r*sc*.4, 0, 6.2832); ctx.fill(); }
      else {   // rain: a soft landing with two ripples
        for (const lag of [0, .22]) { const g = (e - lag)/(1 - lag); if (g <= 0) continue;
          ctx.globalAlpha = .5*Math.pow(1 - g, 1.5); ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(hx, hy, r*(1 + 9*g), r*(1 + 9*g)*.55, 0, 0, 6.2832); ctx.stroke(); }
        const drop = Math.min(1, e/.18); y = hy - (1 - drop)*(1 - drop)*24; sc = 1 + (1 - drop)*.8;
        ctx.globalAlpha = .35 + .6*drop; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill(); }
      fly.set(i, [x, y - r*sc - 4]); }
    ctx.globalAlpha = 1; arrivalLabels(taken, fly); }
}
const senseDateLabel = t => { const d = new Date(t); return senseStep === "week" ? `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// ---- the timeline bar: ▶ / ❚❚, Month | Week, a scrubber, the date, and × to show everything ----
let senseStep = pref("iv-sstep", "month") === "week" ? "week" : "month", senseFx = ["pop","comet","rain","swirl","swirlin"].includes(pref("iv-sfx", "pop")) ? pref("iv-sfx", "pop") : "pop", sensePlaying = false, senseTimer = 0;
function GROWV(){ return view === "emergence" || view === "spacetime" || view === "gravity" || view === "arc" || view === "chord"; }   // maps where the time-lapse regrows levels
function senseSteps(){ const out = [], grow = GROWV(); let t = Date.UTC(grow ? fromY : SY0, 0, 1); const T_END = grow ? T1 : Math.min(T1, syT1());
  while (t <= T_END) { out.push(t); if (senseStep === "week") t += 7*DAY; else { const d = new Date(t); t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); } }
  return out; }
let SSTEPS = senseSteps();
function senseSet(idx, rebuildTrail){
  idx = Math.max(0, Math.min(SSTEPS.length - 1, idx)); const t = SSTEPS[idx];
  // monthly steps end at the end of their month, weekly at the end of their week
  const end = senseStep === "week" ? t + 7*DAY - 1 : Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1) - 1;
  const prev = senseT; senseT = end; senseStepStart = t; $("#tlrange").value = idx; $("#tldate").textContent = senseDateLabel(t);
  if (rebuildTrail || prev == null || end <= prev) { POP.fill(0); popEnd = 0; unfreeze(false); }
  else { const now = performance.now(); let any = false;   // spread this month's notes over the step, in the order they were made
    for (let i=0;i<n;i++) { const tv = TV[i]; if (!(tv > prev && tv <= end) || !vis[i] || (view === "sense" && !inYears(i))) continue;
      POP[i] = now + (tv - prev)/(end - prev)*stepMs()*.92; if (POP[i] > popEnd) popEnd = POP[i]; any = true; }
    if (any) { popNow = now; if (!popping) { popping = true; RAF(popLoop); } } }
  if (GROWV()) { growAt(end); tlGlide = true; morph(true); if (LVUP.some(v => v > performance.now() - 50)) { popEnd = Math.max(popEnd, performance.now()); if (!popping) { popping = true; RAF(popLoop); } } }
  buildGrid(); draw(); legend();
}
let tlGlide = false;   // a timeline step is moving notes: don't re-frame a selected note each step
function senseClear(){ senseStop(); unfreeze(false); senseT = null; senseTrail = []; if (GROWN) { ungrow(); morph(true); } $("#tlrange").value = SSTEPS.length - 1; $("#tldate").textContent = "All time"; buildGrid(); draw(); legend(); }
function senseStop(){ sensePlaying = false; win.clearTimeout(senseTimer); $("#tlplay").textContent = "▶"; $("#tlplay").setAttribute("aria-label", "Play the years"); }
function senseTick(){ if (!sensePlaying) return; const i = +$("#tlrange").value;
  if (i >= SSTEPS.length - 1) { senseStop(); return; }
  senseSet(i + 1, false); senseTimer = win.setTimeout(senseTick, stepMs()); }
function tlWander(){ senseStop(); popFrozen = true; frozenAt = performance.now(); const b = $("#tlplay"); b.textContent = "▶ Resume"; b.classList.add("resume"); b.setAttribute("aria-label", "Resume the timeline"); }
function unfreeze(shift){ if (!popFrozen) return; popFrozen = false; $("#tlplay").classList.remove("resume");
  if (shift) { const d = performance.now() - frozenAt; for (let i=0;i<n;i++) { if (POP[i]) POP[i] += d; if (LVUP[i]) LVUP[i] += d; } if (popEnd) popEnd += d; }
  if (!sensePlaying) { $("#tlplay").textContent = "▶"; } }
function sensePlay(){ if (sensePlaying) { senseStop(); return; }
  if (popFrozen) { unfreeze(true); if (!popping) { popping = true; RAF(popLoop); } }
  if (senseT == null || +$("#tlrange").value >= SSTEPS.length - 1) senseSet(0, true);
  sensePlaying = true; $("#tlplay").textContent = "❚❚"; $("#tlplay").setAttribute("aria-label", "Pause"); senseTimer = win.setTimeout(senseTick, 300); }
function placePlaybar(){ const pb = $("#playbar"), tb = $("#timebar");   // Sensemaking and Starfield (desktop): autoplay sits just under the timeline bar, however many rows it wraps to
  pb.style.top = !isPhone() && !tb.hidden && (view === "sense" || view === "stars" || view === "gravity" || view === "chord") ? (tb.offsetTop + tb.offsetHeight + 8) + "px" : "";
  const db = $("#driftbar"); db.hidden = !(view === "stars" && S3D); if (db.hidden) driftStop();
  db.style.top = !isPhone() && pb.style.top ? (pb.offsetTop + pb.offsetHeight + 8) + "px" : ""; }
on(win, "resize", () => placePlaybar());
function syncTimebar(){ const on = true; win.setTimeout(placePlaybar, 0);
  root.querySelectorAll("#tlstep button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.s === senseStep)));
  root.querySelectorAll("#tlfx button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === senseFx)));
  root.querySelectorAll("#tlspeed button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === senseSpeed))); $("#timebar").hidden = !on; if (!on) { senseStop(); if (senseT != null) { senseT = null; senseTrail = []; } }
 }
let morphing = false;
// Moves notes to their new places. With cam, the camera's destination is worked out from where the
// notes will land, and camera and notes move in the same frames (one motion, not two).
let morphId = 0;
function morph(animate, cam){
  if (view === "gravity") layoutGravity(); else if (view === "stars") layoutStars(); else if (view === "sense") layoutSense(); else if (view === "arc") layoutArc(); else if (view === "chord") layoutChord(); else if (view === "spacetime") layoutSpace();
  const tX = view === "spacetime" ? XT : view === "gravity" ? GX : view === "stars" ? (S3D ? (project3D(), P3X) : SX) : view === "sense" ? SNX : view === "arc" ? ARX : view === "chord" ? CHX : curX(), tY = view === "gravity" ? GY : view === "stars" ? (S3D ? P3Y : SY) : view === "sense" ? SNY : view === "arc" ? ARY : view === "chord" ? CHY : view === "spacetime" ? YST : YE;
  const c1 = cam ? cam(tX, tY) : null;
  if (!animate || win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    X.set(tX); Y.set(tY); buildGrid(); if (c1) { k = c1.k; tx = c1.tx; ty = c1.ty; } draw(); return; }
  const fX = Float32Array.from(X), fY = Float32Array.from(Y), t0 = performance.now(), dur = 750, id = ++morphId;
  const c0 = {k, tx, ty};
  morphing = true; hover = -1; camBusy = id;
  const step = now => { if (id !== morphId) return;   // a newer move took over
    const p = Math.min(1, (now - t0)/dur), e = p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
    for (let i=0;i<n;i++) { X[i] = fX[i] + (tX[i]-fX[i])*e; Y[i] = fY[i] + (tY[i]-fY[i])*e; }
    if (c1) { // interpolate zoom in log space so zooming feels even, and keep the frame's center on its path
      const kk = Math.exp(Math.log(c0.k) + (Math.log(c1.k) - Math.log(c0.k))*e);
      const cx0 = (W/2 - c0.tx)/c0.k, cy0 = (H/2 - c0.ty)/c0.k, cx1 = (W/2 - c1.tx)/c1.k, cy1 = (H/2 - c1.ty)/c1.k;
      const cx = cx0 + (cx1 - cx0)*e, cy = cy0 + (cy1 - cy0)*e;
      k = kk; tx = W/2 - cx*kk; ty = H/2 - cy*kk; }
    render(); if (p < 1) RAF(step);
    else { morphing = false; camBusy = 0; buildGrid(); if (!c1 && sel >= 0 && !tlGlide) flyTo(sel); tlGlide = false; } };
  RAF(step);
}
let camBusy = 0;
function setView(v){
  if (v === view) return;
  if (view === "chord") { chPin = -1; chArc = -1; tip.hidden = true; tip.classList.remove("arc"); }
  if (senseT != null) { senseStop(); unfreeze(false); senseT = null; POP.fill(0); popEnd = 0; $("#tldate").textContent = "All time"; }
  if (v === "spacetime" && mode !== "time") { modeKeep = mode; mode = "time"; }
  else if (view === "spacetime" && v !== "spacetime" && modeKeep) { mode = modeKeep; modeKeep = null; }
  root.querySelectorAll("#xseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.x === mode)));
  ungrow(); view = v; save("iv-view", v); SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1;
  root.querySelectorAll("#vseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === view)));
  root.dataset.view = view; syncTimebar();
  syncRange(); legend(); morph(true, () => fitTarget());
  { const bb = root.querySelector(`#vseg button[data-v="${view}"]`); if (bb && isPhone()) bb.scrollIntoView({inline:"nearest", block:"nearest"}); }
}
function setMode(m){
  if (m === mode || view === "spacetime") return;   // Space-Time is always by time
  win.setTimeout(() => { if (sel >= 0) select(sel, true); }, 0); mode = m; save("iv-x", m);
  root.querySelectorAll("#xseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.x === mode)));
  syncRange(); layoutProp(); legend(); morph(true);
}
function relayout(animate, rescored, cam){
  if (rescored) { rescore(); layoutY(); starsDirty = true; order.sort((a,b) => (N[b].level - N[a].level) || (N[b].score - N[a].score)); }
  computeVis(); layoutACE(); layoutTime(); layoutProp();
  if (sel >= 0 && !vis[sel]) select(-1);
  if (typeof renderTrail === "function" && trail.length) renderTrail();
  updateCounts(); morph(animate, cam);
}

// ---------- ARC map (HIPPO): Add → Relate → Communicate, three lanes; up is emergence level, left to right in a lane is time ----------
// Each note sits in the stage it mostly embodies (rules, no AI needed; the Sensemaking AI pass sharpens Communicate when present).
const ARX = new Float32Array(n), ARY = new Float32Array(n), ARS = new Int8Array(n), ARW = new Array(n);
const ARC_L = [{name:"Add", sub:"Spark → Remark", x0:200, x1:1150}, {name:"Relate", sub:"Architect ↔ Gardener", x0:1230, x1:2180}, {name:"Communicate", sub:"Ideation → Expression", x0:2260, x1:3180}];
const ARC_COLL = new Set(["works","drafts","newsletters","scripts","posts","videos","courses","products","talks","essays","articles"]);
function arcStage(d, i){
  const p = d.path, c = new Set((d.collections || []).map(x => String(x).replace(/^\[\[|\]\]$/g, "").split("/").pop().toLowerCase()));
  if (/^Calendar\/(Days|Journal|Journals)\//.test(p)) return [0, "a daily or journal note"];
  if (p.startsWith("+/")) return [0, "in the inbox"];
  if (/Atlas\/Sources\/|Clippings|Readwise/.test(p)) return [0, "a source, captured"];
  if (p.startsWith("Efforts/Works/")) return [2, "a work, made for others"];
  if (/^Efforts\/Projects\//.test(p)) return [2, "a project, aimed at shipping"];
  if ([...c].some(k_ => ARC_COLL.has(k_))) return [2, "in a works collection"];
  const ai = typeof SAI !== "undefined" && SAI && SAI.notes[p];
  if (ai && ai[0] >= .5) return [2, `read as expression by the AI pass (“${ai[2]}”)`];
  if (d.level === 1) return [0, "not linked yet"];
  return [1, d.is_map ? "a map, relating ideas" : "linked: relating ideas"];
}
{
  for (let i=0;i<n;i++) { const [st, why] = arcStage(N[i], i); ARS[i] = st; ARW[i] = why; } }
function layoutArc(){
  const t0 = Date.UTC(SLMIN, 0, 1), span = Math.max(1, T1 - t0);
  for (let i=0;i<n;i++) { const L = ARC_L[ARS[i]], w = L.x1 - L.x0, j = hash(N[i].path, 21);
    const f = isNaN(TV[i]) ? j*.06 : .08 + .9*Math.max(0, Math.min(1, (TV[i] - t0)/span)) + (j - .5)*.012;
    ARX[i] = L.x0 + 12 + f*(w - 24); ARY[i] = YE[i]; }
}
function arcGuides(){
  for (const L of ARC_L) { const a = sx(L.x0), b = sx(L.x1);
    ctx.fillStyle = css.accent; ctx.globalAlpha = .035; ctx.fillRect(a, sy(0) - 8, b - a, sy(WH) - sy(0) + 8); ctx.globalAlpha = 1;
    ctx.strokeStyle = css.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.round(a)+.5, sy(0) - 8); ctx.lineTo(Math.round(a)+.5, sy(WH)); ctx.moveTo(Math.round(b)+.5, sy(0) - 8); ctx.lineTo(Math.round(b)+.5, sy(WH)); ctx.stroke(); }
}
function arcHeaders(yTop){
  const cnt = [0,0,0]; for (let i=0;i<n;i++) if (VV(i)) cnt[ARS[i]]++;
  ctx.lineWidth = 5; ctx.strokeStyle = css.bg; ctx.textBaseline = "alphabetic";
  ARC_L.forEach((L, s) => { const x = Math.max(sx(L.x0) + 6, 8); if (sx(L.x1) < 60 || x > W) return;
    ctx.font = `${css.dw} 22px ${css.display}`; ctx.fillStyle = css.ink; ctx.strokeText(L.name, x, yTop); ctx.fillText(L.name, x, yTop);
    const nw = ctx.measureText(L.name).width;
    ctx.font = `500 11px ${css.mono}`; ctx.fillStyle = css.muted; const t = `${L.sub} · ${cnt[s].toLocaleString()}`;
    ctx.strokeText(t, x + nw + 10, yTop); ctx.fillText(t, x + nw + 10, yTop);
    if (s < 2) { const ax = sx(L.x1) + (sx(ARC_L[s+1].x0) - sx(L.x1))/2; ctx.font = `${css.dw} 20px ${css.display}`; ctx.fillStyle = css.accent; ctx.textAlign = "center"; ctx.fillText("→", ax, yTop); ctx.textAlign = "left"; } });
}

// ---------- Chord map (OCTOPUS): every note on an outer ring, grouped by kind; links cross the middle ----------
// Categories are subfolders big enough to stand alone (60+ notes), else "<folder> · other"; the x/z archive is its own arc.
const CHX = new Float32Array(n), CHY = new Float32Array(n), CHC = new Int16Array(n);
const CH_C = {x: WW/2, y: WH/2}, CH_R = 820;
const CH_HUE = {"+":"#d99a2b", "Atlas":"#3f7fd0", "Calendar":"#2f9f78", "Efforts":"#d0503f", "x":"#8b8b95"};
const CHCAT = (() => {
  const by = new Map(); const key = d => d.archive ? "x/z archive" : d.sub || d.ace;
  for (const d of N) by.set(key(d), (by.get(key(d)) || 0) + 1);
  const name = d => { const k_ = key(d); return d.archive || by.get(k_) >= 60 ? k_ : `${d.ace} · other`; };
  const cats = new Map(); N.forEach((d,i) => { const nm = name(d); if (!cats.has(nm)) cats.set(nm, {name:nm, ace: d.archive ? "x" : d.ace, ids:[]}); cats.get(nm).ids.push(i); });
  const order = ["+","Atlas","Calendar","Efforts","x"], list = [...cats.values()].sort((a,b) => order.indexOf(a.ace) - order.indexOf(b.ace) || (a.name.endsWith("· other") - b.name.endsWith("· other")) || b.ids.length - a.ids.length);
  list.forEach((c, j) => { c.id = j; c.short = c.name === "x/z archive" ? c.name : c.name === "+" ? "+" : c.name === "+ · other" ? "+ · other" : c.name.includes(" · other") ? c.name : c.name.split("/").pop(); for (const i of c.ids) CHC[i] = j; });
  // angles: share by count^0.6 so the big folders don't swallow the ring; small gaps between kinds, bigger between ACE folders
  const gapIn = .012, gapAce = .05; let tot = 0; list.forEach(c => tot += Math.pow(c.ids.length, .6));
  let gaps = 0; list.forEach((c, j) => gaps += j && list[j-1].ace !== c.ace ? gapAce : j ? gapIn : 0); gaps += gapAce;
  let a = Math.PI + gapAce/2; const room = 2*Math.PI - gaps;
  list.forEach((c, j) => { if (j) a += list[j-1].ace !== c.ace ? gapAce : gapIn; c.a0 = a; a += room*Math.pow(c.ids.length, .6)/tot; c.a1 = a; });
  return list; })();
// bundled ribbons between kinds (body, up and related links): drawn faintly as the default picture
let ribKey = null, CH_RIB = [];
function chRibbons(){   // counted among the notes shown (and, on the timeline, born by then), so the ribbons grow with the vault
  let nv = 0; for (let i=0;i<n;i++) if (vis[i]) nv++;
  const key_ = (senseT == null ? "all" : senseT) + ":" + nv; if (key_ === ribKey) return CH_RIB; ribKey = key_;
  const m = new Map(), on = i => vis[i] && (senseT == null || !(TV[i] > senseT));
  for (const [a,b,t] of E) { if (t === 2 || t === 3 || t === 5 || !on(a) || !on(b)) continue; const p = CHC[a], q = CHC[b]; if (p === q) continue; const kk = p < q ? p*1000 + q : q*1000 + p; m.set(kk, (m.get(kk) || 0) + 1); }
  CH_RIB = [...m].map(([kk, c]) => ({p: Math.floor(kk/1000), q: kk % 1000, c})).filter(r => r.c >= 3).sort((a,b) => a.c - b.c); return CH_RIB; }
function layoutChord(){
  for (const c of CHCAT) { const ids = c.ids.slice().sort((a,b) => (isNaN(TV[a]) ? -1 : TV[a]) - (isNaN(TV[b]) ? -1 : TV[b])), m = ids.length;
    ids.forEach((i, j) => { const a = c.a0 + (c.a1 - c.a0)*((j + .5)/m), lv = N[i].level, h = hash(N[i].path, 23);
      const r = CH_R*(lv >= 3 ? 1.0 + .012*(lv - 3) : lv === 2 ? .955 + .03*h : .91 + .035*h);   // higher levels sit on the outer edge of the band
      CHX[i] = CH_C.x + r*Math.cos(a); CHY[i] = CH_C.y + r*Math.sin(a); }); }
}
const chHue = c => CH_HUE[c.ace] || "#888";
let chArc = -1, chPin = -1;   // the arc under the cursor, and the one clicked to hold its ribbons
const chOn = () => chArc >= 0 ? chArc : chPin;
function showArcTip(a){   // the arc tooltip, set beside the ring on the arc's own side, never over the ribbons
  const c = CHCAT[a], rows = chRibbons().filter(r => r.p === a || r.q === a).map(r => [CHCAT[r.p === a ? r.q : r.p].short, r.c]).sort((x,y) => y[1] - x[1]), tot = rows.reduce((t, r) => t + r[1], 0);
      html(tip).v = `<b>${esc(c.short)}</b><span>${c.ids.filter(j => VV(j)).length.toLocaleString()} notes · ${tot.toLocaleString()} links to other kinds</span>` + rows.slice(0, 12).map(([nm, ct]) => `<span class="trow"><i>${esc(nm)}</i><b>${ct.toLocaleString()}</b></span>`).join("") + (rows.length > 12 ? `<span>+ ${rows.length - 12} more kinds</span>` : "");
      tip.hidden = false; tip.classList.add("arc");   // set it beside the ring on the arc's own side, never over the ribbons
      const r = cv.getBoundingClientRect(), cx = r.left + sx(CH_C.x), cy = r.top + sy(CH_C.y), R0 = CH_R*k*1.45, am = (c.a0 + c.a1)/2, tw = tip.offsetWidth, th = tip.offsetHeight;
      let barB = 0; for (const id of ["timebar", "playbar", "driftbar"]) { const el = $("#" + id); if (el && !el.hidden && el.offsetParent) barB = Math.max(barB, el.getBoundingClientRect().bottom); }
      const yGuess = Math.max(r.top + 8, Math.min(cy + Math.sin(am)*CH_R*k - th/2, win.innerHeight - th - 8)), lc = isPhone() || yGuess > barB + 6 ? 8 : 410, roomR = win.innerWidth - 8 - (cx + R0), roomL = (cx - R0) - lc, right = Math.cos(am) >= 0 ? true : roomL < tw && roomR > roomL;   // the arc's own side; the right only if the left has no room   // the side with room, clear of the bars at the left
      let x = right ? cx + R0 : cx - R0 - tw; const y = Math.max(r.top + 8, Math.min(cy + Math.sin(am)*CH_R*k - th/2, win.innerHeight - th - 8));
      x = Math.max(8, Math.min(win.innerWidth - tw - 8, x));   // no room beside the ring: hug the window edge
      tip.style.left = x + "px"; tip.style.top = y + "px"; }
function chordArcAt(px, py){ const cx = sx(CH_C.x), cy = sy(CH_C.y), R0 = CH_R*k, d = Math.hypot(px - cx, py - cy);
  if (d < R0*.88 || d > R0*1.2) return -1; let a = Math.atan2(py - cy, px - cx);
  for (const c of CHCAT) for (const off of [0, 2*Math.PI, -2*Math.PI]) if (a + off >= c.a0 && a + off <= c.a1) return c.id; return -1; }
function chordGuides(){
  const cx = sx(CH_C.x), cy = sy(CH_C.y), R0 = CH_R*k;
  ctx.lineCap = "butt";
  for (const c of CHCAT) { ctx.strokeStyle = chHue(c); ctx.globalAlpha = .75; ctx.lineWidth = Math.max(3, R0*.03); ctx.beginPath(); ctx.arc(cx, cy, R0*1.07, c.a0, c.a1); ctx.stroke();
    ctx.globalAlpha = .05; ctx.lineWidth = R0*.12; ctx.beginPath(); ctx.arc(cx, cy, R0*.955, c.a0, c.a1); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // ribbons: one curve per pair of kinds, through the middle, width by how many links join them
  const hl = sel >= 0 ? sel : hover, fade = hl >= 0 ? .25 : 1, RIB = chRibbons(), mx = 900;   // width ∝ √(links between the two kinds); fixed scale, so ribbons visibly thicken over the years
  const CA = chOn();
  for (const r of RIB) { const mine = CA >= 0 && (r.p === CA || r.q === CA); if (CA >= 0 && !mine) { ctx.globalAlpha = .03; } const A = CHCAT[r.p], B = CHCAT[r.q], a = (A.a0 + A.a1)/2, b = (B.a0 + B.a1)/2, rr = R0*.9;
    if (CA >= 0 && mine) { const src = r.p === CA ? a : b, dst = r.p === CA ? b : a, g = ctx.createLinearGradient(cx + rr*Math.cos(src), cy + rr*Math.sin(src), cx + rr*Math.cos(dst), cy + rr*Math.sin(dst));
      g.addColorStop(0, chHue(CHCAT[CA])); g.addColorStop(.7, chHue(CHCAT[CA])); g.addColorStop(1, chHue(CHCAT[r.p === CA ? r.q : r.p])); ctx.strokeStyle = g; }   // the last 30% blends into the destination's color
    else ctx.strokeStyle = chHue(A); ctx.globalAlpha = CA >= 0 ? (mine ? .2 + .5*Math.sqrt(r.c/mx) : .025) : (.06 + .22*Math.sqrt(r.c/mx))*fade; ctx.lineWidth = Math.max(.6, Math.sqrt(r.c/mx)*R0*.06);
    ctx.beginPath(); ctx.moveTo(cx + rr*Math.cos(a), cy + rr*Math.sin(a)); ctx.quadraticCurveTo(cx, cy, cx + rr*Math.cos(b), cy + rr*Math.sin(b)); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function chordLabels(){
  const cx = sx(CH_C.x), cy = sy(CH_C.y), R0 = CH_R*k, cnt = new Map();
  if (chPin >= 0 && chArc < 0 && hover < 0 && !drifting) win.setTimeout(() => { if (view === "chord" && chPin >= 0 && chArc < 0 && hover < 0) showArcTip(chPin); }, 0);
  const CA = chOn();
  if (CA >= 0) { ctx.font = `600 11px ${css.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 4; ctx.strokeStyle = css.bg;
    for (const r of chRibbons()) { if (r.p !== CA && r.q !== CA) continue; const o = CHCAT[r.p === CA ? r.q : r.p], a = (o.a0 + o.a1)/2, x = cx + Math.cos(a)*R0*.8, y = cy + Math.sin(a)*R0*.8, t = r.c.toLocaleString();
      ctx.fillStyle = css.ink; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); } }
  for (let i=0;i<n;i++) if (VV(i)) cnt.set(CHC[i], (cnt.get(CHC[i]) || 0) + 1);
  ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.textBaseline = "middle"; const taken = [];
  for (const c of [...CHCAT].sort((p_, q_) => q_.ids.length - p_.ids.length)) { const span = (c.a1 - c.a0)*R0; if (span < 14) continue; const a = (c.a0 + c.a1)/2, x = cx + Math.cos(a)*R0*1.12, y = cy + Math.sin(a)*R0*1.12, right = Math.cos(a) >= 0;
    const al = Math.abs(Math.cos(a)) < .2 ? "center" : right ? "left" : "right"; ctx.textAlign = al;
    ctx.font = `600 ${span > 60 ? 13 : 11}px ${css.body}`; const tw = ctx.measureText(c.short).width + 6, bx = [al === "left" ? x : al === "right" ? x - tw : x - tw/2, y - 9, tw, span > 40 ? 32 : 18];
    if (taken.some(q => bx[0] < q[0]+q[2] && bx[0]+bx[2] > q[0] && bx[1] < q[1]+q[3] && bx[1]+bx[3] > q[1])) continue; taken.push(bx);
    ctx.fillStyle = css.ink; ctx.strokeText(c.short, x, y); ctx.fillText(c.short, x, y);
    if (span > 40) { ctx.font = `500 10px ${css.mono}`; ctx.fillStyle = css.muted; const t = (cnt.get(c.id) || 0).toLocaleString(); ctx.strokeText(t, x, y + 14); ctx.fillText(t, x, y + 14); } }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

// ---------- 3D Starfield: the same galaxies, each given a depth and a tilt, seen through a perspective camera ----------
// Drag to orbit, right-drag (or Shift-drag) to pan, scroll to fly in. Notes keep their places inside their galaxy's disk;
// nebulae and the old elliptical are puffy clouds. The projection is written into the map's own X/Y, so picking, labels,
// links, focus and the time-lapse all work unchanged.
let S3D = pref("iv-s3d", false) === true, yaw3 = .55, pitch3 = .62, s3dVer = -1;
const P3X = new Float32Array(n), P3Y = new Float32Array(n), DS3 = new Float32Array(n).fill(1), L3 = new Float32Array(3*n);
let B3 = [], SPAN3 = 1;
function build3D(){
  if (s3dVer === starVer) return; s3dVer = starVer;
  SPAN3 = Math.max(UB.x1 - UB.x0, UB.y1 - UB.y0, 1);
  B3 = BODIES.map(b => { const nm = (b.name || "") + b.kind, h1 = hash(nm, 31), h2 = hash(nm, 32), h3 = hash(nm, 33);
    const flat = b.kind === "gal" || b.kind === "dwarf" || b.kind === "home";
    const z = b.kind === "home" ? 0 : (h1 - .5)*SPAN3*.75, inc = b.kind === "home" ? .3 : (h2 - .5)*Math.PI*.9, phi = h3*2*Math.PI;
    // tilt the disk by inc around an axis lying in its plane at angle phi:  M = Rz(phi) · Rx(inc) · Rz(-phi)
    const cf = Math.cos(phi), sf = Math.sin(phi), ci = Math.cos(inc), si = Math.sin(inc);
    const Rz = (c, s) => [[c,-s,0],[s,c,0],[0,0,1]], Rx = [[1,0,0],[0,ci,-si],[0,si,ci]];
    const mul = (A, B) => A.map(r => [0,1,2].map(j => r[0]*B[0][j] + r[1]*B[1][j] + r[2]*B[2][j]));
    return {b, z, flat, M: mul(mul(Rz(cf, sf), Rx), Rz(cf, -sf))}; });
  for (let i=0;i<n;i++) { const bi = BOD[i], b = bi >= 0 ? BODIES[bi] : null, bx = b ? UC.x + b.x : UC.x, by = b ? UC.y + b.y : UC.y, h = hash(N[i].path, 34) - .5;
    L3[3*i] = SX[i] - bx; L3[3*i+1] = SY[i] - by;
    L3[3*i+2] = !b ? h*80 : B3[bi].flat ? h*b.r*(N[i].level >= 3 ? .05 : .12) : h*b.r*.9; }   // thin disks for galaxies, deep clouds for nebulae
}
function project3D(){
  build3D();
  const f = SPAN3*1.6, cy_ = Math.cos(yaw3), sy_ = Math.sin(yaw3), cp = Math.cos(pitch3), sp = Math.sin(pitch3);
  const cam = (x, y, z) => { const x1 = x*cy_ + z*sy_, z1 = -x*sy_ + z*cy_, y2 = y*cp - z1*sp, z2 = y*sp + z1*cp; return [x1, y2, z2]; };
  for (const B of B3) { const b = B.b, [x, y, z] = cam(b.x, b.y, B.z), s = f/Math.max(f*.25, f + z); B.px = UC.x + x*s; B.py = UC.y + y*s; B.s = s;
    const nz = [B.M[0][2], B.M[1][2], B.M[2][2]], [nx, ny, nzz] = cam(nz[0], nz[1], nz[2]); B.flatK = B.flat ? Math.max(.18, Math.abs(nzz)) : 1; B.ang = Math.atan2(ny, nx) + Math.PI/2; }
  for (let i=0;i<n;i++) { const bi = BOD[i], lx = L3[3*i], ly = L3[3*i+1], lz = L3[3*i+2];
    let wx_, wy_, wz_;
    if (bi >= 0) { const B = B3[bi], M = B.M; wx_ = BODIES[bi].x + M[0][0]*lx + M[0][1]*ly + M[0][2]*lz; wy_ = BODIES[bi].y + M[1][0]*lx + M[1][1]*ly + M[1][2]*lz; wz_ = B.z + M[2][0]*lx + M[2][1]*ly + M[2][2]*lz; }
    else { wx_ = lx; wy_ = ly; wz_ = lz; }
    const [x, y, z] = cam(wx_, wy_, wz_), s = f/Math.max(f*.25, f + z); P3X[i] = UC.x + x*s; P3Y[i] = UC.y + y*s; DS3[i] = Math.max(.45, Math.min(2.2, s)); }
}
const s3dOn = () => view === "stars" && S3D;
// ---- Drift: a screensaver for 3D Starfield. The camera circles the universe, its tilt sways, and every ~40 s it breathes in
// toward one galaxy (a different one each time, bigger ones more often) and back out again. Any touch, drag or scroll stops it.
let drifting = false, driftRaf = 0, driftT0 = 0, driftLast = 0, driftGal = -1, driftCyc = -1, driftK0 = 1, driftSpeed = "slow";
const DRIFT = {calm: [.018, 70], slow: [.035, 44], lively: [.07, 26]};   // [radians of orbit per second, seconds per in-and-out breath]
function driftPick(){ const gals = BODIES.filter(b => b.kind === "gal" && b.members.some(i => VV(i)));
  if (!gals.length) return -1; let tot = 0; for (const b of gals) tot += Math.sqrt(b.members.length);
  let r = Math.random()*tot; for (const b of gals) { r -= Math.sqrt(b.members.length); if (r <= 0 && b.id !== driftGal) return b.id; } return gals[0].id; }
function driftFrame(now){
  if (!drifting) return; driftRaf = RAF(driftFrame);
  const dt = Math.min(.1, (now - driftLast)/1000); driftLast = now; const [spin, breath] = DRIFT[driftSpeed], t = (now - driftT0)/1000;
  yaw3 += spin*dt; pitch3 = .62 + .38*Math.sin(t*2*Math.PI/(breath*1.7));
  project3D(); X.set(P3X); Y.set(P3Y);
  const cyc = Math.floor(t/breath), ph = (t % breath)/breath, inA = Math.pow(Math.sin(ph*Math.PI), 2);   // 0 far out → 1 close in → 0
  if (cyc !== driftCyc) { driftCyc = cyc; driftGal = driftPick(); }
  const lc = isPhone() ? 0 : 400, vx = lc + (W - lc - sideW())/2, vy = H/2;
  let gx = UC.x, gy = UC.y; if (driftGal >= 0 && B3[driftGal]) { gx = UC.x + (B3[driftGal].px - UC.x)*inA; gy = UC.y + (B3[driftGal].py - UC.y)*inA; }
  const kk = driftK0*(1 + 2.6*inA);
  // ease the camera rather than jump, so stopping and starting never jolts
  const cxw = (vx - tx)/k, cyw = (vy - ty)/k, e = Math.min(1, dt*1.6);
  const ncx = cxw + (gx - cxw)*e, ncy = cyw + (gy - cyw)*e; k = k + (kk - k)*e; tx = vx - ncx*k; ty = vy - ncy*k;
  render(); }
function driftStart(){ if (drifting || !s3dOn()) return; drifting = true; driftK0 = fitTarget().k*.95; driftT0 = driftLast = performance.now(); driftCyc = -1;
  $("#dplay").textContent = "❚❚"; $("#dplay").setAttribute("aria-label", "Stop drifting"); driftRaf = RAF(driftFrame); }
function driftStop(){ if (!drifting) return; drifting = false; win.cancelAnimationFrame(driftRaf); const b = $("#dplay"); if (b) { b.textContent = "▶"; b.setAttribute("aria-label", "Drift"); }
  buildGrid(); save("iv-cam3", [yaw3, pitch3]); draw(); }
function bodyPos(b){ if (s3dOn() && B3[b.id]) return [B3[b.id].px, B3[b.id].py]; return [UC.x + b.x, UC.y + b.y]; }
function halos3D(dim){   // in 3D the cached glow can't follow the camera: each galaxy gets a soft halo, flattened as its disk turns edge-on
  ctx.globalCompositeOperation = "lighter";
  const born = new Uint8Array(BODIES.length); for (let i=0;i<n;i++) if (BOD[i] >= 0 && VV(i)) born[BOD[i]] = 1;
  for (const B of B3) { const b = B.b; if (!born[b.id]) continue; const x = sx(B.px), y = sy(B.py), R = b.r*k*B.s*(b.kind === "neb" ? .9 : 1.15);
    if (x < -R*2 || x > W + R*2 || y < -R*2 || y > H + R*2) continue;
    const col = b.kind === "old" ? "#ff7a3c" : b.kind === "home" ? "#ffd27a" : b.hue || "#9fb0ff";
    ctx.save(); ctx.translate(x, y); ctx.rotate(B.ang); ctx.scale(1, B.flatK);
    ctx.globalAlpha = (b.kind === "neb" ? .35 : .55)*dim; ctx.drawImage(sprite(col), -R, -R, 2*R, 2*R);
    if (b.kind === "gal" || b.kind === "home") { ctx.globalAlpha = .7*dim; const r2 = R*.28; ctx.drawImage(sprite("#fff1d6"), -r2, -r2, 2*r2, 2*r2); }
    ctx.restore(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}

Y.set(YE); X.set(curX());
if (view === "arc") { layoutArc(); X.set(ARX); Y.set(ARY); }
else if (view === "chord") { layoutChord(); X.set(CHX); Y.set(CHY); }
else if (view === "gravity") { layoutGravity(); X.set(GX); Y.set(GY); }
else if (view === "stars") { layoutStars(); if (S3D) { project3D(); X.set(P3X); Y.set(P3Y); } else { X.set(SX); Y.set(SY); } }
else if (view === "sense") { layoutSense(); X.set(SNX); Y.set(SNY); }
else if (view === "spacetime") { layoutSpace(); X.set(XT); Y.set(YST); }
buildGrid();

// ---------- view ----------
let k = 1, tx = 0, ty = 0, W = 0, H = 0, dpr = 1;
let hover = -1, sel = -1, showAll = false;
const css = {};
const COLORS = ["bg","panel","line","ink","muted","accent","accent-soft","up","down","band-a","band-b","l2","l1","sl2","sl1","rel","upp","prop","edge-faint"];
let probe = null;   // colors go through the browser once, so the canvas gets plain rgb() even when a theme writes color-mix() or Obsidian's own variables
function readCss(){ const s = win.getComputedStyle(root);
  if (!probe) { probe = root.createSpan({ cls: "ivm-probe" }); }
  for (const v of ["qa","display","mono","body","dw"]) css[v] = s.getPropertyValue("--"+v).trim();
  for (const lv of [5, 4, 3]) for (const [j, ab] of ["a", "b"].entries()) { probe.setCssProps({ "--probe": s.getPropertyValue(`--g${lv}${ab}`).trim() }); GRAD[lv][j] = win.getComputedStyle(probe).color || GRAD[lv][j]; }   // level colors come from the theme
  for (const v of COLORS) { const raw = s.getPropertyValue("--"+v).trim(); probe.setCssProps({ "--probe": raw }); css[v] = win.getComputedStyle(probe).color || raw; } }
const isPhone = () => (root.clientWidth || win.innerWidth) <= 760;
// state classes the stylesheet keys off (instead of :has, which is slow to re-match): panel open, legend open, focus bar shown, a clear-× showing
function syncCls(){ const m = root.querySelector("main"), hd = root.querySelector("header"), a = root.querySelector("aside"), lg = root.querySelector("#legend"), fb = root.querySelector("#focusbar");
  if (m) { m.toggleClass("has-drawer", !!a && !a.hidden); m.toggleClass("legend-open", !!lg && !lg.classList.contains("collapsed")); }
  if (hd && fb) hd.toggleClass("has-fb", !fb.hidden);
  root.querySelectorAll(".ms").forEach(ms => { const x = ms.querySelector(":scope > .qx"); ms.toggleClass("has-x", !!x && !x.hidden); }); }
function resize(){ syncCls(); const r = cv.getBoundingClientRect(); dpr = Math.min(2, win.devicePixelRatio||1); const cx = W ? (W/2 - tx)/k : null, cy = H ? (H/2 - ty)/k : null; W = r.width; H = r.height; if (cx !== null && !morphing && r.width) { tx = W/2 - cx*k; ty = H/2 - cy*k; } cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); draw(); }
function fitTarget(){ const pad = 56;
  if (view === "sense") { const phone = isPhone(), lc = phone ? 0 : 400, tb = phone ? 58 : 16, pb = phone ? 70 : 16, vw = W - sideW() - lc;   // desktop: the bars live in a left column
    const kk = Math.min((vw - pad)/(2*SR0*1.08 + 300), (H - tb - pb - 150)/(2*SR0*1.08));   // 150 px for the archetype names above and below
    return {k:kk, tx: lc + vw/2 - SC_.x*kk, ty: (tb + H - pb)/2 - SC_.y*kk}; }
  if (view === "stars") { const lc = isPhone() ? 0 : 400, vw = W - lc; let x0 = UB.x0, x1 = UB.x1, y0 = UB.y0, y1 = UB.y1;
    if (S3D) { project3D(); x0 = y0 = Infinity; x1 = y1 = -Infinity; for (let i=0;i<n;i++) { if (!vis[i]) continue; x0 = Math.min(x0, P3X[i]); x1 = Math.max(x1, P3X[i]); y0 = Math.min(y0, P3Y[i]); y1 = Math.max(y1, P3Y[i]); } if (!isFinite(x0)) { x0 = UB.x0; x1 = UB.x1; y0 = UB.y0; y1 = UB.y1; } }
    const bw = x1 - x0, bh = y1 - y0, kk = Math.min((vw - pad)/bw, (H - pad)/bh);   // beside the timeline column
    return {k:kk, tx: lc + vw/2 - (x0 + bw/2)*kk, ty: H/2 - (y0 + bh/2)*kk}; }
  if (view === "chord") { const box = 2*CH_R*1.42, pb = 56, kk = Math.min((W - pad)/box, (H - pad - pb)/box);
    return {k:kk, tx: W/2 - CH_C.x*kk, ty: (H - pb)/2 - CH_C.y*kk}; }
  if (view === "gravity") { const box = 2*GR + 140, pb = 56, kk = Math.min((W - pad)/box, (H - pad - pb)/box);   // pb: room for the autoplay bar
    return {k:kk, tx: W/2 - GC.x*kk, ty: (H - pb)/2 - GC.y*kk}; }
  return isPhone() ? (kk => ({k:kk, tx: mode === "time" ? W - 20 - WW*kk : W/2 - WW*0.42*kk, ty:pad + 24}))((H - pad*2 - 30)/WH)   // phones: fill the height, start on Atlas, pan sideways
        : (kk => ({k:kk, tx:(W - WW*kk)/2 + 50, ty:pad + 24}))(Math.min((W - pad*2 - 120)/WW, (H - pad*2 - 30)/WH)); }
function fit(anim){ const t = fitTarget(); if (anim) animateTo(t); else { k = t.k; tx = t.tx; ty = t.ty; draw(); } }
const sx = x => x*k + tx, sy = y => y*k + ty, wx = x => (x - tx)/k, wy = y => (y - ty)/k;

let raf = 0; function draw(){ if (!raf) raf = RAF(render); }
function animateTo(t){ const k0=k, x0=tx, y0=ty, t0=performance.now(), dur=420, mid = morphId;
  const step = now => { if (camBusy && camBusy !== mid) return; const p = Math.min(1,(now-t0)/dur), e = 1-Math.pow(1-p,3);
    k = k0 + (t.k-k0)*e; tx = x0 + (t.tx-x0)*e; ty = y0 + (t.ty-y0)*e; render(); if (p<1) RAF(step); };
  RAF(step); }
function flyTo(i){
  const phone = isPhone(), dw = phone ? 0 : sideW(), lc = !phone && (view === "sense" || view === "stars") ? 400 : 0, vw = W - dw - lc, vh = phone ? H*.48 : H, pad = phone ? 36 : 70;   // Sensemaking keeps its bars in a left column
  let x0 = X[i], x1 = X[i], y0 = Y[i], y1 = Y[i];
  for (const j of [...out[i], ...inn[i]]) { x0 = Math.min(x0, X[j]); x1 = Math.max(x1, X[j]); y0 = Math.min(y0, Y[j]); y1 = Math.max(y1, Y[j]); }
  const kk = Math.min(4, Math.max(phone ? .1 : .3, Math.min((vw - pad*2) / Math.max(x1-x0, 1), (vh - pad*2) / Math.max(y1-y0, 1))));
  animateTo({k:kk, tx:lc + vw/2 - (x0+x1)/2*kk, ty:vh/2 - (y0+y1)/2*kk}); }

// note panel width: draggable on desktop, remembered per browser
let panelW = Math.max(320, Math.min(1100, +pref("iv-pw", 420) || 420));
function setPanelW(w, keep){ panelW = Math.round(Math.max(320, Math.min(w, Math.max(320, (W || win.innerWidth) - 240)))); root.style.setProperty("--pw", panelW + "px"); if (keep) save("iv-pw", panelW); }
setPanelW(panelW);
{ const g = $("#dgrip"); let dragging = false;
  g.addEventListener("pointerdown", e => { dragging = true; g.setPointerCapture(e.pointerId); g.classList.add("on"); e.preventDefault(); });
  g.addEventListener("pointermove", e => { if (!dragging) return; const r = $("#main").getBoundingClientRect(); setPanelW(r.right - e.clientX); });
  const stop = () => { if (!dragging) return; dragging = false; g.classList.remove("on"); save("iv-pw", panelW); };
  g.addEventListener("pointerup", stop); g.addEventListener("pointercancel", stop);
  g.addEventListener("dblclick", () => setPanelW(420, true));
  g.tabIndex = 0; g.addEventListener("keydown", e => { if (e.key === "ArrowLeft") setPanelW(panelW + 24, true); if (e.key === "ArrowRight") setPanelW(panelW - 24, true); }); }
function keepInView(i){   // after the map narrows, slide it so the selected note isn't left past the edge
  const x = sx(X[i]), y = sy(Y[i]), m = 60; let dx = 0, dy = 0;
  if (x > W - m) dx = (W*0.62) - x; else if (x < m) dx = W*0.38 - x;
  if (y > H - m) dy = H*0.6 - y; else if (y < m) dy = H*0.4 - y;
  if (dx || dy) animateTo({k, tx: tx + dx, ty: ty + dy});
}
function sideW(){ // width covered on the right by the note panel and any open side panel (desktop)
  if (isPhone()) return 0; let w = 0;
  if (!$("#effpanel").hidden || !$("#scorepanel").hidden) w += 352;
  return Math.min(w, W - 240);
}
function visTarget(xs, ys){   // camera that frames every visible note, given where the notes are (or will be)
  const phone = isPhone(), dw = sideW(), vw = W - dw, vh = phone && sel >= 0 ? H*.48 : H, pad = phone ? 40 : 80;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, c = 0;
  for (let i=0;i<n;i++) if (vis[i]) { c++; x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
  if (!c) return null;
  const kk = Math.min(4, Math.max(.1, Math.min((vw - pad*2) / Math.max(x1-x0, 40), (vh - pad*2 - 40) / Math.max(y1-y0, 40))));
  return {k:kk, tx: vw/2 - (x0+x1)/2*kk, ty: (vh + 40)/2 - (y0+y1)/2*kk};
}
function rad(i){ if (view === "stars") return Math.max(.7, Math.min(SR[i]*Math.pow(k, .5)*(S3D ? DS3[i] : 1), 16)); return Math.max(1.1, Math.min(R[i]*Math.pow(k, .55), 26)); }

function render(){
  raf = 0;
  if (!popFrozen) popNow = performance.now();
  const swap = view === "stars" ? Object.fromEntries(Object.keys(SPACE).map(kk => [kk, css[kk]])) : null;
  if (swap) Object.assign(css, SPACE);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = css.bg; ctx.fillRect(0,0,W,H);

  if (view === "stars") starsBg();
  else if (view === "sense") senseGuides();
  else if (view === "gravity") gravityGuides();
  else if (view === "chord") chordGuides();
  else {
  if (view === "spacetime") ROWS.forEach((r, idx) => {   // folder rows
    const y0 = sy(r.y0), y1 = sy(r.y1);
    ctx.fillStyle = idx % 2 ? css["band-b"] : css["band-a"]; ctx.fillRect(0, y0, W, y1 - y0);
    ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Math.round(y1 + 12*k)+.5); ctx.lineTo(W, Math.round(y1 + 12*k)+.5); ctx.stroke();
  });
  // level bands
  else LEVELS.forEach((L, idx) => {
    const b = bandY[L.lv], y0 = sy(b.y0), y1 = sy(b.y1);
    ctx.fillStyle = idx % 2 ? css["band-b"] : css["band-a"]; ctx.fillRect(0, y0, W, y1 - y0);
    ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Math.round(y1 + GAP_Y*k/2)+.5); ctx.lineTo(W, Math.round(y1 + GAP_Y*k/2)+.5); ctx.stroke();
  });
  // ACE columns, or year lines (ARC: its three lanes)
  ctx.lineWidth = 1;
  if (view === "arc") arcGuides();
  else if (mode === "time") timeGuides();
  else if (PA) propGuides();
  else for (const c of cols) {
    const x0 = sx(c.x0), x1 = sx(c.x1);
    ctx.strokeStyle = css.line; ctx.setLineDash([2,4]);
    ctx.beginPath(); ctx.moveTo(Math.round(x0)+.5, sy(0)-6); ctx.lineTo(Math.round(x0)+.5, sy(WH)); ctx.moveTo(Math.round(x1)+.5, sy(0)-6); ctx.lineTo(Math.round(x1)+.5, sy(WH)); ctx.stroke();
    ctx.setLineDash([]);
    if (k > 1.6) { // subfolder dividers and names, per level band
      for (const L of LEVELS) { const b = bandY[L.lv], y0 = sy(b.y0), y1 = sy(b.y1); if (y1 < 0 || y0 > H) continue;
        c.bands[L.lv].forEach((s, j) => { const a = sx(s.x0), e = sx(s.x1); if (e < 0 || a > W) return;
          if (j) { ctx.strokeStyle = css.line; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(Math.round(a)+.5, y0); ctx.lineTo(Math.round(a)+.5, y1); ctx.stroke(); ctx.globalAlpha = 1; }
          if (e - a > 56) { ctx.font = `500 10px ${css.mono}`; ctx.fillStyle = css.muted; ctx.textBaseline = "top";
            const nm = s.name.split("/").pop(), lbl = ctx.measureText(nm).width > e-a-8 ? nm.slice(0, Math.max(3, Math.floor((e-a-8)/6.5)))+"…" : nm;
            ctx.fillText(lbl, a+4, Math.max(y0+3, 4)); ctx.textBaseline = "alphabetic"; }
        });
      }
    }
  }
  }

  if (view === "emergence" || view === "arc") levelNames(); else if (view === "spacetime") rowNames();
  // links
  if (focus >= 0 && !showAll) {   // in focus: every link among the focused notes, faint
    ctx.strokeStyle = css.muted; ctx.globalAlpha = .28; ctx.lineWidth = 1; ctx.beginPath();
    for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; ctx.moveTo(sx(X[a]), sy(Y[a])); ctx.lineTo(sx(X[b]), sy(Y[b])); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (showAll) {
    ctx.strokeStyle = css["edge-faint"]; ctx.lineWidth = 1; ctx.beginPath();
    if (view === "chord") { const cx = sx(CH_C.x), cy = sy(CH_C.y); for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; const x1 = sx(X[a]), y1 = sy(Y[a]), x2 = sx(X[b]), y2 = sy(Y[b]); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx + ((x1+x2)/2 - cx)*.25, cy + ((y1+y2)/2 - cy)*.25, x2, y2); } }
    else for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; ctx.moveTo(sx(X[a]), sy(Y[a])); ctx.lineTo(sx(X[b]), sy(Y[b])); }
    ctx.stroke();
  }
  const hl = sel >= 0 ? sel : hover;
  let lit = null;
  if (hl >= 0) {
    lit = new Set([hl]);
    const nb = new Set([...out[hl], ...inn[hl]].filter(j => VV(j)));
    for (const j of nb) {
      lit.add(j);
      const upward = N[j].level > N[hl].level || (N[j].level === N[hl].level && Y[j] < Y[hl]);
      ctx.strokeStyle = edgeColor(hl, j, upward); ctx.globalAlpha = sel >= 0 ? .75 : .5; ctx.lineWidth = sel >= 0 ? 1.4 : 1;
      const x1 = sx(X[hl]), y1 = sy(Y[hl]), x2 = sx(X[j]), y2 = sy(Y[j]);
      let mx = (x1+x2)/2, my = (y1+y2)/2 - Math.abs(x2-x1)*.12;
      if (view === "chord") { const cx = sx(CH_C.x), cy = sy(CH_C.y); mx = cx + ((x1+x2)/2 - cx)*.25; my = cy + ((y1+y2)/2 - cy)*.25; }
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(mx,my,x2,y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (GROWV() && senseT != null) { const vw = W - (isPhone() ? 0 : sideW()), cen = view === "gravity" ? GC : view === "chord" ? CH_C : null;
    drawWatermark(cen ? sx(cen.x) : vw/2, cen ? sy(cen.y) - Math.min(vw, H)*.06 : H*.5, Math.min(vw, H)*.3, css.ink, .07); }
  // notes: bottom levels first, batched
  const vx0 = -30, vx1 = W+30, vy0 = -30, vy1 = H+30;
  // hovering fades the rest gently; a click (selection) fades it fully, like the link lines
  const dim = lit && !(focus >= 0 && (sel === focus || sel < 0) && hover < 0) ? (sel >= 0 ? .25 : .7) : 1;
  if (view === "stars") starsNotes(lit, dim); else {
  for (const lv of [1,2]) for (const ar of [1,0]) {   // archive notes as rings, vault notes as dots
    ctx.globalAlpha = dim; ctx.beginPath();
    for (let i=0;i<n;i++) { if (N[i].level !== lv || !VV(i) || ARCH[i] !== ar) continue; const x = sx(X[i]), y = sy(Y[i]); if (x<vx0||x>vx1||y<vy0||y>vy1) continue; const r = rad(i); ctx.moveTo(x+r,y); ctx.arc(x,y,r,0,6.2832); }
    if (ar) { ctx.strokeStyle = lv === 2 ? css.l2 : css.l1; ctx.lineWidth = 1; ctx.stroke(); } else { ctx.fillStyle = view === "sense" ? (lv === 2 ? css.sl2 : css.sl1) : lv === 2 ? css.l2 : css.l1; ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const lv of [3,4,5]) {
    for (let i=0;i<n;i++) {
      if (N[i].level !== lv || !VV(i)) continue;
      const x = sx(X[i]), y = sy(Y[i]); if (x<vx0||x>vx1||y<vy0||y>vy1) continue;
      const r = rad(i), g = ctx.createLinearGradient(x-r,y-r,x+r,y+r);
      g.addColorStop(0, GRAD[lv][0]); g.addColorStop(1, GRAD[lv][1]);
      ctx.globalAlpha = lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .3 : .75) : 1;
      ctx.beginPath(); shape(lv, x, y, r);
      if (ARCH[i]) { ctx.fillStyle = css.bg; ctx.fill(); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = css.bg; ctx.stroke(); }
    }
  }
  ctx.globalAlpha = 1;
  if (lit) for (const i of lit) { // re-draw lit low-level notes on top, full strength
    if (N[i].level >= 3) continue; const x = sx(X[i]), y = sy(Y[i]), r = Math.max(rad(i), 2.4);
    ctx.fillStyle = N[i].level === 2 ? css.down : css.muted; ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fill();
  }
  }
  for (const i of [sel, hover]) if (i >= 0) { const x = sx(X[i]), y = sy(Y[i]); ctx.strokeStyle = css.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x,y,rad(i)+3,0,6.2832); ctx.stroke(); }

  labels(lit);
  axisLabels();
  if (GROWV() && senseT != null) drawGrowth();
  if (swap) Object.assign(css, swap);
}
// level names, pinned to the left edge: drawn under the links and notes, so they never cover the note you're on
function rowNames(){   // Space-Time: each folder's name at the left of its row
  ctx.textBaseline = "alphabetic";
  for (const r of ROWS) { const y0 = sy(r.y0), y1 = sy(r.y1); if (y1 < 0 || y0 > H) continue;
    const y = Math.min(Math.max(y0 + 22, 70), y1 - 6), nm = rowName(r.key);
    ctx.font = `${css.dw} 17px ${css.display}`; const w = ctx.measureText(nm).width;
    ctx.font = `500 10.5px ${css.mono}`; const c = r.n.toLocaleString(), cw = ctx.measureText(c).width;
    ctx.fillStyle = css.bg; ctx.globalAlpha = .7; ctx.fillRect(6, y - 17, w + cw + 26, 23); ctx.globalAlpha = 1;
    ctx.font = `${css.dw} 17px ${css.display}`; ctx.fillStyle = css.ink; ctx.fillText(nm, 12, y);
    ctx.font = `500 10.5px ${css.mono}`; ctx.fillStyle = css.muted; ctx.fillText(c, 20 + w, y); }
}
function levelNames(){
  ctx.textBaseline = "alphabetic";
  for (const L of LEVELS) {
    const b = bandY[L.lv], y0 = sy(b.y0), y1 = sy(b.y1); if (y1 < 0 || y0 > H) continue;
    const y = Math.min(Math.max(y0 + 16, 66), y1 - 6);
    ctx.font = `500 11px ${css.mono}`;
    const t = `${L.lv} · ${L.name.toUpperCase()}`, w = ctx.measureText(t).width;
    ctx.fillStyle = css.bg; ctx.globalAlpha = .6; ctx.fillRect(6, y-12, w+12, 17); ctx.globalAlpha = .9;
    ctx.fillStyle = css.accent; ctx.fillText(t, 12, y); ctx.globalAlpha = 1;
  }
}
function gravityGuides(){
  const cx = sx(GC.x), cy = sy(GC.y), R0 = GR*k;
  LEVELS.forEach((L, idx) => { const [a,b] = RING[L.lv];
    ctx.beginPath(); ctx.arc(cx, cy, b*R0, 0, 6.2832); if (a > 0) ctx.arc(cx, cy, a*R0, 0, 6.2832, true);
    ctx.fillStyle = idx % 2 ? css["band-b"] : css["band-a"]; ctx.fill("evenodd");
    ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, b*R0, 0, 6.2832); ctx.stroke(); });
  ctx.strokeStyle = css.line; ctx.setLineDash([2,4]); ctx.beginPath();
  const spoke = x => { const a = angOf(x); ctx.moveTo(cx + Math.cos(a)*R0*.13, cy + Math.sin(a)*R0*.13); ctx.lineTo(cx + Math.cos(a)*R0*1.02, cy + Math.sin(a)*R0*1.02); };
  if (mode === "time") { spoke(ND[1] + 30); if (ER) spoke(ER[1] + 20); for (let yr = fromY; yr <= NOW_Y; yr++) { if (yr < fullY && yr % 5 && yr !== fromY) continue; spoke(xTime(Date.UTC(yr,0,1))); } }
  else if (PA) { spoke(ND[1] + 30); for (const tk of propTicks()) spoke(xOfU(tk.u)); }
  else for (const c of cols) { spoke(c.x0); spoke(c.x1); }
  ctx.stroke(); ctx.setLineDash([]);
}
function gravityLabels(){
  const cx = sx(GC.x), cy = sy(GC.y), R0 = GR*k;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 5; ctx.strokeStyle = css.bg;
  const g = gapAng();   // ring names sit in the gap (top for Time; about 9:00 for ACE), running across the radius
  // upright text; full names only when they fit side by side along the gap, otherwise just the numbers
  ctx.font = `500 ${R0 > 500 ? 11 : 9.5}px ${css.mono}`;
  const pts = LEVELS.map(L => { const [a,b] = RING[L.lv], rr = ((a+b)/2)*R0; return {L, x: cx + Math.cos(g)*rr, y: cy + Math.sin(g)*rr, w: ctx.measureText(`${L.lv} · ${L.name.toUpperCase()}`).width}; });
  let full = R0 > 500;
  for (let q = 1; q < pts.length && full; q++) { const p0 = pts[q-1], p1 = pts[q];
    if (Math.abs(p1.x - p0.x) < (p0.w + p1.w)/2 + 8 && Math.abs(p1.y - p0.y) < 15) full = false; }
  ctx.fillStyle = css.accent;
  for (const {L, x, y} of pts) { if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
    const tt = full ? `${L.lv} · ${L.name.toUpperCase()}` : String(L.lv); ctx.strokeText(tt, x, y); ctx.fillText(tt, x, y); }
  const at = (txt, x, font, color, rr) => { const a = angOf(x), px = cx + Math.cos(a)*R0*rr, py = cy + Math.sin(a)*R0*rr;
    if (px < -60 || px > W+60 || py < -20 || py > H+20) return; ctx.font = font; ctx.fillStyle = color; ctx.strokeText(txt, px, py); ctx.fillText(txt, px, py); };
  if (mode === "time") {
    at("No date", ND[1]/2, `500 11px ${css.mono}`, css.muted, 1.06);
    if (ER) at(`Before ${fromY}`, (ER[0] + ER[1])/2, `500 11px ${css.mono}`, css.muted, 1.06);
    const fw = k * dayFull() * 365 * GR / WW * aS();   // rough on-screen arc length of a full year
    for (let yr = fromY; yr <= NOW_Y; yr++) { const comp = yr < fullY; if (comp && yr % 5 && yr !== fromY) continue;
      const mid = xTime(Date.UTC(yr, comp ? 0 : 6, comp ? 1 : 1));
      at(fw > 60 && !comp ? String(yr) : "'" + String(yr).slice(2), mid, comp ? `500 11px ${css.mono}` : `${css.dw} ${fw > 60 ? 18 : 13}px ${css.display}`, comp ? css.muted : css.ink, 1.07); }
  } else if (PA) {
    at("No value", ND[1]/2, `500 11px ${css.mono}`, css.muted, 1.06);
    let lastA = -9; for (const tk of propTicks()) { const a = angOf(xOfU(tk.u)); if (a - lastA < .09) continue; lastA = a;
      at(tk.label, xOfU(tk.u), tk.major ? `${css.dw} 15px ${css.display}` : `500 10.5px ${css.mono}`, tk.major ? css.ink : css.muted, 1.07); }
  } else for (const c of cols) {
    const name = ACE_SYM[c.ace] ? ACE_SYM[c.ace][0] + " " + ACE_SYM[c.ace][1] : c.ace;
    at(name, (c.x0 + c.x1)/2, `${css.dw} 18px ${css.display}`, css.ink, 1.08); }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}
function propGuides(){
  const v = x => Math.round(sx(x))+.5, top = sy(0)-6, bot = sy(WH), ax = PA.ax;
  if (ax.kind === "year" && ax.anchor != null && PA.umin < 0) { const a = sx(xOfU(PA.umin)), b = sx(xOfU(0));
    ctx.fillStyle = css["accent-soft"]; ctx.globalAlpha = .55; ctx.fillRect(a, top, b - a, bot - top); ctx.globalAlpha = 1; }
  ctx.strokeStyle = css.line; ctx.setLineDash([2,4]); ctx.beginPath();
  ctx.moveTo(v(ND[1]+30), top); ctx.lineTo(v(ND[1]+30), bot);
  for (const tk of propTicks()) { const x = v(xOfU(tk.u)); ctx.moveTo(x, top); ctx.lineTo(x, bot); }
  ctx.stroke(); ctx.setLineDash([]);
}
function propLabels(yTop){
  ctx.lineWidth = 5; ctx.strokeStyle = css.bg;
  const put = (txt, x, font, color, y = yTop) => { ctx.font = font; ctx.fillStyle = color; ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y); };
  if (PA.miss && sx(ND[1]) > 40) put("No value", sx(ND[0]) + 4, `500 11px ${css.mono}`, css.muted);   // only when some notes lack the value
  let last = -1e9;
  for (const tk of propTicks()) { const x = sx(xOfU(tk.u)); if (x > W || x < -60) continue;
    const font = tk.major ? `${css.dw} 18px ${css.display}` : `500 11px ${css.mono}`; ctx.font = font; const w = ctx.measureText(tk.label).width;
    if (x + 3 < last + 8) continue; put(tk.label, x + 3, font, tk.major ? css.ink : css.muted); last = x + 3 + w; }
  put(PA.ax.name.toUpperCase() + (PA.ax.kind === "log" ? " · log scale" : "") + (PA.ax.kind === "year" && PA.ax.anchor != null && PA.umin < 0 ? ` · before ${PA.ax.anchor} compressed` : ""), Math.max(sx(ND[0]), 8), `500 10.5px ${css.mono}`, css.accent, Math.max(yTop - 24, 14));
}
function timeGuides(){
  const v = x => Math.round(sx(x))+.5, top = sy(0)-6, bot = sy(view === "spacetime" ? STH : WH);
  if (fullY > fromY) { // shade the compressed years
    const a = sx(xTime(TF)), b = sx(xTime(TS));
    ctx.fillStyle = css["accent-soft"] || "rgba(0,0,0,.03)"; ctx.globalAlpha = .55; ctx.fillRect(a, top, b - a, bot - top); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = css.line; ctx.setLineDash([2,4]); ctx.beginPath();
  ctx.moveTo(v(ND[1]+30), top); ctx.lineTo(v(ND[1]+30), bot);
  if (ER) { ctx.moveTo(v(ER[1]+20), top); ctx.lineTo(v(ER[1]+20), bot); }
  const cw = k * dayFull() * 365 * COMP;            // on-screen width of one compressed year
  for (let yr = fromY; yr <= NOW_Y; yr++) {
    if (yr < fullY && cw < 14 && yr % 5 && yr !== fromY) continue;
    const x = v(xTime(Date.UTC(yr,0,1))); ctx.moveTo(x, top); ctx.lineTo(x, bot);
  }
  ctx.stroke(); ctx.setLineDash([]);
  if (k * dayFull() * 30 > 34) { // month lines in full-scale years when zoomed in
    ctx.strokeStyle = css["edge-faint"]; ctx.beginPath();
    for (let yr = fullY; yr <= NOW_Y; yr++) for (let m = 1; m < 12; m++) { const x = v(xTime(Date.UTC(yr,m,1))); if (x < 0 || x > W) continue; ctx.moveTo(x, sy(0)); ctx.lineTo(x, bot); }
    ctx.stroke();
  }
}
function shape(lv, x, y, r){
  if (lv === 5) { ctx.roundRect ? ctx.roundRect(x-r, y-r, 2*r, 2*r, r*.28) : ctx.rect(x-r,y-r,2*r,2*r); }       // org-like rounded square: home & hubs
  else if (lv === 4) { ctx.moveTo(x, y-r*1.1); ctx.lineTo(x+r*1.1, y); ctx.lineTo(x, y+r*1.1); ctx.lineTo(x-r*1.1, y); ctx.closePath(); }  // diamond
  else { ctx.arc(x, y, r, 0, 6.2832); }
}

// labels with simple collision avoidance, highest score first
const order = [...N.keys()].sort((a,b) => (N[b].level - N[a].level) || (N[b].score - N[a].score));
const dim_ok = () => (sel === focus || sel < 0) && hover < 0;
let LH = [];   // where labels were drawn last frame: [x, y, w, h, note], so a click on the text works like a click on the dot
function labels(lit){
  LH = [];
  if (view === "chord" && !lit && k < 2) return;   // the ring is named by its kinds; note names show for the note you're on and its links, or once zoomed in
  let nv = 0; if (focus >= 0) for (let i=0;i<n;i++) nv += vis[i];
  const minLv = (focus >= 0 && nv <= 400) ? 1 : k >= 9 ? 1 : k >= 5 ? 2 : k >= 2.2 ? 3 : k >= 1.25 ? 4 : 5;
  const taken = []; const fits = (x,y,w,h) => { for (const t of taken) if (x < t[0]+t[2] && x+w > t[0] && y < t[1]+t[3] && y+h > t[1]) return false; return true; };
  ctx.textBaseline = "middle";
  const must = [];
  if (sel >= 0) must.push(sel); if (hover >= 0) must.push(hover);
  const hl = sel >= 0 ? sel : hover;
  if (lit) [...lit].filter(j => j !== hl).sort((a,b) => (N[b].level-N[a].level) || (N[b].score-N[a].score)).forEach(j => must.push(j));
  const seen = new Set(), list = [...must, ...order];
  let count = 0;
  for (const i of list) {
    if (seen.has(i) || !VV(i)) continue; seen.add(i);
    const isMust = must.includes(i);
    if (!isMust && N[i].level < minLv) continue;
    if (!isMust && view === "stars" && COREB[i] >= 0 && BODIES[COREB[i]].r*k <= Math.min(W, H)*.8) continue;   // the galaxy's own label names it
    if (!isMust && lit && !lit.has(i) && !(focus >= 0 && dim_ok())) continue;
    const x = sx(X[i]), y = sy(Y[i]); if (x < -200 || x > W+20 || y < -20 || y > H+20) continue;
    const big = N[i].level >= 4 || i === sel;
    ctx.font = `${big ? 600 : 500} ${big ? 12.5 : 11.5}px ${css.body}`;
    const t = N[i].title.length > 46 ? N[i].title.slice(0,45)+"…" : N[i].title;
    const w = ctx.measureText(t).width, r = rad(i), h = 15, edge = W - sideW() - 6;
    let lx = x + r + 4; if (lx + w > edge && x - r - 4 - w > 4) lx = x - r - 4 - w;   // near the right edge: put the name left of its dot
    if (!fits(lx-2, y-h/2, w+4, h) && !(i === sel || i === hover)) continue;
    taken.push([lx-2, y-h/2, w+4, h]); LH.push([lx-2, y-h/2, w+4, h, i]);
    ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.lineJoin = "round"; ctx.strokeText(t, lx, y);
    ctx.fillStyle = css.ink; ctx.fillText(t, lx, y);
    if (++count > 260) break;
  }
}
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function axisLabels(){
  if (view === "stars") { starLabels(); drawPops(); return; }
  if (view === "sense") { senseLabels(); return; }
  if (view === "gravity") { gravityLabels(); return; }
  if (view === "chord") { chordLabels(); return; }
  ctx.textBaseline = "alphabetic";
  const yTop = Math.max(sy(0) - 12, 26);
  if (view === "arc") arcHeaders(yTop);
  else if (PA && mode !== "time") propLabels(yTop);
  else if (mode === "time") {
    ctx.lineWidth = 5; ctx.strokeStyle = css.bg;
    const put = (txt, x, font, color) => { ctx.font = font; ctx.fillStyle = color; ctx.strokeText(txt, x, yTop); ctx.fillText(txt, x, yTop); };
    const big = `${css.dw} 20px ${css.display}`, small = `500 11px ${css.mono}`;
    let lastX = -1e9;   // labels never overlap: each one only draws if it clears the one before
    const xStart = sx(xTime(TF)) + 3;   // the timeline's first year always gets its label; the strip labels give way to it
    const strip = (t, x) => { ctx.font = small; const w = ctx.measureText(t).width; if (x < lastX + 8 || x + w + 8 > xStart) return false; put(t, x, small, css.muted); lastX = x + w; return true; };
    let compX = null;   // where "compressed" goes: under the first year label of the squeezed span, or else under "Before <year>"
    if (sx(ND[1]) > 40) strip("No date", sx(ND[0]) + 4);
    if (ER && sx(ER[1]) > 30) {   // "Before <start>": on the year row if it fits, otherwise just under it
      const bx = sx(ER[0]) + 4, bt = `Before ${fromY}`;
      if (strip(bt, bx)) compX = bx;
      else { ctx.font = small; ctx.lineWidth = 5; ctx.strokeStyle = css.bg; ctx.fillStyle = css.muted; ctx.strokeText(bt, bx, yTop + 16); ctx.fillText(bt, bx, yTop + 16); } }
    const fw = k * dayFull() * 365, cw = fw * COMP;   // on-screen widths of a full and a compressed year
    const yearLbl = (yr, w) => w > 50 ? [String(yr), big] : w > 24 ? ["'" + String(yr).slice(2), small] : null;
    for (let yr = fromY; yr <= NOW_Y; yr++) {
      const comp = yr < fullY, x = sx(xTime(Date.UTC(yr,0,1))); if (x > W || x < -80) continue;
      let L = yearLbl(yr, comp ? cw : fw);
      if (!L && comp && (yr === fromY || (yr % 5 === 0 && sx(xTime(TS)) - x > 48))) L = [String(yr), small];     // squeezed years: label every fifth (unless it would crowd the first full-scale year)
      if (!L && yr === fromY) L = [String(yr), small];
      if (!L) continue;
      ctx.font = L[1]; const lw = ctx.measureText(L[0]).width, yw = comp ? cw : fw;
      let px = x + 3;
      if (px < lastX + 8 && yr !== fromY) { px = lastX + 8; if (px + lw > x + yw - 2) continue; }   // nudge right within its own year rather than drop it
      if (yr === fromY && comp) compX = px;
      put(L[0], px, L[1], comp ? css.muted : css.ink); ctx.font = L[1]; lastX = px + lw;
    }
    if (fullY > fromY) { const a = sx(xTime(TF)), b = sx(xTime(TS)); if (b - a > 60 && b > 0 && a < W) { ctx.font = small; ctx.fillStyle = css.muted; ctx.fillText("compressed", compX != null ? compX : Math.max(a, 4) + 4, yTop + 16); } }
    // keep the current year visible when its Jan 1 line has scrolled off to the left
    const wl = wx(0);
    if (wl > xTime(TS)) { const tl = TS + ((wl - X0T)/(WW - X0T)*UT - (TS - TF)/YEAR*COMP) * YEAR, yr = new Date(tl).getUTCFullYear();
      if (yr >= fullY && sx(xTime(Date.UTC(yr+1,0,1))) > 90) put(String(yr), 8, big, css.ink); }
    if (k * dayFull() * 30 > 34) for (let yr = fullY; yr <= NOW_Y; yr++) for (let m = 1; m < 12; m++) { const x = sx(xTime(Date.UTC(yr,m,1))); if (x < 0 || x > W) continue; ctx.font = small; ctx.fillStyle = css.muted; ctx.fillText(MON[m], x + 3, yTop + 16); }
  } else
  // ACE column names, pinned to the top of the canvas
  for (const c of cols) {
    const x0 = Math.max(sx(c.x0), 8), x1 = sx(c.x1); if (x1 < 40 || x0 > W) continue;
    const y = Math.max(sy(0) - 12, 26);
    ctx.lineWidth = 5; ctx.strokeStyle = css.bg; ctx.fillStyle = css.ink;
    let nw;
    if (ACE_SYM[c.ace]) {
      const [sym, word] = ACE_SYM[c.ace];
      ctx.font = `${css.dw} 30px ${css.display}`; ctx.fillStyle = css.ink;
      let sw;
      if (sym === "+") {   // drawn, not typed: the font's plus is thin and sits low; match the cap height and weight of the column names
        const s = 17, th = css.dw >= 700 ? 4 : 3, cx = x0 + 4 + s/2, cy = y - 7;
        ctx.save(); ctx.lineCap = "butt";
        ctx.strokeStyle = css.bg; ctx.lineWidth = th + 5; ctx.beginPath(); ctx.moveTo(cx - s/2, cy); ctx.lineTo(cx + s/2, cy); ctx.moveTo(cx, cy - s/2); ctx.lineTo(cx, cy + s/2); ctx.stroke();
        ctx.strokeStyle = css.ink; ctx.lineWidth = th; ctx.stroke(); ctx.restore();
        sw = s;
      } else { ctx.strokeText(sym, x0 + 4, y + 3); ctx.fillText(sym, x0 + 4, y + 3); sw = ctx.measureText(sym).width; }
      ctx.font = `500 12px ${css.mono}`; ctx.fillStyle = css.muted;
      const ww = ctx.measureText(word).width;
      if (x0 + 10 + sw + ww < x1 - 6) { ctx.strokeText(word, x0 + 10 + sw, y); ctx.fillText(word, x0 + 10 + sw, y); nw = sw + 6 + ww; }   // a narrow column keeps just its symbol
      else nw = sw;
    } else {
      ctx.font = `${css.dw} 20px ${css.display}`;
      let nm = c.ace; const room = x1 - x0 - 10;   // a narrow column shortens its name rather than running into the next one
      if (ctx.measureText(nm).width > room) { while (nm.length > 1 && ctx.measureText(nm + "…").width > room) nm = nm.slice(0, -1); nm += "…"; }
      ctx.strokeText(nm, x0 + 4, y); ctx.fillText(nm, x0 + 4, y);
      nw = ctx.measureText(nm).width;
    }
    ctx.font = `500 11px ${css.mono}`; ctx.fillStyle = css.muted;
    const tw = ctx.measureText(String(c.count)).width;
    const cx = Math.min(x1 - tw - 4, W - tw - 8);
    if (cx > x0 + 4 + nw + 8) { ctx.strokeText(c.count.toLocaleString(), cx, y); ctx.fillText(c.count.toLocaleString(), cx, y); }
  }
}

// ---------- hit testing ----------
let linkedOf = -1, linkedSet = null;
dbg.__ivPickTest = () => { if (sel < 0) return null; let ok = 0, other = 0, tot = 0; for (const j of new Set([...out[sel], ...inn[sel]])) { if (!VV(j)) continue; const px = sx(X[j]) + 4, py = sy(Y[j]) + 3; if (px < 0 || px > W || py < 0 || py > H) continue; tot++; const p = pick(px, py); if (p === j) ok++; else if (p === sel || out[sel].includes(p) || inn[sel].includes(p)) other++; } return [ok, other, tot]; };   // the selected note and the notes it links with, cached per selection
function pick(px, py){
  if (morphing && senseT == null) return -1;   // the timeline keeps notes gliding; they stay clickable
  if (sel >= 0) {   // with a note selected, its linked notes win: moving toward one doesn't get hijacked by the notes on the way
    if (linkedOf !== sel) { linkedOf = sel; linkedSet = new Set([sel, ...out[sel], ...inn[sel]]); }
    for (let q = LH.length - 1; q >= 0; q--) { const [lx, ly, lw, lh, i] = LH[q]; if (linkedSet.has(i) && px >= lx && px <= lx + lw && py >= ly && py <= ly + lh && vis[i]) return i; }
    const x = wx(px), y = wy(py), rr = Math.max(14/k, 2);
    let best = -1, bd = Infinity;
    const c0 = Math.floor((x-rr-30)/CELL), c1 = Math.floor((x+rr+30)/CELL), r0 = Math.floor((y-rr-30)/CELL), r1 = Math.floor((y+rr+30)/CELL);
    for (let a=c0;a<=c1;a++) for (let b=r0;b<=r1;b++) { const g = grid.get(a+","+b); if (!g) continue;
      for (const i of g) { if (!linkedSet.has(i) || !VV(i)) continue; const d = Math.hypot((X[i]-x)*k, (Y[i]-y)*k); if (d < rad(i) + 9 && d < bd) { bd = d; best = i; } } }
    if (best >= 0) return best; }
  for (let q = LH.length - 1; q >= 0; q--) { const [lx, ly, lw, lh, i] = LH[q]; if (px >= lx && px <= lx + lw && py >= ly && py <= ly + lh && vis[i]) return i; }   // a name wins over the small dots under it
  const x = wx(px), y = wy(py), rr = Math.max(8/k, 2);
  let best = -1, bd = Infinity;
  const c0 = Math.floor((x-rr-30)/CELL), c1 = Math.floor((x+rr+30)/CELL), r0 = Math.floor((y-rr-30)/CELL), r1 = Math.floor((y+rr+30)/CELL);
  for (let a=c0;a<=c1;a++) for (let b=r0;b<=r1;b++) { const g = grid.get(a+","+b); if (!g) continue;
    for (const i of g) { if (!VV(i)) continue; const d = Math.hypot((X[i]-x)*k, (Y[i]-y)*k); const lim = rad(i) + 5; if (d < lim && d - (N[i].level*.6) < bd) { bd = d - (N[i].level*.6); best = i; } } }
  if (best < 0) for (let q = LH.length - 1; q >= 0; q--) { const [lx, ly, lw, lh, i] = LH[q]; if (px >= lx && px <= lx + lw && py >= ly && py <= ly + lh && vis[i]) return i; }
  return best;
}

// ---------- interaction ----------
const tip = $("#tip"); tip.addClass("ivm-tip"); doc.body.appendChild(tip);
let drag = null, moved = false; const pts = new Map();
cv.addEventListener("pointerdown", e => { driftStop(); cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.offsetX, y:e.offsetY}); drag = {x:e.offsetX, y:e.offsetY, tx, ty, btn:e.button, yaw: yaw3, pitch: pitch3, orbit: s3dOn() && e.button === 0 && !e.shiftKey}; moved = false; if (e.button === 2) cv.classList.add("drag"); });
cv.addEventListener("contextmenu", e => e.preventDefault());   // right-drag pans (as in Miro); no menu on the map
cv.addEventListener("pointermove", e => {
  if (pts.has(e.pointerId)) {
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, {x:e.offsetX, y:e.offsetY});
    if (pts.size === 2) { // pinch
      const pa = [...pts.entries()].find(([id]) => id !== e.pointerId)[1];
      const d1 = Math.hypot(prev.x - pa.x, prev.y - pa.y), d2 = Math.hypot(e.offsetX - pa.x, e.offsetY - pa.y);
      if (d1 > 0) zoomAt((e.offsetX+pa.x)/2, (e.offsetY+pa.y)/2, d2/d1);
      moved = true; return;
    }
    if (drag) { const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y; if (Math.abs(dx)+Math.abs(dy) > 3) { moved = true; cv.classList.add("drag"); }
      if (drag.orbit) { if (!moved) return; yaw3 = drag.yaw + dx*.006; pitch3 = Math.max(-1.45, Math.min(1.45, drag.pitch + dy*.006)); project3D(); X.set(P3X); Y.set(P3Y); tip.hidden = true; draw(); return; }
      tx = drag.tx + dx; ty = drag.ty + dy; tip.hidden = true; draw(); return; }
  }
  const i = pick(e.offsetX, e.offsetY);
  if (i !== hover) { hover = i; cv.classList.toggle("hot", i >= 0); draw(); }
  if (i < 0 && view === "chord") { const a = chordArcAt(e.offsetX, e.offsetY);   // hovering an arc: its ribbons light up, with the counts
    if (a !== chArc) { chArc = a; draw(); }
    if (a >= 0) { showArcTip(a); return; }
    if (chPin >= 0 && (CHCAT[chPin])) { showArcTip(chPin); return; } }   // a held arc keeps its details showing
  else if (chArc >= 0) { chArc = -1; draw(); }
  tip.classList.remove("arc");
  if (i >= 0) { const d = N[i]; const av = axisValue(d); const named = LH.some(b => b[4] === i), lvShown = view === "emergence" || view === "gravity";   // the map already shows its name (and, here, its level)
    html(tip).v = `${named ? "" : `<b>${esc(d.title)}</b>`}${av ? `<em class="tav">${esc(av)}</em>` : ""}<span>${d.archive ? "archive" : esc(d.sub)} · ${d.date ? esc(d.date) : "no date"} · ${lvShown ? "" : `(Level ${d.level})`}(${d.body_in} in)(${d.body_out} out)${RANK[i] ? ` (#${RANK[i].toLocaleString()} in ${d.archive ? "the archive" : "the ideaverse"})` : ""}</span>${view === "sense" ? `<em class="tav">${esc(senseTip(i))}</em>` : ""}${view === "stars" && BOD[i] >= 0 ? `<em class="tav">✦ ${esc(bodyLabel(i))}</em>` : ""}`; tip.hidden = false;
    const tw = tip.offsetWidth; tip.style.left = Math.min(e.clientX + 14, win.innerWidth - tw - 8) + "px"; tip.style.top = (e.clientY + 14) + "px"; }
  else tip.hidden = true;
});
const end = e => { pts.delete(e.pointerId);
  if (pts.size === 0 && drag && !moved && drag.btn !== 2 && view === "chord" && pick(e.offsetX, e.offsetY) < 0) {   // click an arc to hold its ribbons; click it again or empty space to let go
    const a = chordArcAt(e.offsetX, e.offsetY); chPin = a >= 0 && a !== chPin ? a : -1; draw(); if (chPin >= 0) showArcTip(chPin); else { tip.hidden = true; tip.classList.remove("arc"); } if (a >= 0) { cv.classList.remove("drag"); drag = null; return; } }
  if (pts.size === 0) { cv.classList.remove("drag"); if (drag && drag.orbit && moved) { buildGrid(); save("iv-cam3", [yaw3, pitch3]); } if (drag && !moved && drag.btn !== 2) { const i = pick(e.offsetX, e.offsetY);
  if (i >= 0 && (focus >= 0 || focusArmed)) navTo(i); else { select(i); if (i >= 0 && isPhone()) flyTo(i); } toEditor(i); } drag = null; } };
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
cv.addEventListener("pointerleave", () => { if (hover >= 0) { hover = -1; draw(); } tip.hidden = true; });
function zoomAt(px, py, f){ const nk = Math.min(40, Math.max(view === "stars" ? .04 : .15, k*f)); f = nk/k; tx = px - (px - tx)*f; ty = py - (py - ty)*f; k = nk; draw(); }
cv.addEventListener("wheel", e => { e.preventDefault(); driftStop();
  if (!e.ctrlKey && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) {   // shift + wheel (or a sideways swipe) pans left and right
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; tx -= dx * (e.deltaMode === 1 ? 16 : 1); tip.hidden = true; draw(); return; }
  const f = Math.min(1.35, Math.max(.74, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)))); zoomAt(e.offsetX, e.offsetY, f); }, {passive:false});
cv.addEventListener("dblclick", e => zoomAt(e.offsetX, e.offsetY, 2));
$("#zin").onclick = () => zoomAt(W/2, H/2, 1.6); $("#zout").onclick = () => zoomAt(W/2, H/2, 1/1.6); $("#zfit").onclick = () => fit(true);
root.querySelectorAll("#xseg button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.x === mode)); b.onclick = () => setMode(b.dataset.x); });
$("#xmore").onchange = e => setMode(e.target.value || "time");
root.querySelectorAll("#xmore option").forEach(o => { if (o.value && !axisHas(o.value)) o.remove(); });   // only axes some note has
{ const rb = $('#xseg button[data-x="rank"]'); if (rb) rb.hidden = !axisHas("rank");
  const ab = $('#xseg button[data-x="ace"]'); if (ab && !FOLD.some(f => ACE.includes(f) && f !== "+" && f !== "x")) ab.textContent = "Folders"; }
$("#alllinks").onclick = e => { showAll = !showAll; e.currentTarget.setAttribute("aria-pressed", String(showAll)); draw(); };

// ---------- drawer ----------
const drawer = $("#drawer");
// the note panel can tuck away to a tab on the right edge (like the legend); the note stays selected
let drawerCollapsed = pref("iv-dcol", false) === true;
const dtab = $("#main").createEl("button", { cls: "dtab", attr: { "aria-label": "Show the note panel", title: "Show the note panel" } }); dtab.hidden = true;
function syncDtab(){ const on = sel >= 0 && drawerCollapsed; dtab.hidden = !on; if (on) dtab.setText("‹  " + (N[sel].title.length > 40 ? N[sel].title.slice(0, 39) + "…" : N[sel].title)); }
function setCollapsed(c){ drawerCollapsed = c; save("iv-dcol", c); if (sel >= 0) { drawer.hidden = c; if (!c) drawer.scrollTop = 0; } syncDtab(); resize(); }
dtab.onclick = () => setCollapsed(false);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function noteList(ids, tag){
  const s = [...new Set(ids)].filter(j => vis[j]).sort((a,b) => (N[b].level-N[a].level) || (N[b].score-N[a].score));
  const shown = s.slice(0, 80);
  return `<ul>${shown.map(j => `<li><button data-go="${j}"><span class="t">${esc(N[j].title)}</span><span class="m">${tag ? tag(j) + " · " : ""}L${N[j].level} · ${N[j].archive ? "archive" : esc(N[j].ace)}</span></button></li>`).join("")}</ul>${s.length > 80 ? `<div class="more">+ ${s.length-80} more</div>` : ""}`;
}
// ---------- trail: every note you open, in order; click a crumb to walk back ----------
let trail = [];
const TRAIL_MAX = 40;
function lvDot(j){ const lv = N[j].level, g = GRAD[lv];
  return `<i class="lv l${lv}" style="background:${g ? `linear-gradient(135deg,${g[0]},${g[1]})` : (lv === 2 ? css.l2 : css.l1)}"></i>`; }
// the trail's top edge drags up, lifting the crumbs above anything that covers the bottom of the pane (Obsidian's status bar, say)
let trailPad = Math.max(0, Math.min(140, +pref("iv-tpad", 0) || 0));
const setTrailPad = v => { trailPad = Math.round(Math.max(0, Math.min(140, v))); root.setCssProps({ "--tpad": trailPad + "px" }); };
setTrailPad(trailPad);
function addTrailGrip(el){
  const g = el.createDiv({ cls: "tgrip", attr: { title: "Drag up to lift the trail · double-click to reset", role: "separator", "aria-orientation": "horizontal", "aria-label": "Trail height" } });
  let y0 = 0, p0 = 0, on = false;
  g.addEventListener("pointerdown", e => { on = true; y0 = e.clientY; p0 = trailPad; g.setPointerCapture(e.pointerId); g.classList.add("on"); e.preventDefault(); });
  g.addEventListener("pointermove", e => { if (on) setTrailPad(p0 + (y0 - e.clientY)); });
  const stop = () => { if (!on) return; on = false; g.classList.remove("on"); save("iv-tpad", trailPad); };
  g.addEventListener("pointerup", stop); g.addEventListener("pointercancel", stop);
  g.addEventListener("dblclick", () => { setTrailPad(0); save("iv-tpad", 0); }); }
function renderTrail(){
  const el = $("#trail");
  if (!trail.length && sel < 0) { el.hidden = true; return; }
  const items = [...trail]; if (sel >= 0) items.push(sel);
  el.hidden = false;
  html(el).v = `<span class="tl">Trail</span>` + items.map((j, idx) => [j, idx]).reverse().map(([j, idx], pos) => {   // newest on the left, older ones to the right
    const now = idx === items.length - 1 && sel >= 0, off = !baseOK(j);
    return (pos ? `<span class="ar">←</span>` : "") + `<button class="cr${now ? " now" : ""}${off ? " off" : ""}" data-ti="${idx}" title="${esc(N[j].title)}${off ? " (hidden by filters)" : ""}" ${off ? "disabled" : ""}>${lvDot(j)}<span>${esc(N[j].title)}</span></button>`;
  }).join("") + `<button class="chip clr" id="trclear">Clear</button>`;
  el.querySelectorAll("[data-ti]").forEach(b => {
    const idx = +b.dataset.ti, j = items[idx];
    b.onclick = () => { if (idx === items.length - 1 && sel >= 0) { if (focus < 0) flyTo(j); return; } navTo(j); toEditor(j);   /* a crumb is just another step: it joins the front, nothing is erased */ };
    b.onmouseenter = () => { if (!morphing) { hover = j; draw(); } };
    b.onmouseleave = () => { hover = -1; draw(); };
  });
  $("#trclear").onclick = () => { trail = []; renderTrail(); };
  el.scrollLeft = 0;
  addTrailGrip(el);
}
function select(i, fromTrail){
  if (i >= 0 && sensePlaying) tlWander();   // clicking a note while the timeline plays stops it, so you can wander
  if (rec && i >= 0 && rec.notes[rec.notes.length - 1] !== N[i].path) { rec.notes.push(N[i].path); syncRec(); }   // recording a tour
  if (!fromTrail && i >= 0 && sel >= 0 && sel !== i) { trail.push(sel); if (trail.length > TRAIL_MAX) trail.shift(); }
  sel = i;
  if (i < 0) { if (!drawer.hidden) { drawer.hidden = true; resize(); } syncDtab(); renderTrail(); draw(); return; }
  const d = N[i], up = [], down = [], rel = [], prop = [], upl = [], upTo = new Set();
  for (let q = 0; q < EOUT[i].length; q += 2) if (EOUT[i][q+1] === 1) upTo.add(EOUT[i][q]);   // notes named in this note's up property
  for (const j of new Set([...out[i], ...inn[i]])) if (vis[j]) { const kk = EKIND.get(i*n + j); (kk === 4 ? rel : kk === 5 ? prop : kk === 1 ? upl : N[j].level > d.level || (N[j].level === d.level && Y[j] < Y[i]) ? up : down).push(j); }
  html(drawer).v = `<button class="x" id="dx">Close</button><button class="x dcol" id="dcol" title="Tuck the panel away; the note stays selected">›</button>
    <h2>${esc(d.title)}</h2><div class="path">${esc(d.path)}${d.date ? " · " + esc(d.date) : ""}</div>
    <div class="lvl">Level ${d.level} · ${esc(LV[d.level].name)}</div>${axisValue(d) ? `<div class="lvl axv">${esc(axisValue(d))}</div>` : ""}${d.archive ? `<div class="lvl" style="margin-left:6px">Archive</div>` : ""}${view === "arc" ? `<div class="lvl axv" title="${esc(ARW[i])}">ARC · ${ARC_L[ARS[i]].name} · ${esc(ARW[i])}</div>` : ""}${view === "chord" ? `<div class="lvl axv">◯ ${esc(CHCAT[CHC[i]].short)}</div>` : ""}${view === "stars" && BOD[i] >= 0 ? `<div class="lvl axv">✦ ${esc(bodyLabel(i))}</div>` : ""}
    <div class="nums"><div><b>${d.body_in}</b><span>linked from</span></div><div><b>${d.body_out}</b><span>links to</span></div><div><b>${d.up_in}</b><span>link up to it</span></div><div><b>${d.score.toFixed(1)}</b><span>link score</span></div></div>
    ${whyBox(i)}<button class="open" id="dopen" title="Open the note (Cmd/Ctrl-click: in a new tab)">Open note</button><button class="focusbtn" id="dfocus">${focus === i ? "Exit focus" : "Focus on its links"}</button>
    ${up.length || down.length ? `<div class="lgrp" title="Links in the body of the note, placed by emergence level">Emergence</div>` : ""}
    ${up.length ? `<h5><i style="border-color:var(--up)"></i>Above · ${up.length}</h5>${noteList(up)}` : ""}
    ${down.length ? `<h5><i style="border-color:var(--down)"></i>Below · ${down.length}</h5>${noteList(down)}` : ""}
    ${upl.length || rel.length || prop.length ? `<div class="lgrp${up.length || down.length ? " sep" : ""}" title="Links written in the frontmatter">Properties</div>` : ""}
    ${upl.length ? `<h5><i style="border-color:var(--upp)"></i>Uplinks · ${upl.length}</h5>${noteList(upl)}` : ""}
    ${rel.length ? `<h5><i style="border-color:var(--rel)"></i>Related · ${rel.length}</h5>${noteList(rel)}` : ""}
    ${prop.length ? `<h5><i style="border-color:var(--prop)"></i>Other properties · ${prop.length}</h5>${noteList(prop)}` : ""}
    ${!up.length && !down.length && !rel.length && !prop.length && !upl.length ? `<h5>No links on the map</h5>` : ""}`;
  const opening = drawer.hidden && !drawerCollapsed; drawer.hidden = drawerCollapsed; drawer.scrollTop = 0; syncDtab();
  if (opening) { resize(); if (!morphing) keepInView(i); }
  $("#dx").onclick = () => select(-1);
  $("#dcol").onclick = () => setCollapsed(true);
  $("#dopen").onclick = e => host.openNote(d.path, e.metaKey || e.ctrlKey);
  $("#dfocus").onclick = () => { focusArmed = false; setFocus(focus === i ? -1 : i); };
  drawer.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { navTo(+b.dataset.go); toEditor(+b.dataset.go); });
  renderTrail(); draw();
}
onKey(e => {
  if (e.key === "Escape") { if (!$("#results").hidden) { $("#results").hidden = true; return; } if (sel < 0 && focus >= 0) { setFocus(-1); return; } select(-1); }
  if (e.key === "/" && doc.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
});

// ---------- search ----------
const q = $("#q"), res = $("#results"); let hits = [], hi = 0;
const lowered = N.map(d => d.title.toLowerCase());
function runSearch(){
  const s = q.value.trim().toLowerCase(); if (!s) { res.hidden = true; return; }
  const words = s.split(/\s+/);
  hits = [];
  for (let i=0;i<n;i++) { if (!vis[i] && !(focus >= 0 && visBase(i))) continue; const t = lowered[i]; if (words.every(w => t.includes(w))) hits.push(i); }
  hits.sort((a,b) => ((lowered[b].startsWith(s)) - (lowered[a].startsWith(s))) || (N[b].level-N[a].level) || (N[b].score-N[a].score));
  hits = hits.slice(0, 9); hi = 0;
  html(res).v = hits.length ? hits.map((i,j) => `<button data-i="${i}" class="${j===0?"on":""}"><span class="t">${esc(N[i].title)}</span><span class="m">L${N[i].level} · ${esc(N[i].sub)}</span></button>`).join("") : `<button disabled><span class="t">No match</span></button>`;
  res.hidden = false;
  res.querySelectorAll("[data-i]").forEach(b => b.onmousedown = ev => { ev.preventDefault(); go(+b.dataset.i); });
}
function go(i){ res.hidden = true; q.blur(); navTo(i); toEditor(i); }
q.addEventListener("input", runSearch);
q.addEventListener("keydown", e => {
  if (res.hidden || !hits.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); hi = (hi + (e.key === "ArrowDown" ? 1 : hits.length-1)) % hits.length; res.querySelectorAll("button").forEach((b,j) => b.classList.toggle("on", j===hi)); }
  if (e.key === "Enter") { e.preventDefault(); go(hits[hi]); }
});
q.addEventListener("blur", () => win.setTimeout(() => res.hidden = true, 120));

// ---------- archive switch and year sliders ----------
const fromIn = $("#from");
fromIn.min = SLMIN; fromIn.max = NOW_Y;
$("#fromlo").textContent = SLMIN; $("#fromhi").textContent = NOW_Y;
function syncRange(){
  fromIn.value = fromY; $("#fromv").textContent = fromY;
  $("#archtog").checked = showArch; $("#archrow").hidden = $("#specialt").hidden = !hasArch;
  $("#subctl").hidden = mode !== "ace";
  const sv = view === "sense", lay = sv || mode === "time" || mode === "ace";   // the Layout section shows only where there are layout settings
  root.querySelectorAll("#laygrp > *").forEach(el => el.hidden = !lay); $("#laygrp").previousElementSibling.hidden = !lay;
  if (lay) { $("#startms").hidden = sv || mode !== "time"; $("#subctl").hidden = sv || mode !== "ace"; $("#sensems").hidden = !sv; }
  $("#sensebtn").textContent = syFull() ? "All years" : SY0 === SY1 ? `${SY0} only` : SY0 <= SLMIN ? `Through ${SY1}` : `${SY0}–${SY1}`;
  $("#sy0").value = SY0; $("#sy1").value = SY1; $("#syv").textContent = syFull() ? `All years (${SLMIN}–${NOW_Y})` : SY0 === SY1 ? `${SY0} only` : `${SY0 <= SLMIN ? `up to ${SY1}` : `${SY0} – ${SY1}`}`;
  { const f = y => (y - SLMIN)/Math.max(1, NOW_Y - SLMIN), el = $("#syfill"); el.style.left = `calc(9px + (100% - 18px)*${f(SY0)})`; el.style.width = `calc((100% - 18px)*${f(SY1) - f(SY0)})`; }
  $("#startbtn").textContent = `Starts ${fromY}`;
  if (senseT == null && typeof senseSteps === "function" && GROWV()) { SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1; }
  $("#xmore").value = AXES[mode] && mode !== "rank" ? mode : ""; $("#xmore").classList.toggle("on", !!(AXES[mode] && mode !== "rank"));
  root.querySelectorAll("#subseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.o === subOrder)));
  root.querySelectorAll("#vseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === view)));
  root.querySelectorAll("#laneseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === lanes)));
  syncFold();
  syncColl();
}
fromIn.addEventListener("input", () => { fromY = fullY = +fromIn.value; save("iv-from", fromY); syncRange(); relayout(false); });
$("#archtog").onchange = () => { showArch = $("#archtog").checked; save("iv-arch", showArch); syncRange(); relayout(true); };
$("#yearschip").onclick = e => { const h = root.querySelector("header"), o = !h.classList.contains("rangeopen"); h.classList.toggle("rangeopen", o); e.currentTarget.setAttribute("aria-expanded", String(o)); };
// folders, collection, lanes, view
// Folders ▾: the top-level folders the scan found, plus the x/z archive as a special layer
const FOLDN = {}; for (const d of N) if (!d.archive) FOLDN[d.ace] = (FOLDN[d.ace] || 0) + 1;
const foldName = f => ACE_SYM[f] ? `${f} ${ACE_SYM[f][1]}` : f;
$("#archn").textContent = N.filter(d => d.archive).length.toLocaleString();
let foldOpen = new Set();   // folder paths whose subfolders are showing in the menu
function subApply(){ save("iv-subsoff", [...subOff]); subCompute(); syncRange(); relayout(true); renderFoldList(); }
const ancestors = p => { const out = []; let q = p; while (q.includes("/")) { q = q.slice(0, q.lastIndexOf("/")); out.unshift(q); } return out; };   // top folder first
const realPath = p => p.endsWith("/.") ? p.slice(0, -2) + "/x" : p;   // loose notes of a folder sit "under" it
function showOnly(target){   // just this folder (and everything in it): every sibling along the way off, and loose notes of each ancestor off
  const top = target.split("/")[0]; folders = [top]; save("iv-folders", folders); subOff = new Set();
  for (const a of ancestors(realPath(target))) { const f = FT.get(a); if (f.direct && a + "/." !== target) subOff.add(a + "/."); for (const k_ of f.kids) if (k_ !== target && !target.startsWith(k_ + "/")) subOff.add(k_); }
  subApply(); }
function subOn(path){   // turn a folder back on: lift any switched-off ancestor, keeping its other contents off
  const top = path.split("/")[0];
  if (!folders.includes(top)) { folders = FOLD.filter(x => x === top || folders.includes(x)); save("iv-folders", folders); const f = FT.get(top); if (f.direct) subOff.add(top + "/."); for (const k_ of f.kids) subOff.add(k_); }
  for (const a of ancestors(realPath(path))) if (subOff.has(a)) { subOff.delete(a); const f = FT.get(a); if (f.direct) subOff.add(a + "/."); for (const k_ of f.kids) subOff.add(k_); }
  subOff.delete(path); if (!path.endsWith("/.")) for (const k_ of [...subOff]) if (k_.startsWith(path + "/")) subOff.delete(k_); }
function subShown(path){ const top = path.split("/")[0]; if (!folders.includes(top) || subOff.has(path)) return false;
  for (const a of ancestors(realPath(path))) if (subOff.has(a)) return false; return true; }
function subPartial(path){ for (const k_ of subOff) if (k_.startsWith(path + "/") && k_ !== PACKS) return true; return false; }   // packs being off is the norm, not "some"
function subRows(path, depth){   // an open folder's children, and theirs for any that are open too
  const f = FT.get(path); let h = "";
  const row = (p_, name, count, hasKids, loose) => { const on = subShown(p_), part = !loose && on && subPartial(p_), op = foldOpen.has(p_);
    h += `<div class="frow fsrow" style="padding-left:${depth*14}px"><label><input type="checkbox" data-sub="${esc(p_)}" ${on ? "checked" : ""}><span class="t">${esc(name)}${part ? ` <span class="m">· some</span>` : ""}</span><button class="fonly" data-only="${esc(p_)}" title="Show only this">only</button><span class="m">${count.toLocaleString()}</span></label>${hasKids ? `<button class="fsub${op ? " on" : ""}" data-f="${esc(p_)}" title="Subfolders" aria-expanded="${op}">›</button>` : `<span class="fsubsp"></span>`}</div>`;
    if (hasKids && op) h += subRows(p_, depth + 1); };
  if (f.direct && f.kids.length) row(path + "/.", "(loose notes)", f.direct, false, true);
  for (const k_ of f.kids) { const c = FT.get(k_); row(k_, c.name, c.total, c.kids.length > 0, false); }
  return h; }
function renderFoldList(){
  html($("#foldlist")).v = FOLD.map(f => { const t = FT.get(f), hasKids = t && t.kids.length > 0, op = foldOpen.has(f), part = folders.includes(f) && (subPartial(f) || subOff.has(f + "/."));
    return `<div class="frow"><label><input type="checkbox" value="${esc(f)}" ${folders.includes(f) ? "checked" : ""}><span class="t">${esc(foldName(f))}${part ? ` <span class="m">· some</span>` : ""}</span><span class="m">${(FOLDN[f]||0).toLocaleString()}</span></label>${hasKids ? `<button class="fsub${op ? " on" : ""}" data-f="${esc(f)}" title="Subfolders" aria-label="Subfolders of ${esc(f)}" aria-expanded="${op}">›</button>` : ""}</div>`
      + (hasKids && op ? `<div class="fsubs">${subRows(f, 0)}</div>` : ""); }).join("");
  $("#foldlist").querySelectorAll(".fsub").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const f = b.dataset.f; if (foldOpen.has(f)) { for (const o of [...foldOpen]) if (o === f || o.startsWith(f + "/")) foldOpen.delete(o); } else foldOpen.add(f); renderFoldList(); });
  $("#foldlist").querySelectorAll("input[data-sub]").forEach(cb => cb.onchange = () => { const p_ = cb.dataset.sub;
    if (cb.checked) subOn(p_); else { subOff.add(p_); if (!p_.endsWith("/.")) for (const k_ of [...subOff]) if (k_.startsWith(p_ + "/")) subOff.delete(k_); }
    subApply(); });
  $("#foldlist").querySelectorAll(".fonly").forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); showOnly(b.dataset.only); });
  $("#foldlist").querySelectorAll("input:not([data-sub])").forEach(cb => cb.onchange = () => {
    folders = FOLD.filter(f => f === cb.value ? cb.checked : folders.includes(f));
    for (const k_ of [...subOff]) if (k_.split("/")[0] === cb.value) subOff.delete(k_);   // a top folder toggles whole (packs stay off until picked)
    if (cb.value === PACKS.split("/")[0] && FT.has(PACKS)) subOff.add(PACKS);
    save("iv-folders", folders); subApply(); });
}
function syncFold(){
  const all = folders.length === FOLD.length && isDefSubs();
  if (!folders.length) { $("#foldbtn").textContent = "No folders" + (showArch && hasArch ? "+" : ""); $("#foldx").hidden = false; $("#foldbtn").title = "Pick a folder"; return; }
  if (!isDefSubs()) { const shown = []; const walk = p_ => { if (!subShown(p_)) return; if (!subPartial(p_) && !subOff.has(p_ + "/.")) { shown.push(p_); return; } const f = FT.get(p_); if (f.direct && !subOff.has(p_ + "/.")) shown.push(p_ + "/."); for (const k_ of f.kids) walk(k_); };
    for (const f of folders) walk(f);
    const nm = p_ => p_.endsWith("/.") ? FT.get(p_.slice(0, -2)).name + " (loose)" : FT.get(p_).name;
    $("#foldbtn").textContent = (shown.length <= 2 ? "Folders: " + shown.map(nm).join(", ") : `${shown.length} folders`) + (showArch && hasArch ? "+" : ""); $("#foldx").hidden = false; $("#foldbtn").title = shown.join(", "); return; }
  const arch = showArch && hasArch;   // short: "All folders+", "Folders: Atlas, Efforts+", "4 folders" ("+" = with the x/z archive), "4 folders"; the full list is in the tooltip
  $("#foldbtn").textContent = (all ? "All folders" : folders.length <= 2 ? "Folders: " + folders.join(", ") : `${folders.length} folders`) + (arch ? "+" : "");   // "+" = the x/z archive is on
  $("#foldx").hidden = all;
  $("#foldbtn").title = folders.map(foldName).join(", ") + (showArch && hasArch ? " · x/z archive" : "");
}
$("#foldnone").onclick = () => { folders = []; subOff = defSubs(); save("iv-subsoff", []); save("iv-folders", folders); subCompute(); renderFoldList(); syncRange(); relayout(true); };
$("#foldall").onclick = () => { folders = [...FOLD]; subOff = defSubs(); save("iv-subsoff", [...subOff]); subCompute(); save("iv-folders", folders); renderFoldList(); syncRange(); relayout(true); };
// small popovers on the options row: Folders, Years, Layout (Collections has its own, below)
const POPS = [["#foldbtn","#foldpop","#foldms", renderFoldList], ["#startbtn","#startpop","#startms"]];
function closePops(except){ for (const [b,p] of POPS) if (p !== except && !$(p).hidden) { $(p).hidden = true; $(b).setAttribute("aria-expanded", "false"); } }
for (const [b,p,,onOpen] of POPS) $(b).onclick = e => { e.stopPropagation(); const el = $(p), open = el.hidden; closePops(p); if (typeof closeColl === "function") closeColl(); el.hidden = !open; $(b).setAttribute("aria-expanded", String(open)); if (open && onOpen) onOpen(); };
$("#folddone").onclick = () => closePops();
on(doc, "pointerdown", e => { for (const [b,p,w] of POPS) if (!$(p).hidden && !$(w).contains(e.target)) { $(p).hidden = true; $(b).setAttribute("aria-expanded", "false"); } });
onKey(e => { if (e.key === "Escape") closePops(); });
let _collList = [];
{ // group spellings case-insensitively; show the most common spelling; sort A–Z
  const cc = {}, sp = {};
  for (const d of N) if (!d.archive) for (const c of d.collections || []) { const key = c.toLowerCase(); cc[key] = (cc[key]||0) + 1; (sp[key] ||= {})[c] = (sp[key][c]||0) + 1; }
  const label = key => Object.entries(sp[key]).sort((a,b) => b[1]-a[1])[0][0];
  const list = Object.keys(cc).filter(key => cc[key] >= 10).map(key => [key, label(key), cc[key]]).sort((a,b) => a[1].localeCompare(b[1], undefined, {sensitivity:"base"}));
  colls = colls.filter(c => cc[c]);
  _collList = list; }
const COLL = _collList, COLLNAME = Object.fromEntries(COLL.map(([key,name]) => [key, name]));
let collTop = new Set();   // checked collections float to the top; the order is set when the list opens or the filter changes, not on every click
function renderCollList(resort){
  const s = ($("#collq").value || "").trim().toLowerCase();
  if (resort) collTop = new Set(colls);
  const rows = COLL.filter(([key,name]) => !s || name.toLowerCase().includes(s));
  rows.sort((a,b) => (collTop.has(b[0]) - collTop.has(a[0])));   // stable: A–Z within each group
  html($("#colllist")).v = rows.map(([key,name,v]) =>
    `<label><input type="checkbox" value="${esc(key)}" ${colls.includes(key) ? "checked" : ""}><span class="t">${esc(name)}</span><span class="m">${v.toLocaleString()}</span></label>`).join("") || `<p class="pn">No match.</p>`;
  $("#colllist").querySelectorAll("input").forEach(cb => cb.onchange = () => {
    colls = cb.checked ? [...colls, cb.value] : colls.filter(c => c !== cb.value);
    save("iv-coll", colls); syncColl(); relayout(true); });
}
function syncColl(){
  const b = $("#collbtn");
  b.textContent = !colls.length ? "All collections" : colls.length === 1 ? COLLNAME[colls[0]] : `${colls.length} collections · ${collMode === "all" ? "all" : "any"}`;
  b.title = colls.map(c => COLLNAME[c]).join(", ");
  $("#collx").hidden = !colls.length;
  b.classList.add("on");   // always lit: it shows what's in view, all collections or the chosen ones
  root.querySelectorAll("#collmode button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.m === collMode)));
  $("#collcount").textContent = colls.length ? `${colls.length} checked` : "";
}
function closeColl(){ $("#collpop").hidden = true; $("#collbtn").setAttribute("aria-expanded", "false"); }
$("#collbtn").onclick = e => { e.stopPropagation(); closePops(); const p = $("#collpop"); p.hidden = !p.hidden; $("#collbtn").setAttribute("aria-expanded", String(!p.hidden)); if (!p.hidden) { renderCollList(true); $("#collq").focus(); } };
$("#collq").addEventListener("input", () => renderCollList(true));
root.querySelectorAll("#collmode button").forEach(x => x.onclick = () => { if (collMode === x.dataset.m) return; collMode = x.dataset.m; save("iv-collmode", collMode); syncColl(); if (colls.length > 1) relayout(true); });
$("#collclear").onclick = () => { colls = []; save("iv-coll", colls); syncColl(); renderCollList(true); relayout(true); };
$("#colldone").onclick = closeColl;
// quick clear: the little × inside a filter pill resets just that filter
$("#collx").onclick = e => { e.stopPropagation(); colls = []; save("iv-coll", colls); syncColl(); if (!$("#collpop").hidden) renderCollList(true); relayout(true); };
$("#foldx").onclick = e => { e.stopPropagation(); folders = [...FOLD]; save("iv-folders", folders); subOff = defSubs(); save("iv-subsoff", [...subOff]); subCompute(); if (!$("#foldpop").hidden) renderFoldList(); syncRange(); relayout(true); };

on(doc, "pointerdown", e => { if (!$("#collpop").hidden && !$("#collms").contains(e.target)) closeColl(); });
onKey(e => { if (e.key === "Escape" && !$("#collpop").hidden) closeColl(); });
syncColl();
root.querySelectorAll("#subseg button").forEach(b => b.onclick = () => { if (subOrder === b.dataset.o) return; subOrder = b.dataset.o; save("iv-suborder", subOrder); syncRange(); relayout(true); });
root.querySelectorAll("#laneseg button").forEach(b => b.onclick = () => { if (lanes === b.dataset.l) return; lanes = b.dataset.l; save("iv-lanes", lanes); syncRange(); relayout(true); });
POPS.push(["#vmore", "#vmorepop", "#vsegms"]);
$("#vmore").onclick = e => { e.stopPropagation(); const el = $("#vmorepop"), open = el.hidden; closePops("#vmorepop"); el.hidden = !open; $("#vmore").setAttribute("aria-expanded", String(open)); };
$("#gost").onclick = () => { closePops(); setView("spacetime"); };   // Space-Time: experimental, tucked under ⋯ → Experimental for now
root.querySelectorAll("#vseg button[data-v]").forEach(b => b.onclick = e => {
  if (b.dataset.v === "stars" && view === "stars") { e.stopPropagation(); const el = $("#starpop"), open = el.hidden; closePops("#starpop"); el.hidden = !open; b.setAttribute("aria-expanded", String(open)); return; }
  if (b.dataset.v === "sense" && view === "sense" && SAI) { e.stopPropagation(); const el = $("#sensepop"), open = el.hidden; closePops("#sensepop"); el.hidden = !open; b.setAttribute("aria-expanded", String(open)); return; }
  setView(b.dataset.v); });

// scoring panel
const SROWS = [
  {h:"Link weights"},
  {key:"w.in", label:"Links in", hint:"Other notes link to it in their text. The clearest sign of a hub: other notes point here.", min:0, max:2, step:.05},
  {key:"w.out", label:"Links out", hint:"It links out in its own text. Lifts maps and indexes, and also busy notes like monthly reviews that link every daily note.", min:0, max:2, step:.05},
  {key:"w.both", label:"Links both in and out", hint:"A bonus only when a note has links in AND out (zero if either side is zero). Rewards notes woven into the web over pure lists or pure targets.", min:0, max:2, step:.05},
  {key:"w.up", label:"Notes that link up to it", hint:"Uplinks: notes that name it in their up or related property. Lifts the parent of a series: a year above its months, a project above its notes.", min:0, max:2, step:.05},
  {key:"w.coll", label:"Notes in its collection", hint:"Notes that list it in their collections, which makes it a collection note (Maps, People, Reviews…). Off by default: big collections are named by hundreds of notes and would swamp everything.", min:0, max:2, step:.05},
  {h:"Where the levels start"},
  {key:"top", label:"Level 5: top notes by score", hint:"The highest-scoring notes join the home notes at the top. Raising it fills Level 5 from Level 4 down.", min:0, max:100, step:1},
  {key:"l4", label:"Level 4 from score", hint:"Any note scoring at least this. A map that links to 3+ other maps is Level 4 whatever its score.", min:2, max:12, step:.1},
  {key:"l3", label:"Level 3 from score", hint:"Any note scoring at least this. Every map is at least Level 3 whatever its score; so a Level 2 note can outscore a Level 3 map.", min:1, max:12, step:.1}];
const getS = key => key.split(".").reduce((o,k2) => o[k2], S) ?? 0;   // a weight missing from older saved settings reads as 0
const setS = (key, v) => { const ks = key.split("."); ks.slice(0,-1).reduce((o,k2) => o[k2], S)[ks.at(-1)] = v; };
html($("#srows")).v = SROWS.map((r,j) => r.h ? `<h6>${r.h}</h6>${r.h === "Link weights" ? `<p class="pn" style="margin:-2px 0 6px">Score = each kind of link, counted with diminishing returns (1 link → 0.7, 3 → 1.4, 10 → 2.4, 100 → 4.6), times its weight, added up. Prev/next series links don't count. Within a level, a higher score sits higher.</p>` : `<p class="pn" style="margin:-2px 0 6px">Checked top down, first match wins: 5 (home or top N), 4, 3, then 2 (any link) and 1 (no links). Open a note to see exactly why it landed where it did.</p>`}` : `<label class="srow"><span>${r.label}</span><b id="sv${j}"></b><input type="range" id="s${j}" min="${r.min}" max="${r.max}" step="${r.step}"><small>${r.hint}</small></label>`).join("");
function syncScore(){
  SROWS.forEach((r,j) => { if (r.h) return; const v = getS(r.key); $("#s"+j).value = v; $("#sv"+j).textContent = r.step >= 1 ? v : (+v).toFixed(r.step < .1 ? 2 : 1); });
  const c = {}; for (const d of N) if (!d.archive) c[d.level] = (c[d.level]||0) + 1;
  $("#sline").textContent = `in ${S.w.in.toFixed(2)} · out ${S.w.out.toFixed(2)} · both ${S.w.both.toFixed(2)} · up ${S.w.up.toFixed(2)} · collections ${S.w.coll.toFixed(2)} · L5 top ${S.top} · L4 ${(+S.l4).toFixed(1)} · L3 ${(+S.l3).toFixed(1)}`;
  html($("#pcounts")).v = [5,4,3,2,1].map(l => `<span>L${l} <b>${(c[l]||0).toLocaleString()}</b></span>`).join("");
}
SROWS.forEach((r,j) => { if (r.h) return; $("#s"+j).addEventListener("input", e => { setS(r.key, +e.target.value); save("iv-score", S); relayout(false, true); syncScore(); if (sel >= 0 && !drawer.hidden) select(sel, true); }); });
$("#scopy").onclick = async e => { const b = e.currentTarget, txt = $("#sline").textContent;
  try { await navigator.clipboard.writeText(txt); b.textContent = "Copied"; }
  catch { const r = doc.createRange(); r.selectNodeContents($("#sline")); const s = win.getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; }
  win.setTimeout(() => b.textContent = "Copy", 1500); };
$("#sreset").onclick = () => { S = JSON.parse(JSON.stringify(DEF)); save("iv-score", S); relayout(true, true); syncScore(); if (sel >= 0 && !drawer.hidden) select(sel, true); };
const sp = $("#scorepanel");
$("#scorebtn").onclick = e => { $("#effpanel").hidden = true; sp.hidden = !sp.hidden; e.currentTarget.setAttribute("aria-expanded", String(!sp.hidden)); if (!sp.hidden) syncScore(); };
$("#spx").onclick = () => { sp.hidden = true; $("#scorebtn").setAttribute("aria-expanded", "false"); };
syncRange();

// ---------- focus + efforts review ----------
const EFF_GROUPS = [
  ["Areas", p => /^Efforts\/Areas\/[^/]+\.md$/.test(p)],
  ["Active projects", p => /^Efforts\/Projects\/Active\/[^/]+\.md$/.test(p)],
  ["Simmering", p => /^Efforts\/Projects\/Simmering\/[^/]+\.md$/.test(p)],
  ["Sleeping", p => /^Efforts\/Projects\/Sleeping\/[^/]+\.md$/.test(p)],
  ["Done", p => /^Efforts\/Projects\/Sleeping\/Done\/[^/]+\.md$/.test(p)],
  ["Dropped", p => /^Efforts\/Projects\/Sleeping\/Dropped\/[^/]+\.md$/.test(p)],
  ["Other projects", p => /^Efforts\/Projects\/[^/]+\.md$/.test(p)]];
const EFF = EFF_GROUPS.map(([name, test]) => [name, N.map((d,i) => i).filter(i => test(N[i].path)).sort((a,b) => N[a].title.replace(/^[^\p{L}\p{N}]+/u,"").localeCompare(N[b].title.replace(/^[^\p{L}\p{N}]+/u,""), undefined, {sensitivity:"base"}))]).filter(([,ids]) => ids.length);
const EFF_ORDER = EFF.flatMap(([,ids]) => ids);
function linkCount(i){ return new Set(out[i].concat(inn[i])).size; }
function renderEffList(){
  const s = ($("#effq").value || "").trim().toLowerCase();
  html($("#efflist")).v = EFF.map(([name, ids]) => {
    const m = ids.filter(i => !s || N[i].title.toLowerCase().includes(s)); if (!m.length) return "";
    return `<h6><span>${esc(name)}</span><span>${m.length}</span></h6><ul>${m.map(i => `<li><button data-ef="${i}" class="${i === focus ? "on" : ""}">${lvDot(i).replace('class="lv', 'class="lv')}<span class="t">${esc(N[i].title)}</span><span class="m">${linkCount(i)}</span></button></li>`).join("")}</ul>`;
  }).join("") || `<p class="pn">No match.</p>`;
  $("#efflist").querySelectorAll("[data-ef]").forEach(b => b.onclick = () => { setFocus(+b.dataset.ef); if (isPhone()) closeEff(); });
}
function closeEff(){ $("#effpanel").hidden = true; $("#effbtn").setAttribute("aria-expanded", "false"); }
$("#effbtn").onclick = e => { const p = $("#effpanel"); p.hidden = !p.hidden; e.currentTarget.setAttribute("aria-expanded", String(!p.hidden)); if (!p.hidden) { $("#scorepanel").hidden = true; renderEffList(); } };
$("#efx").onclick = closeEff; $("#effbtn").hidden = !EFF.length;
// Follow note: the map follows the note that's active in Obsidian, like a local graph linked to the active note
let following = pref("iv-follow", false) === true;
function followPath(path, force){ if (!following || dead || !path) return; const i = PIDX.get(path); if (i == null || (i === sel && !force)) return;
  if (!vis[i] && focus < 0) return;   // filtered off the map: stay put
  navTo(i); }
// ...and the other way: while following, a note you pick on the map opens in the editor too (the map keeps focus)
function toEditor(i){ if (following && i >= 0 && host.openNote) host.openNote(N[i].path, false, true); }
function setFollowing(on){ following = on; save("iv-follow", on); $("#follownote").setAttribute("aria-pressed", String(on)); if (on) followPath(host.activePath && host.activePath(), true); }
$("#follownote").onclick = () => setFollowing(!following);
$("#follownote").setAttribute("aria-pressed", String(following));
$("#focusmode").onclick = () => {
  if (focus >= 0 || focusArmed) { focusArmed = false; $("#focusmode").setAttribute("aria-pressed", "false"); if (focus >= 0) setFocus(-1); return; }
  if (sel >= 0) setFocus(sel); else { focusArmed = true; $("#focusmode").setAttribute("aria-pressed", "true"); }
};
$("#effq").addEventListener("input", renderEffList);
let focusArmed = false;
// one door for every "go to this note": map click, drawer link, search, trail, autoplay
function navTo(j, fromTrail){
  if (j < 0) { select(-1); return; }
  if (focus >= 0 || focusArmed) { focusArmed = false; setFocus(j, fromTrail); }
  else { select(j, fromTrail); flyTo(j); }
}
function setFocus(i, fromTrail){
  focus = i; computeFocus();
  const fb = $("#focusbar"); if (fb.hidden !== (i < 0)) { fb.hidden = i < 0; if (i >= 0 && !fb.hasChildNodes()) html(fb).v = "&nbsp;"; resize(); }
  const prev = sel; if (i >= 0) { sel = i; if (drawer.hidden && !isPhone() && !drawerCollapsed) { drawer.hidden = false; resize(); } }   // open the panel first so the camera plans for the narrower map
  relayout(true, false, i >= 0 ? (xs, ys) => visTarget(xs, ys) : () => fitTarget());
  sel = prev;
  if (i >= 0) select(i, fromTrail || prev === i);   // refresh the drawer with the focused set
  else if (sel >= 0 && vis[sel]) select(sel, true);   // leaving focus: the panel's button goes back to "Focus on its links"
  $("#focusmode").setAttribute("aria-pressed", String(focus >= 0 || focusArmed));
  renderFocusBar(); if (!$("#effpanel").hidden) renderEffList();
}
function renderFocusBar(){
  const fb = $("#focusbar");
  if (focus < 0) { fb.hidden = true; fitFocus(); return; }
  let c = 0; for (let i=0;i<n;i++) if (vis[i] && i !== focus) c++;
  const pos = EFF_ORDER.indexOf(focus);
  html(fb).v = `<span class="fl">Focus</span><span class="fn" title="${esc(N[focus].title)}">${esc(N[focus].title)}</span><span class="fc">${c.toLocaleString()} linked</span>
    <div class="seg" role="group" aria-label="Direction"><button data-fd="out" title="Notes it links to">Out</button><button data-fd="in" title="Notes that link to it">In</button><button data-fd="both" title="Both directions">Both</button></div>
    <span class="sl4">steps</span><div class="seg" role="group" aria-label="Steps"><button data-fs="1" title="Direct links">1</button><button data-fs="2" title="Links of links">2</button></div>
    ${pos >= 0 ? `<span class="nav"><button id="fprev" ${pos <= 0 ? "disabled" : ""} aria-label="Previous effort" title="Previous effort">‹</button><button id="fnext" ${pos >= EFF_ORDER.length-1 ? "disabled" : ""} aria-label="Next effort" title="Next effort">›</button></span>` : ""}
    <button class="fx" id="fexit" title="Exit focus (Esc)">Exit</button>`;
  fb.hidden = false;
  fb.querySelectorAll("[data-fd]").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.fd === fDir)); b.onclick = () => { fDir = b.dataset.fd; setFocus(focus); }; });
  fb.querySelectorAll("[data-fs]").forEach(b => { b.setAttribute("aria-pressed", String(+b.dataset.fs === fDepth)); b.onclick = () => { fDepth = +b.dataset.fs; setFocus(focus); }; });
  if (pos >= 0) { $("#fprev").onclick = () => setFocus(EFF_ORDER[pos-1]); $("#fnext").onclick = () => setFocus(EFF_ORDER[pos+1]); }
  $("#fexit").onclick = () => { focusArmed = false; setFocus(-1); };
  fitFocus();
}
// the focus bar sits inline in the top row when it fits there; otherwise on its own line, so search and theme never move
function fitFocus(){
  const h = root.querySelector("header"), fb = $("#focusbar"); h.classList.remove("fbline");
  if (fb.hidden || isPhone()) return;
  const top = root.querySelector(".brand").offsetTop + 30;
  if (fb.offsetTop > top || $(".search").offsetTop > top || $("#themeseg").offsetTop > top) h.classList.add("fbline");
}
on(win, "resize", () => fitFocus());

dbg.__ivCam = () => ({k, tx, ty, morphing});   // read-only hook for automated checks
// ---------- autoplay: Random (any note) or Thread (note to linked note) ----------
let playMode = pref("iv-pmode", "thread"), playSec = Math.max(2, Math.min(30, +pref("iv-psec", 6))), playing = false, pTimer = 0;
let runSeen = new Set(), runStack = [];
function pickRandom(){ const a = []; for (let i=0;i<n;i++) if (baseOK(i) && i !== sel) a.push(i); return a.length ? a[Math.floor(Math.random()*a.length)] : -1; }
function pickThread(){
  let cur = sel;
  if (cur < 0 || !baseOK(cur)) return pickRandom();
  for (;;) {
    const nb = [...new Set(out[cur].concat(inn[cur]))].filter(j => baseOK(j) && !runSeen.has(j));
    if (nb.length) { if (cur !== sel) runStack.push(cur); return nb[Math.floor(Math.random()*nb.length)]; }
    if (!runStack.length) return pickRandom();        // dead end and nothing to backtrack to: jump
    cur = runStack.pop();                               // backtrack to the last note with untried links
  }
}
function playStep(){
  if (tourRun) { if (tourRun.idx >= tourRun.ids.length - 1) { setPlaying(false); syncTour(); return; } tourGo(tourRun.idx + 1); schedule(); return; }
  const j = playMode === "random" ? pickRandom() : pickThread();
  if (j >= 0) { if (sel >= 0) { runSeen.add(sel); if (playMode === "thread") runStack.push(sel); } runSeen.add(j); navTo(j); toEditor(j); }
  schedule();
}
function schedule(){
  win.clearTimeout(pTimer); if (!playing) return;
  const pr = $("#pprog"); pr.removeClass("run"); pr.setCssProps({"--pdur": playSec + "s"});
  RAF(() => pr.addClass("run"));
  pTimer = win.setTimeout(playStep, playSec * 1000);
}
function setPlaying(on){
  playing = on; $("#playbar").classList.toggle("on", on);
  $("#pplay").textContent = on ? "■" : "▶"; $("#pplay").setAttribute("aria-label", on ? "Stop" : "Play");
  if (on) { runSeen = new Set(); runStack = []; if (tourRun) { if (tourRun.idx >= tourRun.ids.length - 1) tourGo(0); schedule(); } else if (sel < 0) playStep(); else schedule(); }
  else { win.clearTimeout(pTimer); const pr = $("#pprog"); pr.removeClass("run"); }
}
function syncPlay(){
  root.querySelectorAll("#playseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === playMode)));
  $("#pint").value = playSec; $("#pintv").textContent = playSec + "s";
}
root.querySelectorAll("#playseg button").forEach(b => b.onclick = () => { playMode = b.dataset.p; save("iv-pmode", playMode); syncPlay(); if (!playing) setPlaying(true); else { runSeen = new Set(); runStack = []; schedule(); } });
$("#pint").addEventListener("input", e => { playSec = +e.target.value; save("iv-psec", playSec); syncPlay(); if (playing) schedule(); });
$("#pplay").onclick = () => setPlaying(!playing);
onKey(e => { if (e.key === "Escape" && playing) setPlaying(false); });
root.querySelectorAll("#playseg button").forEach(b => b.addEventListener("click", () => { if (tourRun) { tourRun = null; syncTour(); } }));   // picking Random/Thread leaves the tour
syncPlay();
// the timeline tucks down to its ▶ and date
{ const tb = $("#timebar"), b = tb.createEl("button", { cls: "tcol" });
  const set = c => { tb.classList.toggle("collapsed", c); b.setText(c ? "›" : "‹"); b.setAttribute("aria-label", c ? "Show the timeline" : "Tuck the timeline away"); b.title = c ? "Show the timeline" : "Tuck the timeline away"; save("iv-tcol", c); win.setTimeout(placePlaybar, 0); };
  b.onclick = () => set(!tb.classList.contains("collapsed"));
  set(pref("iv-tcol", false) === true); }
// Autoplay tucks down to a small pill (its ▶ stays, so a running autoplay can still be stopped)
{ const pb = $("#playbar"), b = pb.createEl("button", { cls: "pcol" });
  const set = c => { pb.classList.toggle("collapsed", c); b.setText(c ? "›" : "‹"); b.setAttribute("aria-label", c ? "Show autoplay" : "Tuck autoplay away"); b.title = c ? "Show autoplay" : "Tuck autoplay away"; save("iv-pcol", c); win.setTimeout(placePlaybar, 0); };
  b.onclick = () => set(!pb.classList.contains("collapsed"));
  set(pref("iv-pcol", false) === true); }

// ---------- header, legend, theme ----------
const cnt = {};
function updateCounts(){
  for (const L of LEVELS) cnt[L.lv] = 0; let m = 0, a = 0;
  for (let i=0;i<n;i++) if (vis[i]) { cnt[N[i].level]++; m++; if (ARCH[i]) a++; }
  let l = 0; for (const [x,y] of E) if (vis[x] && vis[y]) l++;
  html($("#stats")).v = `<span><b>${m.toLocaleString()}</b> notes</span><span><b>${l.toLocaleString()}</b> links</span>`;
  $("#stats").title = `${m.toLocaleString()} notes${a ? ` (${a.toLocaleString()} from the archive)` : ""} · ${l.toLocaleString()} links · scanned ${(D.generated||"").slice(0,10)}`;
  if (css.bg) legend();
}
let legendOpen = pref("iv-legend", win.innerWidth > 760) !== false;   // phones start with the tab
function setLegend(open){
  legendOpen = open; save("iv-legend", open);
  $("#legend").classList.toggle("collapsed", !open); $("#legend").setAttribute("aria-hidden", String(!open));
  $("#legtab").hidden = open; $("#legtab").setAttribute("aria-expanded", String(open));
}
$("#legtab").onclick = () => setLegend(true);
function bodyLabel(i){ const b = BODIES[BOD[i]]; if (!b) return "";
  return b.kind === "gal" ? (b.core === i ? `Core of the ${b.name} galaxy` : `${b.name} galaxy`) : b.kind === "dwarf" ? `${b.name} cluster` : b.kind === "home" ? "Home, the center" : b.name; }
function starLegend(){
  const T = SPAL.slice(0, 10), bar = `<i style="width:46px;height:8px;border-radius:4px;background:linear-gradient(90deg,${T.join(",")})"></i>`;
  const ax = AXES[mode];
  const key = mode === "ace" ? FOLD.map(a => `<div><i style="background:${SPAL[ACEC[a]]}"></i>${ACE_SYM[a] ? ACE_SYM[a].join(" ") : a}</div>`).join("")
    : mode === "time" ? `<div>${bar}old → new · ${fromY}–${NOW_Y}</div>` : `<div>${bar}${esc(ax ? ax.name : "")}: low → high</div>`;
  const ex = (txt) => `<div style="opacity:.85">${txt}</div>`;
  return `<div class="lh"><span>Legend · Starfield</span><span class="lc" id="legclose" aria-hidden="true" title="Click anywhere to collapse">‹</span></div>`
    + `<div style="margin-top:2px;color:var(--ink)">Star color: ${mode === "ace" ? "folder" : mode === "time" ? "age" : esc(ax ? ax.name.toLowerCase() : "")}</div>` + key
    + `<div style="margin-top:4px;color:var(--ink)">Brighter, larger stars: higher level</div>`
    + ex(`Galaxy: the notes that reach a hub (level 5) first`) + ex(`Core: maps · arms: linked notes`) + ex(`Nebulae: unlinked notes, by folder`)
    + (showArch && hasArch ? ex(`Ancient elliptical: archive`) : "") + ex(`Faint filaments: links between galaxies`)
    + `<div style="margin-top:4px"><i class="ln" style="border-color:${SPACE.up}"></i>links above</div><div><i class="ln" style="border-color:${SPACE.down}"></i>links below</div>`;
}
function legend(){
  if (view === "stars") { html($("#legend")).v = starLegend(); return; }
  if (view === "sense") { html($("#legend")).v = `<div class="lh"><span>Legend · Sensemaking</span><span class="lc" id="legclose" aria-hidden="true" title="Click anywhere to collapse">‹</span></div>`
    + LEVELS.slice(0,3).map(L => `<div><i style="background:linear-gradient(135deg,${GRAD[L.lv][0]},${GRAD[L.lv][1]});${L.lv===5?"border-radius:3px;":L.lv===4?"border-radius:1px;transform:rotate(45deg) scale(.8);":""}"></i>${L.lv} · ${L.name}</div>`).join("")
    + `<div><i style="background:${css.sl2}"></i>2 · Linked notes</div><div><i style="background:${css.sl1}"></i>1 · Unlinked notes</div>`
    + `<div style="margin-top:4px;color:var(--ink)">${senseSrc === "ai" ? `Placed by a one-time AI pass${SAI && SAI.date ? ` (${esc(SAI.date)})` : ""}` : "Placed by rules, no AI"}${syFull() ? "" : ` · ${SY0}–${SY1}`}</div><div style="opacity:.85">Left–right: reflection → expression</div><div style="opacity:.85">Up–down: bottom-up → top-down</div>`
    + `<div style="margin-top:4px;opacity:.85">▶ plays by month or week: each new note pops, streaks, drops or spirals to its spot</div>`; return; }
  html($("#legend")).v = `<div class="lh"><span>${view === "spacetime" ? "Legend · Space-Time" : "Legend"}</span><span class="lc" id="legclose" aria-hidden="true" title="Click anywhere to collapse">‹</span></div>` + LEVELS.map(L => {
    const sw = L.lv >= 3 ? `background:linear-gradient(135deg,${GRAD[L.lv][0]},${GRAD[L.lv][1]});${L.lv===5?"border-radius:3px;":L.lv===4?"border-radius:1px;transform:rotate(45deg) scale(.8);":""}` : `background:${L.lv===2?css.l2:css.l1}`;
    return `<div><i style="${sw}"></i>${L.lv} · ${L.name} <span style="margin-left:auto;padding-left:10px">${(cnt[L.lv]||0).toLocaleString()}</span></div>`;
  }).join("") + (showArch && hasArch ? `<div><i style="background:none;border:1.5px solid ${css.muted}"></i>Archive (rings)</div>` : "") + `<div style="margin-top:4px"><i class="ln" style="border-color:${css.up}"></i>links above</div><div><i class="ln" style="border-color:${css.down}"></i>links below</div>` + (linkCol === "props" ? `<div><i class="ln" style="border-color:${css.rel}"></i>from a property (up, related, any other)</div>` : linkCol === "each" ? `<div><i class="ln" style="border-color:${css.upp}"></i>up property</div><div><i class="ln" style="border-color:${css.rel}"></i>related property</div><div><i class="ln" style="border-color:${css.prop}"></i>other properties (actors, director, by, next…)</div>` : REL.size ? `<div><i class="ln" style="border-color:${css.rel}"></i>related (from the related property)</div>` : "") + (focus >= 0 ? `<div><i class="ln" style="border-color:${css.muted};opacity:.5;border-top-width:1px"></i>links between the other notes in focus</div>` : "");
  if (view === "spacetime") $("#legend").createDiv({ text: "Rows: your top folders. In each row, higher levels sit higher.", attr: { style: "margin-top:4px;opacity:.85" } });
}
$("#legend").addEventListener("click", () => setLegend(false));   // a click anywhere on the legend tucks it away
const autoTheme = () => doc.body.classList.contains("theme-dark") ? "dark" : "paper";   // until a theme is picked, follow Obsidian's
function setTheme(t, keep){ root.setAttribute("data-theme", t); if (keep) save("iv-theme", t); tip.setAttribute("data-theme", t);
  root.querySelectorAll("#themeseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.th === t))); readCss(); legend(); draw(); }
root.querySelectorAll("#themeseg button").forEach(b => b.onclick = () => setTheme(b.dataset.th, true));
setLegend(legendOpen);
updateCounts();
{ const t = pref("iv-theme", null); if (t === "sepia") save("iv-theme", "softpaper"); }   // Sepia became Soft Paper (0.1.2)
setTheme(pref("iv-theme", autoTheme()));


// ---------- saved views: the whole state of the map (view, axis, filters, focus, note, camera) under a name ----------
// Kept in this browser; "Export file" writes ideaverse-views.js, which the page also reads from its folder (file over app).
const PIDX = new Map(N.map((d,i) => [d.path, i]));
const VIEW_NAME = {emergence:"Emergence", spacetime:"Space-Time", gravity:"Gravity", stars:"Starfield", sense:"Sensemaking", arc:"ARC", chord:"Chord"};
let views = (() => { const base = [], local = pref("iv-views", null);
  if (!Array.isArray(local)) return base.slice(); const names = new Set(local.map(v => v.name)); return [...local, ...base.filter(v => !names.has(v.name))]; })();
let curView = "";
// views and tours are kept in the plugin's data and, once a folder is picked, in a plain JSON file in the vault (the file wins on load)
let writeT = 0;
const savedJSON = () => JSON.stringify({ about: "Saved views and recorded tours from Maps of the Ideaverse", saved: new Date().toISOString().slice(0, 10), views, tours: typeof tours !== "undefined" ? tours : [] }, null, 1);
function writeSaved(){ if (!host.writeSaved || !host.savedFolder()) return; win.clearTimeout(writeT); writeT = win.setTimeout(() => { void host.writeSaved(savedJSON()); }, 300); }
async function ensureFolder(){ if (!host.savedFolder || host.savedFolder()) return true; const d = await host.pickSavedFolder(); syncFolderBtn(); return !!d; }
function syncFolderBtn(){ const b = $("#vexport"), d = host.savedFolder ? host.savedFolder() : null;
  b.textContent = d ? `📁 ${d === "/" ? "Vault root" : d.split("/").pop()}` : "Choose folder";
  b.title = d ? `Saved in ${d === "/" ? "the vault root" : d} (click to move)` : "Pick where saved views and tours are kept"; }
const saveViews = () => { save("iv-views", views); writeSaved(); };
const modeName = m => m === "time" ? "Time" : m === "ace" ? "ACE" : AXES[m] ? AXES[m].name.replace(/ \(.*\)$/, "") : m;
function viewSummary(v){
  const bits = [VIEW_NAME[v.view] || v.view, modeName(v.mode)];
  if (v.focus && PIDX.has(v.focus)) bits.push("focus " + N[PIDX.get(v.focus)].title);
  else if (v.sel && PIDX.has(v.sel)) bits.push(N[PIDX.get(v.sel)].title);
  if (v.folders && v.folders.length < FOLD.length) bits.push(v.folders.join(", "));
  if (v.colls && v.colls.length) bits.push(v.colls.map(c => COLLNAME[c] || c).join(", "));
  if (v.tl && isFinite(+v.tl.t)) bits.push("time-lapse at " + senseDateLabel(+v.tl.t));
  if (v.from > minYear) bits.push("from " + v.from);
  if (v.arch === false) bits.push("no archive");
  return bits.join(" · ");
}
function snapView(name){
  return {name, view, mode, folders:[...folders], subsOff:[...subOff], arch:showArch, from:fromY, full:fullY, colls:[...colls], collMode, lanes, subOrder, links:showAll,
    focus: focus >= 0 ? N[focus].path : null, fDir, fDepth, sel: sel >= 0 ? N[sel].path : null,
    tl: senseT != null ? {t: senseStepStart, step: senseStep} : null,   // where the time-lapse stands (null = all time)
    s3d: view === "stars" ? {on: S3D, yaw: +yaw3.toFixed(3), pitch: +pitch3.toFixed(3)} : null,   // Starfield: 2D or 3D, and the 3D angle
    cam: {cx: +((W/2 - tx)/k).toFixed(1), cy: +((H/2 - ty)/k).toFixed(1), k: +k.toFixed(4)}, saved: new Date().toISOString().slice(0,10)};
}
function applySaved(v){
  if (typeof playing !== "undefined" && playing) setPlaying(false);
  closePops(); curView = v.name;
  { const nv = VIEWS_ON.includes(v.view) ? v.view : "emergence";
    if (senseT != null) { senseStop(); unfreeze(false); senseT = null; POP.fill(0); popEnd = 0; $("#tldate").textContent = "All time"; }
    ungrow();   // back to today's levels; a saved time-lapse point re-grows them below
    view = nv; save("iv-view", view); SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1;
    root.querySelectorAll("#vseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === view)));
    root.dataset.view = view; syncTimebar(); }   // the map's buttons and layout follow the view
  modeKeep = null; mode = (v.mode === "time" || v.mode === "ace" || AXES[v.mode]) ? v.mode : "time"; if (view === "spacetime") mode = "time"; else save("iv-x", mode);
  folders = (v.folders || FOLD).filter(f => FOLD.includes(f)); if (!folders.length) folders = [...FOLD]; save("iv-folders", folders); subOff = Array.isArray(v.subsOff) ? new Set(v.subsOff) : defSubs(); save("iv-subsoff", [...subOff]); subCompute();
  showArch = v.arch !== false; save("iv-arch", showArch);
  { const f = +v.from || fromY, u = +v.full || 0; fromY = Math.max(SLMIN, Math.min(NOW_Y, u > f && u <= NOW_Y ? u : f)); fullY = fromY; save("iv-from", fromY); }   // older views: their full-scale year becomes the start
  colls = (v.colls || []).filter(c => COLLNAME[c]); collMode = v.collMode === "all" ? "all" : "any"; save("iv-coll", colls); save("iv-collmode", collMode);
  if (v.lanes) { lanes = v.lanes; save("iv-lanes", lanes); } if (v.subOrder) { subOrder = v.subOrder; save("iv-suborder", subOrder); }
  showAll = !!v.links; $("#alllinks").setAttribute("aria-pressed", String(showAll));
  fDir = v.fDir || "both"; fDepth = v.fDepth || 1; focusArmed = false;
  const fi = v.focus && PIDX.has(v.focus) ? PIDX.get(v.focus) : -1, si = v.sel && PIDX.has(v.sel) ? PIDX.get(v.sel) : fi;
  focus = fi; computeFocus();
  const fb = $("#focusbar"); fb.hidden = fi < 0; if (fi >= 0 && !fb.hasChildNodes()) html(fb).v = "&nbsp;";
  if (si >= 0 && !isPhone() && drawer.hidden && !drawerCollapsed) drawer.hidden = false;   // open the panel first, so the saved camera lands on the same map width
  if (si < 0 && !drawer.hidden) { drawer.hidden = true; }
  resize();
  root.querySelectorAll("#xseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.x === mode)));
  syncRange(); legend();
  if (view === "stars" && v.s3d) { S3D = !!v.s3d.on; save("iv-s3d", S3D); if (isFinite(+v.s3d.yaw)) yaw3 = +v.s3d.yaw; if (isFinite(+v.s3d.pitch)) pitch3 = +v.s3d.pitch; save("iv-cam3", [yaw3, pitch3]);
    root.querySelectorAll('input[name="s3d"]').forEach(r => r.checked = (r.value === "3d") === S3D); placePlaybar(); }
  // the time-lapse, at the step it was saved on (or all time); set before the camera move below, so that move has the last word
  if (v.tl && isFinite(+v.tl.t)) { senseStep = v.tl.step === "week" ? "week" : "month"; save("iv-sstep", senseStep);
    SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1;
    let j = 0; for (let q = 0; q < SSTEPS.length; q++) if (SSTEPS[q] <= +v.tl.t) j = q;
    senseSet(j, true); syncTimebar(); }
  const cam = v.cam && v.cam.k ? () => ({k: v.cam.k, tx: W/2 - v.cam.cx*v.cam.k, ty: H/2 - v.cam.cy*v.cam.k}) : () => fitTarget();
  relayout(true, false, cam);
  if (si >= 0) select(si, true); else select(-1);
  $("#focusmode").setAttribute("aria-pressed", String(focus >= 0)); renderFocusBar();
  renderViewList();
}
function renderViewList(){
  const s = ($("#vq").value || "").trim().toLowerCase();
  $("#vq").hidden = views.length < 8;
  const list = views.map((v, i) => [v, i]).filter(([v]) => !s || v.name.toLowerCase().includes(s) || viewSummary(v).toLowerCase().includes(s));
  html($("#vlist")).v = list.map(([v, i]) => `<div class="vr${v.name === curView ? " cur" : ""}" data-i="${i}">
      <button class="vgo" title="Go to this view"><b>${esc(v.name)}</b><span>${esc(viewSummary(v))}</span></button>
      <button class="va vup" title="Move up" aria-label="Move up"${i === 0 ? " disabled" : ""}>↑</button>
      <button class="va vre" title="Replace with what's on screen now">Update</button>
      <button class="va vdel" title="Delete" aria-label="Delete">×</button></div>`).join("")
    || `<p class="pn">${views.length ? "No match." : "No saved views yet. Set up the map, name it above, and Save."}</p>`;
  $("#vcount").textContent = views.length ? `${views.length} saved` : "";
  $("#vlist").querySelectorAll(".vr").forEach(r => { const i = +r.dataset.i;
    r.querySelector(".vgo").onclick = () => applySaved(views[i]);
    r.querySelector(".vup").onclick = () => { if (!i) return; [views[i-1], views[i]] = [views[i], views[i-1]]; saveViews(); renderViewList(); };
    r.querySelector(".vre").onclick = e => { const b = e.currentTarget; if (b.dataset.ok) { views[i] = snapView(views[i].name); curView = views[i].name; saveViews(); renderViewList(); } else { b.dataset.ok = 1; b.textContent = "Sure?"; b.classList.add("warn"); } };
    r.querySelector(".vdel").onclick = e => { const b = e.currentTarget; if (b.dataset.ok) { views.splice(i, 1); saveViews(); renderViewList(); } else { b.dataset.ok = 1; b.textContent = "Delete?"; b.classList.add("warn"); } };
  });
  const nm = ($("#vname").value || "").trim(); $("#vsave").textContent = nm && views.some(v => v.name === nm) ? "Replace" : "Save";
}
async function saveCurrent(){
  if (!await ensureFolder()) return;
  let nm = ($("#vname").value || "").trim(); if (!nm) nm = viewSummary(snapView(""));
  const v = snapView(nm), j = views.findIndex(x => x.name === nm);
  if (j >= 0) views[j] = v; else views.push(v);
  curView = nm; saveViews(); $("#vname").value = ""; renderViewList();
}
$("#vsave").onclick = saveCurrent;
$("#vname").addEventListener("keydown", e => { if (e.key === "Enter") saveCurrent(); });
$("#vname").addEventListener("input", renderViewList);
$("#vq").addEventListener("input", renderViewList);
$("#vdone").onclick = () => closePops();
$("#vexport").onclick = async e => { e.stopPropagation();   // pick (or move to) the folder that keeps the saved-views file
  const d = await host.pickSavedFolder(); syncFolderBtn(); if (d) writeSaved(); };
POPS.push(["#viewbtn", "#viewpop", "#viewms", () => { renderViewList(); $("#vname").focus(); }]);
$("#viewbtn").onclick = e => { e.stopPropagation(); const el = $("#viewpop"), open = el.hidden; closePops("#viewpop"); closeColl(); el.hidden = !open; $("#viewbtn").setAttribute("aria-expanded", String(open)); if (open) { renderViewList(); if (typeof renderTourList === "function") renderTourList(); $("#vname").focus(); } };
$("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1;
$("#tlrange").addEventListener("input", e => { senseStop(); senseSet(+e.target.value, true); });
$("#tlplay").onclick = sensePlay;
root.querySelectorAll("#tlstep button").forEach(b => b.onclick = () => { if (senseStep === b.dataset.s) return;
  const t = senseT, was = sensePlaying; senseStop(); senseStep = b.dataset.s; save("iv-sstep", senseStep); SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; syncTimebar();
  if (t != null) { const j = SSTEPS.findIndex(x => x > t); senseSet(j < 0 ? SSTEPS.length - 1 : Math.max(0, j - 1), true); if (was) sensePlay(); } else $("#tlrange").value = SSTEPS.length - 1; });
root.querySelectorAll("#tlfx button").forEach(b => b.onclick = () => { senseFx = b.dataset.f; save("iv-sfx", senseFx); syncTimebar(); });
root.querySelectorAll("#tlspeed button").forEach(b => b.onclick = () => { senseSpeed = b.dataset.p; save("iv-sspeed", senseSpeed); syncTimebar(); });
// Sensemaking: which years it shows
{ const a = $("#sy0"), b = $("#sy1"); a.min = b.min = SLMIN; a.max = b.max = NOW_Y; $("#sylo").textContent = SLMIN; $("#syhi").textContent = NOW_Y; a.value = SY0; b.value = SY1;
  const go = which => { let y0 = +a.value, y1 = +b.value; if (y0 > y1) { if (which === 0) { y0 = y1; a.value = y0; } else { y1 = y0; b.value = y1; } }
    a.style.zIndex = y0 >= NOW_Y - 1 ? 3 : 1;   // when the left end is pushed to the right, keep it grabbable
    SY0 = y0; SY1 = y1; save("iv-syears", [SY0, SY1]); senseStop(); senseT = null; senseTrail = []; SSTEPS = senseSteps();
    $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1; $("#tldate").textContent = "All time"; syncRange(); buildGrid(); draw(); legend(); };
  a.oninput = () => go(0); b.oninput = () => go(1); }
POPS.push(["#sensebtn", "#sensepop2", "#sensems"]);
POPS.push(["#lcolbtn", "#lcolpop", "#lcolms"]);
$("#lcolbtn").onclick = e => { e.stopPropagation(); const el = $("#lcolpop"), open = el.hidden; closePops("#lcolpop"); el.hidden = !open; $("#lcolbtn").setAttribute("aria-expanded", String(open)); };
linkCol = ["dir","props","each"].includes(pref("iv-lcol", "dir")) ? pref("iv-lcol", "dir") : "dir";
const syncLcol = () => { root.querySelectorAll('input[name="lcol"]').forEach(r => r.checked = r.value === linkCol); $("#lcolbtn").classList.toggle("on", linkCol !== "dir"); };
root.querySelectorAll('input[name="lcol"]').forEach(r => r.onchange = () => { if (!r.checked) return; linkCol = r.value; save("iv-lcol", linkCol); syncLcol(); legend(); draw(); });
syncLcol();
$("#sensebtn").onclick = e => { e.stopPropagation(); const el = $("#sensepop2"), open = el.hidden; closePops("#sensepop2"); el.hidden = !open; $("#sensebtn").setAttribute("aria-expanded", String(open)); };
// Sensemaking: placed by the AI pass or by the rules (click the tab again to choose)
const sBtn = $('#vseg button[data-v="sense"]');
POPS.push(['#vseg button[data-v="sense"]', "#sensepop", "#vsegms"]);
POPS.push(['#vseg button[data-v="stars"]', "#starpop", "#vsegms"]);
driftSpeed = DRIFT[pref("iv-drift", "slow")] ? pref("iv-drift", "slow") : "slow";
const syncDrift = () => root.querySelectorAll("#driftseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.d === driftSpeed)));
root.querySelectorAll("#driftseg button").forEach(b => b.onclick = () => { driftSpeed = b.dataset.d; save("iv-drift", driftSpeed); syncDrift(); });
$("#dplay").onclick = () => drifting ? driftStop() : driftStart(); syncDrift();
{ const c3 = pref("iv-cam3", null); if (Array.isArray(c3)) { yaw3 = +c3[0] || yaw3; pitch3 = +c3[1] || pitch3; } }
const syncS3D = () => { root.querySelectorAll('input[name="s3d"]').forEach(r => r.checked = (r.value === "3d") === S3D); $('#vseg button[data-v="stars"]').title = S3D ? "Starfield · 3D (click again to switch)" : "Starfield · 2D (click again to switch)"; };
root.querySelectorAll('input[name="s3d"]').forEach(r => r.onchange = () => { if (!r.checked) return; S3D = r.value === "3d"; save("iv-s3d", S3D); syncS3D(); placePlaybar(); morph(true, () => fitTarget()); });
syncS3D();
function syncSenseSrc(){ root.querySelectorAll('input[name="ssrc"]').forEach(r => { r.checked = r.value === senseSrc; r.disabled = r.value === "ai" && !SAI; });
  $("#saidate").textContent = SAI ? `one-time read of each note${SAI.date ? ` · ${SAI.date}` : ""}` : "not run yet (no ideaverse-sense-ai.js)";
  $("#sainfo").textContent = SAI ? aiCount < n ? `${aiCount.toLocaleString()} of ${n.toLocaleString()} notes have an AI placement; newer notes use the rules until the next pass.` : `All ${n.toLocaleString()} notes have an AI placement. Click Sensemaking again to switch.` : "";
  sBtn.title = !SAI ? "Sensemaking: notes placed by what they are and how they're written (no AI)" : senseSrc === "ai" ? "Sensemaking · placed by AI (click again to switch)" : "Sensemaking · placed by rules (click again to switch)"; }
root.querySelectorAll('input[name="ssrc"]').forEach(r => r.onchange = () => { if (!r.checked || r.value === senseSrc) return;
  senseSrc = r.value; save("iv-ssrc", senseSrc); SXY = senseSrc === "ai" ? SXA : SXR; layoutSense();
  if (senseT != null) { senseTrail = []; senseSet(+$("#tlrange").value, true); }
  syncSenseSrc(); legend(); morph(true); if (sel >= 0) win.setTimeout(() => select(sel, true), 0); });
syncSenseSrc();
$("#tlall").onclick = senseClear;
root.dataset.view = view; syncTimebar();
win.setTimeout(() => { const b = root.querySelector(`#vseg button[data-v="${view}"]`); if (b && isPhone()) b.scrollIntoView({inline:"nearest", block:"nearest"}); }, 50);
dbg.__ivArc = nm => { const c = CHCAT.find(c => c.short === nm); if (!c) return null; const a = (c.a0 + c.a1)/2, r = $("#cv").getBoundingClientRect(); return [r.left + sx(CH_C.x) + Math.cos(a)*CH_R*k*1.07, r.top + sy(CH_C.y) + Math.sin(a)*CH_R*k*1.07]; };
dbg.__ivLHall = () => { const r = $("#cv").getBoundingClientRect(); return LH.map(b => [b[0] + r.left, b[1] + r.top, b[2], b[3], N[b[4]].title]); };
dbg.__ivLH = () => { const r = $("#cv").getBoundingClientRect(), b = LH[LH.length - 1]; return b ? [b[0] + r.left, b[1] + r.top, b[2], b[3], N[b[4]].title] : null; };
dbg.__ivSense = { set: i => senseSet(i, true), steps: () => SSTEPS.length, trail: () => senseTrail.length, t: () => senseT };
dbg.__ivViews = { snap: () => snapView("t"), apply: v => applySaved(v), list: () => views };   // hook for automated checks

// ---------- recorded tours: Record, click around, Stop. Only the trail of notes is kept (plus the map you started on). ----------
// Play steps through them with the autoplay timer (same seconds slider), or step with ‹ › (arrow keys). Stored with saved views.
let tours = (() => { const base = [], local = pref("iv-tours", null);
  if (!Array.isArray(local)) return base.slice(); const names = new Set(local.map(t => t.name)); return [...local, ...base.filter(t => !names.has(t.name))]; })();
let tourRun = null, pendingTour = null;   // tourRun: {t, ids, idx}; pendingTour: a finished recording waiting for a name
const saveTours = () => { save("iv-tours", tours); writeSaved(); };
function syncRec(){
  { const vb = $("#viewbtn"); vb.textContent = rec ? `● Rec · ${rec.notes.length}` : "★ Saved"; vb.classList.toggle("recording", !!rec); }
  $("#recx").hidden = !rec;
  $("#recbtn").textContent = rec ? `■ Stop recording (${rec.notes.length} note${rec.notes.length === 1 ? "" : "s"})` : "● Record a tour";
  $("#recbtn").classList.toggle("on", !!rec);
  $("#trecinfo").hidden = !rec; $("#trecinfo").textContent = rec ? "Recording: every note you open is added. Search, click, follow links, or run autoplay." : "";
}
function startRec(){ if (tourRun) endTour(); pendingTour = null; $("#tsave").hidden = true;
  const start = snapView(""); delete start.name;
  rec = {notes: sel >= 0 ? [N[sel].path] : [], start}; syncRec(); closePops(); }
function stopRec(){
  if (!rec) return; const r = rec; rec = null; syncRec();
  if (!r.notes.length) { renderTourList(); return; }
  pendingTour = r; openTourPop();
  $("#tsave").hidden = false; $("#tname").value = ""; $("#tname").placeholder = `Tour from ${N[PIDX.get(r.notes[0])].title}`.slice(0, 60); $("#tname").focus();
}
function saveTour(){
  if (!pendingTour) return; const nm = ($("#tname").value || "").trim() || $("#tname").placeholder;
  const t = {name: nm, notes: pendingTour.notes, start: pendingTour.start, saved: new Date().toISOString().slice(0,10)};
  const j = tours.findIndex(x => x.name === nm); if (j >= 0) tours[j] = t; else tours.unshift(t);
  pendingTour = null; $("#tsave").hidden = true; saveTours(); renderTourList();
}
function renderTourList(){
  html($("#tlist")).v = tours.map((t, i) => { const ok = t.notes.filter(p => PIDX.has(p)).length;
    return `<div class="vr${tourRun && tourRun.t === t ? " cur" : ""}" data-i="${i}"><button class="vgo" title="Play this tour"><b>▶ ${esc(t.name)}</b><span>${ok} stop${ok === 1 ? "" : "s"} · ${esc(t.notes.slice(0, 3).map(p => PIDX.has(p) ? N[PIDX.get(p)].title : "missing").join(" → "))}${t.notes.length > 3 ? " → …" : ""}</span></button>
      <button class="va tup" title="Move up" aria-label="Move up"${i === 0 ? " disabled" : ""}>↑</button><button class="va tdel" title="Delete" aria-label="Delete">×</button></div>`; }).join("")
    || `<p class="pn">No tours yet.</p>`;
  $("#tlist").querySelectorAll(".vr").forEach(r => { const i = +r.dataset.i;
    r.querySelector(".vgo").onclick = () => startTour(tours[i], true);
    r.querySelector(".tup").onclick = () => { if (!i) return; [tours[i-1], tours[i]] = [tours[i], tours[i-1]]; saveTours(); renderTourList(); };
    r.querySelector(".tdel").onclick = e => { const b = e.currentTarget; if (b.dataset.ok) { if (tourRun && tourRun.t === tours[i]) endTour(); tours.splice(i, 1); saveTours(); renderTourList(); } else { b.dataset.ok = 1; b.textContent = "Delete?"; b.classList.add("warn"); } };
  });
}
function tourGo(idx){
  if (!tourRun) return; tourRun.idx = Math.max(0, Math.min(tourRun.ids.length - 1, idx));
  navTo(tourRun.ids[tourRun.idx]); toEditor(tourRun.ids[tourRun.idx]); syncTour();
}
function syncTour(){
  const on = !!tourRun; $("#tourctl").hidden = !on; $("#playbar").classList.toggle("touring", on);
  if (!on) return; const {t, ids, idx} = tourRun;
  $("#tlabel").textContent = `${t.name} · ${idx + 1}/${ids.length}`; $("#tlabel").title = t.name;
  $("#tprev").disabled = idx <= 0; $("#tnext").disabled = idx >= ids.length - 1;
}
function startTour(t, autoplay){
  const ids = t.notes.filter(p => PIDX.has(p)).map(p => PIDX.get(p)); if (!ids.length) return;
  if (rec) stopRec(); closePops();
  if (t.start) applySaved({...t.start, name: "", cam: null, sel: null, focus: t.start.focus || null});   // the map the tour was recorded on
  curView = "";
  tourRun = {t, ids, idx: 0}; syncTour();
  win.setTimeout(() => { tourGo(0); if (autoplay) setPlaying(true); }, t.start ? 800 : 0);
}
function endTour(){ if (!tourRun) return; tourRun = null; if (playing) setPlaying(false); syncTour(); }
function openTourPop(){ closePops("#viewpop"); closeColl(); $("#viewpop").hidden = false; $("#viewbtn").setAttribute("aria-expanded", "true"); renderViewList(); renderTourList(); }   // tours live in the Saved popover
$("#recx").onclick = e => { e.stopPropagation(); stopRec(); };
$("#recbtn").onclick = async () => { if (rec) { stopRec(); return; } if (await ensureFolder()) startRec(); };
$("#tsavebtn").onclick = saveTour;
$("#tname").addEventListener("keydown", e => { if (e.key === "Enter") saveTour(); });
$("#tdiscard").onclick = () => { pendingTour = null; $("#tsave").hidden = true; };
$("#tprev").onclick = () => { tourGo(tourRun.idx - 1); if (playing) schedule(); };
$("#tnext").onclick = () => { tourGo(tourRun.idx + 1); if (playing) schedule(); };
$("#tend").onclick = endTour;
onKey(e => { if (!tourRun || /input|textarea|select/i.test(doc.activeElement.tagName)) return;
  if (e.key === "ArrowRight") { e.preventDefault(); $("#tnext").click(); } else if (e.key === "ArrowLeft") { e.preventDefault(); $("#tprev").click(); } });
syncRec(); syncFolderBtn();
// load the saved-views file if there is one (it wins over the copy in the plugin's data); write it if there isn't yet
if (host.readSaved && host.savedFolder()) void host.readSaved().then(txt => { if (dead) return;
  if (txt == null) { if (views.length || tours.length) writeSaved(); return; }
  try { const o = JSON.parse(txt), merge = (fromFile, local) => { const names = new Set(fromFile.map(x => x.name)); const extra = local.filter(x => !names.has(x.name)); return [fromFile.concat(extra), extra.length]; };
    let nv = 0, nt = 0;   // anything saved here but missing from the file (made before the file existed) is kept and written back
    if (Array.isArray(o.views)) [views, nv] = merge(o.views, views);
    if (Array.isArray(o.tours)) [tours, nt] = merge(o.tours, tours);
    save("iv-views", views); save("iv-tours", tours); renderViewList(); renderTourList(); if (nv || nt) writeSaved(); } catch { /* not valid JSON: leave both as they are */ } });
// every popover stays inside the map: when one opens, nudge it sideways if it would spill past either edge
function placePop(el){ el.setCssProps({ "--popx": "0px" }); const R = root.getBoundingClientRect(), r = el.getBoundingClientRect();
  let dx = 0; if (r.right > R.right - 8) dx = R.right - 8 - r.right; if (r.left + dx < R.left + 8) dx = R.left + 8 - r.left;
  if (dx) el.setCssProps({ "--popx": `${Math.round(dx)}px` }); }
const popObs = new MutationObserver(ms => { let st = false;
  for (const m of ms) { const t = m.target; if (m.attributeName === "hidden" && t.classList.contains("mspop") && !t.hidden) placePop(t);
    if (t.id === "drawer" || t.id === "legend" || t.id === "focusbar" || t.classList.contains("qx")) st = true; }
  if (st) syncCls(); });
popObs.observe(root, { subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
syncCls();
dbg.__ivTours = { list: () => tours, run: () => tourRun && {name: tourRun.t.name, idx: tourRun.idx, n: tourRun.ids.length, sel: sel >= 0 ? N[sel].title : null} };

// ---------- why a note sits where it does: its level rule and its score, piece by piece ----------
const LN = x => Math.log1p(x), f2 = x => (Math.round(x*100)/100).toFixed(2);
const MAP_FOLDERS = (D.settings && D.settings.map_folders) || ["Atlas/Maps"], MAP_COLLS = (D.settings && D.settings.map_collections) || ["Maps", "Views"];   // from scanner.py settings
function mapWhy(d){
  const mf = MAP_FOLDERS.find(f => d.path === f || d.path.startsWith(f + "/")); if (mf) return `it lives in ${mf}, a maps folder`;
  if (/\bMOC\b/.test(d.title)) return "“MOC” is in its title";
  const c = (d.collections || []).map(x => x.toLowerCase()), mc = MAP_COLLS.find(m => c.includes(m.toLowerCase()));
  if (mc) return `it's in the ${mc} collection`;
  return "it's mostly links (10+ links out, half its lines carry links)";
}
function scoreRank(i){ return RANK[i] || 0; }
function whyBox(i){
  const d = N[i]; if (!d.s) return "";
  const [a, b, u, c] = d.s, w = S.w, ar = !!d.archive;
  const rows = [["Links in", a, w.in, w.in*LN(a)], ["Links out", b, w.out, w.out*LN(b)],
    ["Links both in and out", a && b ? `${a} in · ${b} out` : "—", w.both, w.both*Math.sqrt(LN(a)*LN(b)), a && b ? `√(ln(1+${a}) × ln(1+${b})) = √(${f2(LN(a))} × ${f2(LN(b))}) = ${f2(Math.sqrt(LN(a)*LN(b)))}, then × weight` : "zero unless it has links in AND out"]];
  if (!ar) rows.push(["Notes that link up to this note", u, w.up, w.up*LN(u)], ["Notes in its collection", c, w.coll, w.coll*LN(c)]);
  const mm = d.is_map && d.maps_linked >= L4_MAPS;
  let rule;
  if (d.level === 5) rule = d.home ? "It's one of your home notes." : `It's among the top ${S.top} by score.`;
  else if (d.level === 4) rule = mm ? `It's a map that links to ${d.maps_linked} other maps (3+ makes Level 4).` : `Its score ${f2(d.score)} is at least the Level 4 cut-off (${(+S.l4).toFixed(1)}).`;
  else if (d.level === 3) rule = d.is_map ? `It's a map: ${mapWhy(d)}. Every map is at least Level 3, whatever its score.` : `Its score ${f2(d.score)} is at least the Level 3 cut-off (${(+S.l3).toFixed(1)}).`;
  else if (d.level === 2) rule = `It has links, but it isn't a map and its score ${f2(d.score)} is under the Level 3 cut-off (${(+S.l3).toFixed(1)}).`;
  else rule = "No links in or out yet.";
  if (ar && d.level >= 2) rule += " (Archive notes are scored on their own links only.)";
  const where = ar ? "the archive" : "the ideaverse";   // always say where its score ranks
  rule += ` (#${scoreRank(i).toLocaleString()} in ${where})`;
  const open = pref("iv-why2", false) ? " open" : "";
  let sense = "";
  if (view === "sense") { const z = senseWhy(i);
    const pos = `<b>${esc(z.q)}</b> · ${z.x < 0 ? "reflection" : "expression"} ${Math.abs(z.x).toFixed(2)}, ${z.y >= 0 ? "top-down" : "bottom-up"} ${Math.abs(z.y).toFixed(2)}`;
    sense = z.ai !== undefined
      ? `<p class="wrule">${pos}</p><p class="wnote">${z.ai === null ? "Added after the AI pass, so placed by the rules for now." : `The AI read it as: ${esc(z.ai)}.`}<br>The rules would say ${esc(z.rq)}: ${esc(z.xr)}; ${esc(z.yr)}.</p>`
      : `<p class="wrule">${pos}</p><p class="wnote">Left–right: ${esc(z.xr)}.<br>Up–down: ${esc(z.yr)}.</p>`; }
  return `${sense ? `<details class="whybox" open><summary>Why ${esc(senseWhy(i).q)}</summary>${sense}</details>` : ""}<details class="whybox"${open}><summary>Why Level ${d.level} · score ${f2(d.score)}</summary><p class="wrule">${esc(rule)}</p>
    <table class="wtab"><tr><th></th><th>count</th><th>weight</th><th>adds</th></tr>${rows.map(([k, n, wt, add, tip]) => `<tr${add > 0 ? "" : ' class="z"'}${tip ? ` title="${esc(tip)}"` : ""}><td>${k}</td><td>${n}</td><td>×${f2(wt)}</td><td>${f2(add)}</td></tr>`).join("")}
    <tr class="tot"><td>Score</td><td></td><td></td><td>${f2(d.score)}</td></tr></table>
    </details>`;
}
on(doc, "toggle", e => { if (e.target.classList && e.target.classList.contains("whybox")) save("iv-why2", e.target.open); }, true);
const ro = new ResizeObserver(() => { if (dead) return; const first = W === 0; resize(); if (first && W) fit(false); placePlaybar(); fitFocus(); }); ro.observe(cv);
if (doc.fonts) doc.fonts.ready.then(() => { if (!dead) { readCss(); draw(); } });

// the whole top bar (title, maps, filters, options) can tuck away; a small tab brings it back
{ const hd = root.querySelector("header"), hb = hd.querySelector("h1").createEl("button", { cls: "hcol", text: "︿", attr: { "aria-label": "Hide the top bar", title: "Hide the top bar" } });
  const tab = $("#main").createEl("button", { cls: "htab", text: "﹀  Maps of the Ideaverse", attr: { "aria-label": "Show the top bar", title: "Show the top bar" } });
  const set = c => { hd.hidden = c; tab.hidden = !c; save("iv-hcol", c); };
  const flip = c => { set(c); win.setTimeout(() => { resize(); if (sel >= 0) flyTo(sel); else fit(true); }, 30); };   // reframe for the new height
  hb.onclick = () => flip(true); tab.onclick = () => flip(false);
  set(pref("iv-hcol", false) === true); }

if (following) win.setTimeout(() => followPath(host.activePath && host.activePath(), true), 400);   // opened while following: start on the active note

return {
  destroy(){ dead = true; ro.disconnect(); popObs.disconnect(); for (const id of frames) win.cancelAnimationFrame(id); frames.clear();
    win.clearTimeout(senseTimer); win.clearTimeout(pTimer); driftStop(); tip.remove(); },
  openNote(path){ const i = PIDX.get(path); if (i != null) navTo(i); },
  follow(path){ followPath(path); },
  toggleFollow(){ setFollowing(!following); return following; },
  themeChanged(){ const t = pref("iv-theme", null); if (t == null) setTheme(autoTheme()); else if (t === "obsidian") setTheme("obsidian"); },   // Obsidian's theme or mode changed
};
}
