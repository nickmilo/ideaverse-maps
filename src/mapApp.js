/* Maps of the Ideaverse: the map itself. Ported from the standalone HTML map (index.html) with its logic intact:
   the page's code runs inside the plugin's view, scoped to `root`, with Obsidian handling storage, events and notes. */
import { sanitizeHTMLToDom, setIcon } from "obsidian";
import { parseDay } from "./scan.js";

export const VIEWS_ON = ["emergence", "spacetime", "gravity", "stars", "sense", "chord", "quincunx", "shelf", "tree", "treemap", "skyline", "planet", "lincal", "spiral", "lifeline", "posters", "graph", "mosaic", "people", "ideaverse"];   // Space-Time, the domes and Chord are reached through ⋯ → Experimental; ARC stays in the lab

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
let placeAnitab = () => {};   // set by the Animations dock (below)
let syncTB = () => {}, toggleMapOpts = () => {}, lastDown = null;   // lastDown: where the last press landed on the map   // set by the toolbar (below): labels, counts and which buttons show

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
// Link colors: the up property yellow, related purple, other properties slate; links in the body go above (up) or below (down) by level
function edgeColor(a, b, upward){ const k = EKIND.get(a*n + b);
  // k is the kind as the active note (a) wrote it: 1 up, 4 related, 5 any other property
  if (k === 1) return css.upp; if (k === 4) return css.rel; if (k === 5) return css.prop;
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
// Years shown (Emergence, Space-Time, Planetarium, Gravity, Starfield): two handles, first year to last; notes outside leave
// the map, whatever Arrange is set to. It replaces the old "Starts" control, whose older notes gathered in a Before strip.
let YR0 = Math.max(SLMIN, Math.min(NOW_Y, +pref("iv-yr0", SLMIN))), YR1 = Math.max(SLMIN, Math.min(NOW_Y, +pref("iv-yr1", NOW_Y))); if (YR0 > YR1) [YR0, YR1] = [YR1, YR0];
fromY = fullY = YR0;
// every map of the whole vault shares it; Posters and People have their own sliders, Linear its own years
const YRV = new Set(["emergence", "spacetime", "gravity", "stars", "sense", "graph", "ideaverse", "chord", "treemap", "mosaic", "tree", "shelf", "skyline", "planet", "quincunx", "arc"]);
// "Show notes outside the date range": off by default, so these maps show only the years picked, and no undated notes;
// on, notes with no date sit in the No date strip, older ones in a Before strip, newer ones in an After strip
let YRALL = pref("iv-yrall", true) !== false;   // on by default (Nick, Oct 24)
// (the first layout runs before the map's view is set up, so it reads the saved one)
const curV = () => { try { return view; } catch (e) { return pref("iv-view", "emergence"); } };
const yrEnd = () => YRV.has(curV()) ? YR1 : NOW_Y;
const yrNarrow = () => YR0 > SLMIN || YR1 < NOW_Y, yrOn = () => YRV.has(curV()) && yrNarrow();
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
// a base (Obsidian Bases) can scope the map to the notes its query returns; scores still come from the whole vault
let SCOPE = null;
function baseOK(i){ const d = N[i];
  return (!SCOPE || SCOPE[i]) && (!ARCH[i] || showArch)
    && (folders.includes(d.ace) || !FOLD.includes(d.ace))
    && !subHid[i]
    && collOK(d); }
const visBase = baseOK;
let NVIS = 0, NARROW = false, BOOST = 1;
function computeVis(){ const fs = new Set(folders);
  for (let i=0;i<n;i++) { const d = N[i];
    vis[i] = ((!SCOPE || SCOPE[i]) && (!ARCH[i] || showArch)
      && (fs.has(d.ace) || !FOLD.includes(d.ace))    // vault-root notes always show
      && !subHid[i]
      && collOK(d)
      && (!fset || fset[i] || curV() === "people")) ? 1 : 0; }
  if (YRV.has(curV()) && !YRALL) for (let i=0;i<n;i++) { if (!vis[i]) continue; if (isNaN(TV[i])) { vis[i] = 0; continue; } if (yrNarrow()) { const y = new Date(TV[i]).getUTCFullYear(); if (y < YR0 || y > YR1) vis[i] = 0; } }
  if (focus >= 0) vis[focus] = 1;
  // a filter, a collection or a base that leaves few notes: draw them bigger, so a small set never looks empty
  let nv = 0; for (let i=0;i<n;i++) nv += vis[i]; NVIS = nv;
  NARROW = colls.length > 0 || !!SCOPE || FOLD.some(f => !fs.has(f));
  BOOST = NARROW && nv ? Math.max(1, Math.min(2.2, Math.pow(n / nv, .25))) : 1; }

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
let X0T = 170, ER = null, AR = null, AFW = 0;   // AR: the "After <end>" strip at the right           // ER: the "Before <start>" strip, when any note is older than the timeline's start
let TF = 0, TS = 0, UT = 1;
const units = v => v < TS ? (v - TF)/YEAR*COMP : (TS - TF)/YEAR*COMP + (v - TS)/YEAR;
const xTime = v => X0T + units(v)/UT * (WW - X0T - AFW);
const dayFull = () => (WW - X0T - AFW)/UT/365.2425;   // world width of one day at full scale
function layoutTime(){
  TF = Date.UTC(fromY,0,1); TS = Date.UTC(fullY,0,1);
  let tmin = Infinity; for (let i=0;i<n;i++) if (TV[i] < tmin && (vis[i] || !yrOn())) tmin = TV[i];
  ER = tmin < TF ? [140, 300] : null; X0T = ER ? 340 : 170;
  const TE = YRV.has(curV()) && YR1 < NOW_Y ? Date.UTC(YR1 + 1, 0, 1) : T1; UT = Math.max(units(TE), .5);
  let tmax = -Infinity; if (TE < T1) for (let i=0;i<n;i++) if (vis[i] && TV[i] >= TE && TV[i] > tmax) tmax = TV[i];
  AR = isFinite(tmax) ? [WW - 160, WW] : null; AFW = AR ? 190 : 0;
  const d1 = dayFull();
  for (let i=0;i<n;i++) { const j = hash(N[i].path, 13);
    if (isNaN(TV[i])) XT[i] = ND[0] + 8 + j*(ND[1]-ND[0]-16);
    else if (TV[i] < TF && !ER) XT[i] = X0T - 20;   // outside the years shown: off the map anyway
    else if (TV[i] >= TE) XT[i] = AR ? AR[0] + 8 + Math.sqrt((TV[i] - TE)/Math.max(tmax - TE, 1))*(AR[1]-AR[0]-16) + (j - .5)*6 : WW + 20;
    else if (TV[i] < TF) XT[i] = ER[0] + 8 + Math.sqrt((TV[i] - tmin)/Math.max(TF - tmin, 1))*(ER[1]-ER[0]-16) + (j - .5)*6;   // kept in date order, older to the left
    else XT[i] = xTime(TV[i]) + (j - .5) * d1 * (TV[i] < TS ? COMP : 1) * 3; }   // ±1.5 days, so same-day notes stay a stripe
}

// ---------- property axes: Rank (top-level) and the "More axes" set ----------
const AXES = {
  "p:w":   {name:"Length (words)", get:d => d.p && d.p.w, kind:"log", jit:.006},
  "p:kb":  {name:"Size (KB)", get:d => d.p && d.p.kb, kind:"log", jit:.006},
  "links": {name:"Links (in + out)", get:d => d.body_in + d.body_out, kind:"log", jit:.01},
  "upin":  {name:"Uplinks (notes that link up to it)", get:d => d.up_in, kind:"log", jit:.01}};
// the number properties named in Settings → By → More… (year by default): each becomes an axis, scaled to its values.
// Year-like ones that reach back centuries or millennia squeeze the far past, as Time's "Before" strip does.
for (const key of (D.settings && D.settings.axis_props) || []) { const vals = N.map(d => d.p && d.p.n && d.p.n[key]).filter(v => v != null && isFinite(v)); if (!vals.length) continue;
  const lo = Math.min(...vals), hi = Math.max(...vals), yearish = hi >= 1000 && hi <= 2200 && vals.every(v => Number.isInteger(v) && v <= 2200), wide = lo >= 0 && hi > 50*Math.max(1, lo) && hi > 100;
  const span = hi - lo || 1, raw = span/8, mag = Math.pow(10, Math.floor(Math.log10(raw))), tick = [1, 2, 5, 10].map(m => m*mag).find(t => t >= raw) || 10*mag;
  AXES["n:" + key] = yearish ? {name: key, get: d => d.p && d.p.n && d.p.n[key], kind: "year", anchor: lo < 1850 ? 1900 : null, jit: .004} : wide ? {name: key, get: d => d.p && d.p.n && d.p.n[key], kind: "log", jit: .006} : {name: key, get: d => d.p && d.p.n && d.p.n[key], kind: "lin", tick, jit: .006}; }
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
const YST = new Float32Array(n), YSC = new Float32Array(n); let ROWS = [];   // YSC: how far down the vault a note sits (0 = top, 1 = bottom), by note count
const STH = WH*.74;
const rowKey = i => ARCH[i] ? "\u0000arch" : FOLD.includes(N[i].ace) ? N[i].ace : "\u0000root";
function layoutSpace(){
  const cnt = new Map(); for (let i=0;i<n;i++) if (vis[i]) { const r = rowKey(i); cnt.set(r, (cnt.get(r) || 0) + 1); }
  // + first and x last (in the Dome, + is the North Pole and x the South Pole)
  const keys = [...(cnt.has("\u0000root") ? ["\u0000root"] : []), ...FOLD.filter(f => f !== "x" && cnt.has(f)), ...(cnt.has("\u0000arch") ? ["\u0000arch"] : []), ...(cnt.has("x") ? ["x"] : [])];   // top-level notes first, above + Inbox
  const wt = keys.map(r => Math.sqrt(cnt.get(r)) + 6), tot = wt.reduce((a, b) => a + b, 0) || 1, G = 24, avail = WH - G*Math.max(0, keys.length - 1);
  let y = 0; ROWS = keys.map((r, j) => { const h = Math.max(avail*.05, avail*wt[j]/tot), row = {key: r, y0: y, y1: y + h, n: cnt.get(r)}; y += h + G; return row; });
  const sc = y > G ? STH/(y - G) : 1; for (const r of ROWS) { r.y0 *= sc; r.y1 *= sc; }   // rows fill the top of the map; the bottom stays clear for the legend and timeline (desktop)
  const at = new Map(ROWS.map(r => [r.key, r]));
  // the Dome's bands: each folder's share of the notes, so the equator falls halfway through them
  const total = ROWS.reduce((a, r) => a + r.n, 0) || 1, g = .004; let c = 0;
  for (const r of ROWS) { r.c0 = c + (c ? g : 0); c += r.n/total; r.c1 = c - (c < .999 ? g : 0); }
  for (let i=0;i<n;i++) { const r = at.get(rowKey(i)) || ROWS[0]; YST[i] = r ? r.y0 + (YE[i]/WH)*(r.y1 - r.y0) : YE[i]; YSC[i] = r ? r.c0 + (YE[i]/WH)*(r.c1 - r.c0) : .5; }
}
const rowName = k => k === "\u0000arch" ? "Archive" : k === "\u0000root" ? "Root" : k === "+" ? "+" : ACE_SYM[k] ? ACE_SYM[k][0] + " " + ACE_SYM[k][1].replace(/[()]/g, "") : k;

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

// ---------- Domes (experimental): stand at the center of a hollow sphere with the notes all around you, like a planetarium ----------
// Space-Time Dome: time runs around the horizon (a small gap where the start meets today), folder rows stack up the sky.
// Gravity Dome: Home and the hubs overhead at the zenith, the level rings dropping toward the horizon, time or folders around you.
const DOME = Object.assign({spacetime: false, gravity: false, emergence: false}, pref("iv-dome", {}) || {});
const domeOn = () => view === "emergence" && !!DOME.emergence;   // only the Emergence Dome is offered now (the Space-Time and Gravity domes were cut, Oct 23)
const domeSphere = () => view !== "gravity";   // Space-Time and Emergence domes are whole spheres; Gravity is a sky overhead
const DOMECAM = Object.assign({spacetime: [0, 0], gravity: [0, .95], emergence: [0, 0]}, pref("iv-domecam", {}) || {});
let domeYaw = 0, domePitch = .5;
const DF_ = 1000, STGAP = .35;   // world units from the eye to the picture; the seam's width (radians)
const DTH = new Float32Array(n), DPH = new Float32Array(n), DX = new Float32Array(n), DY = new Float32Array(n), DFR = new Uint8Array(n);
const stTheta = x => -Math.PI + STGAP/2 + (x - ND[0])/(WW - ND[0])*(2*Math.PI - STGAP);
const stPhiC = c => Math.asin(Math.max(-1, Math.min(1, 1 - 2*c)));   // 0 → North Pole, ½ → equator, 1 → South Pole (equal areas: notes spread evenly over the sky)
const grPhi = r => (90 - Math.max(0, Math.min(1, r))*80)*Math.PI/180;
function domeAngles(bx, by){
  if (view === "spacetime") for (let i=0;i<n;i++) { DTH[i] = stTheta(bx[i]); DPH[i] = stPhiC(YSC[i]); }
  else if (view === "emergence") for (let i=0;i<n;i++) { DTH[i] = stTheta(bx[i]); DPH[i] = stPhiC(by[i]/WH); }   // the level bands from the North Pole (5) to the South Pole (1); time or folders around you
  else for (let i=0;i<n;i++) { const dx = bx[i] - GC.x, dy = by[i] - GC.y; DTH[i] = Math.atan2(dy, dx); DPH[i] = grPhi(Math.hypot(dx, dy)/GR); }
}
function domeCam(th, ph){   // a direction on the sphere → world point on the picture, or null when it's behind you
  const c = Math.cos(ph), x = c*Math.sin(th), y = Math.sin(ph), z = c*Math.cos(th);
  const cy = Math.cos(domeYaw), sy_ = Math.sin(domeYaw), cp = Math.cos(domePitch), sp = Math.sin(domePitch);
  const x1 = x*cy - z*sy_, z1 = x*sy_ + z*cy, y2 = y*cp - z1*sp, z2 = y*sp + z1*cp;
  return z2 > .06 ? [x1/z2*DF_, -y2/z2*DF_] : null;
}
function domeProject(){ for (let i=0;i<n;i++) { const p = domeCam(DTH[i], DPH[i]); if (p) { DX[i] = p[0]; DY[i] = p[1]; DFR[i] = 1; } else { DX[i] = DY[i] = -1e7; DFR[i] = 0; } } }
function domeUse(){ [domeYaw, domePitch] = DOMECAM[view] || [0, 0]; }
function domeKeep(){ DOMECAM[view] = [+domeYaw.toFixed(3), +domePitch.toFixed(3)]; save("iv-domecam", DOMECAM); }
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
        lx += g1*wdt; ly += g2*wdt; const m = Math.hypot(lx, ly), soft = .75*b.r; if (m > soft) { const m2 = soft + (b.r - soft)*(1 - Math.exp(-(m - soft)/(b.r - soft))); lx *= m2/m; ly *= m2/m; }   // past three-quarters out, ease toward the edge instead of piling up on it
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
  const key = starVer + ":" + h + ":" + mode + ":" + fromY + ":" + fullY + ":" + (sTurn && !S3D ? Math.floor(turnA/4) : "s"); if (key === glowKey && GLOW) return; glowKey = key;
  const PX = sTurn && !S3D ? X : SX, PY = sTurn && !S3D ? Y : SY;   // turning: the light follows the stars
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
      c.globalAlpha = b.kind === "neb" ? .08 : lv >= 3 ? .35 : .2; c.drawImage(sprite(b.kind === "neb" ? b.hue : SPAL[SC[i]]), gx(PX[i]) - s/2, gy(PY[i]) - s/2, s, s); }
    c.globalAlpha = 1; }
}
// faraway stars behind everything, moving slower than the map
const BGS = (() => { let a = 1234567; const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return [{p:.05, T:640, n:230}, {p:.14, T:900, n:150}].map(L => ({...L, pts: Array.from({length:L.n}, () => [r()*L.T, r()*L.T, .4 + r()*r()*1.3, .15 + r()*.6, r() < .12])})); })();
// Starfield's galaxy glow: Soft by default, so the stars (your notes) read over it; Normal and Bright for the full nebula look
let sGlow = ["soft", "normal", "bright"].includes(pref("iv-sglow", "soft")) ? pref("iv-sglow", "soft") : "soft";
// Turning galaxies (an option): each galaxy slowly turns in its own plane, the big ones slower; flat Starfield only
let sTurn = pref("iv-sturn", false) === true, turnA = 0, turnLast = 0, turnRaf = 0;
function turnFrame(now){ turnRaf = 0; if (dead || !sTurn || view !== "stars" || S3D) return;
  if (morphing || doc.hidden || !(W > 0)) { turnLast = 0; turnRaf = RAF(turnFrame); return; }
  if (turnLast && now - turnLast < 45) { turnRaf = RAF(turnFrame); return; }   // about 20 frames a second is plenty for something this slow
  const dt = turnLast ? Math.min(.2, (now - turnLast)/1000) : 0; turnLast = now; turnA += dt;
  for (const b of BODIES) { if (b.kind !== "gal" && b.kind !== "dwarf") continue; const w = 2*Math.PI/(260*Math.sqrt(Math.max(40, b.r)/120)) * (b.seed % 2 ? 1 : -1), a = w*turnA;
    const cx = UC.x + b.x, cy = UC.y + b.y, c = Math.cos(a), s_ = Math.sin(a), pc = Math.cos(b.pa || 0), ps = Math.sin(b.pa || 0), q = b.q || 1;
    for (const i of b.members) { const dx = SX[i] - cx, dy = SY[i] - cy, u = dx*pc + dy*ps, v = (-dx*ps + dy*pc)/q;   // into the disk's own plane
      const u2 = u*c - v*s_, v2 = (u*s_ + v*c)*q; X[i] = cx + u2*pc - v2*ps; Y[i] = cy + u2*ps + v2*pc; } }
  render(); turnRaf = RAF(turnFrame); }
function turnSync(){ if (sTurn && view === "stars" && !S3D) { if (!turnRaf) { turnLast = 0; turnRaf = RAF(turnFrame); } } else if (turnRaf) { win.cancelAnimationFrame(turnRaf); turnRaf = 0; } }
const GLOWF = () => ({ soft: .5, normal: 1, bright: 1.45 })[sGlow];
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
  const bgDim = (sel >= 0 ? .22 : focus >= 0 ? .7 : 1)*GLOWF();   // a selected note dims the galaxies so its links read clearly
  if (S3D) { halos3D(bgDim); return; }
  buildGlow();
  ctx.globalCompositeOperation = "lighter";
  for (let a = bgDim; a > .001; a -= 1) { ctx.globalAlpha = Math.min(1, a); ctx.drawImage(GLOW, sx(UB.x0), sy(UB.y0), (UB.x1 - UB.x0)*k, (UB.y1 - UB.y0)*k); }
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
    taken.push(box); if (b.core != null) LH.push([box[0], box[1], box[2], 30, b.core, b.id]);
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
let SY0 = YR0, SY1 = YR1;   // (since 0.4.17 these follow Years shown)

const syFull = () => SY0 <= SLMIN && SY1 >= NOW_Y;
const syT0 = () => SY0 <= SLMIN ? -Infinity : Date.UTC(SY0, 0, 1), syT1 = () => Date.UTC(SY1 + 1, 0, 1) - 1;
const inYears = i => syFull() || (TV[i] >= syT0() && TV[i] <= syT1());
const born = i => senseT == null || (TV[i] <= senseT && !(POP[i] > popNow));   // on the timeline, a note shows once its date has passed (and its pop has started)
const shownAt = i => view === "sense" ? inYears(i) && born(i) : born(i);   // scheduled pops stay hidden until they burst
const EHID = new Uint8Array(n);   // notes an experimental map leaves out (Linear: other years, no date)
const VV = i => vis[i] && shownAt(i) && !(EHID[i] && expOn()) && (!(domeOn() || sphOn()) || DFR[i] === 1);
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
  if ((view === "emergence" || view === "spacetime") && mode === "time" && !domeOn()) { const x = sx(xTime(Math.min(senseT, T1))); ctx.strokeStyle = css.accent; ctx.globalAlpha = .55; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);   // the "now" line sweeping across the years
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
  if (GRV()) return [sx((expBox.x0 + expBox.x1) / 2), sy((expBox.y0 + expBox.y1) / 2), Math.max(50, (expBox.x1 - expBox.x0) * k * .3)];   // the Obsidian map: from its middle
  return [sx(SC_.x), sy(SC_.y), SR0*k*1.25];
}
let SOFT = 1;
function drawPops(){
  // the Obsidian map is busy already: its comets and swirls are fainter and travel less far (rain stays as it is)
  SOFT = GRV() ? .4 : 1;
  if (senseT != null && POP.some(v => v)) { const now = popNow, few = [], fly = new Map();
    for (let i=0;i<n;i++) { const t0 = POP[i]; if (!t0 || now < t0 || now - t0 >= popMs() || !vis[i] || (view === "sense" && !inYears(i))) continue; few.push(i); }
    few.sort((a,b) => N[a].level - N[b].level);
    ctx.textAlign = "center"; ctx.textBaseline = "bottom"; const taken = LH.map(b => b.slice(0, 4));
    few.sort((a,b) => N[b].level - N[a].level || N[b].score - N[a].score);   // biggest names claim label space first; draw order doesn't matter much
    for (const i of few) { const e = (now - POP[i])/popMs(), lv = N[i].level, col = view === "stars" ? SPAL[SC[i]] : GRV() ? (GRAD[lv] ? GRAD[lv][0] : css.accent) : ARCH4[quadOf(i)][3], r = Math.max(2.2, rad(i));
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
            ctx.globalAlpha = .55*(1 - s/6)*SOFT; ctx.strokeStyle = col; ctx.lineWidth = r*1.6*(1 - s/7)*(SOFT < 1 ? .6 : 1); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.stroke(); } }
        else { const g = (e - .7)/.3; ctx.globalAlpha = .6*(1 - g)*SOFT; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, r*(1 + 4*g*SOFT), 0, 6.2832); ctx.fill(); }   // a flash on landing
        sc = fly < 1 ? (SOFT < 1 ? 1.15 : 1.6) : 1; ctx.globalAlpha = SOFT < 1 ? .8 : 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.globalAlpha = (fly < 1 ? .9 : .9*(1 - (e - .7)/.3))*SOFT; ctx.beginPath(); ctx.arc(x, y, r*sc*.45, 0, 6.2832); ctx.fill(); }
      else if (senseFx === "swirl" || senseFx === "swirlin") {   // swirl out: born at the core, spiralling out along an arm; swirl in: drawn in from the rim, like a galaxy forming
        const [cx0, cy0, Rr] = popCentre(i), dx = hx - cx0, dy = hy - cy0, rf = Math.hypot(dx, dy), th = Math.atan2(dy, dx), turns = 1.1 + .35*gauss(N[i].path, 73), inw = senseFx === "swirlin";
        const r0 = Math.max(rf*1.6, Rr*1.15);
        const at = q => { const rr = inw ? rf + (r0 - rf)*Math.pow(1 - q, 1.3) : rf*Math.pow(q, .85), a = th - turns*2*Math.PI*(1 - q) /* clockwise on screen, in and out */; return [cx0 + rr*Math.cos(a), cy0 + rr*Math.sin(a)]; };
        const fly = Math.min(1, e/.8), q = 1 - Math.pow(1 - fly, 2.2); [x, y] = at(q);
        if (fly < 1) for (let s = 1; s <= 16; s++) { const [tx_, ty_] = at(Math.max(0, q - s*.028)); ctx.globalAlpha = .6*(1 - s/17)*(1 - fly*.3)*SOFT; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tx_, ty_, r*Math.max(.25, 1.1 - s*.055), 0, 6.2832); ctx.fill(); }
        else { const g = (e - .8)/.2; ctx.globalAlpha = .5*(1 - g); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, r*(1.4 + 3*g), 0, 6.2832); ctx.stroke(); }
        sc = fly < 1 ? (SOFT < 1 ? 1.1 : 1.4) : 1; ctx.globalAlpha = SOFT < 1 ? .8 : 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.globalAlpha = (fly < 1 ? .85 : 0)*SOFT; ctx.beginPath(); ctx.arc(x, y, r*sc*.4, 0, 6.2832); ctx.fill(); }
      else {   // rain: a soft landing with two ripples
        for (const lag of [0, .22]) { const g = (e - lag)/(1 - lag); if (g <= 0) continue;
          ctx.globalAlpha = .5*Math.pow(1 - g, 1.5); ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(hx, hy, r*(1 + 9*g), r*(1 + 9*g)*.55, 0, 0, 6.2832); ctx.stroke(); }
        const drop = Math.min(1, e/.18); y = hy - (1 - drop)*(1 - drop)*24; sc = 1 + (1 - drop)*.8;
        ctx.globalAlpha = .35 + .6*drop; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r*sc, 0, 6.2832); ctx.fill(); }
      fly.set(i, [x, y - r*sc - 4]); }
    ctx.globalAlpha = 1; if (view === "stars") starFlares(now, few); arrivalLabels(taken, fly); }
}
// Starfield on the timeline: each new note flares like a star being born (a glow and four spikes, bigger for higher levels),
// and a galaxy taking in new stars brightens for a moment at its core, more the more arrive
function starFlares(now, few){
  const F = popMs(), grow = new Map();
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const i of few) { const e = (now - POP[i])/F; if (e < 0 || e > 1) continue; const lv = N[i].level, x = sx(X[i]), y = sy(Y[i]), col = SPAL[SC[i]];
    const f = Math.pow(1 - e, 1.6), R = (5 + lv*3.2)*(.6 + .4*Math.sqrt(Math.min(1, e*6)));
    ctx.globalAlpha = .55*f; ctx.drawImage(sprite(col), x - R*1.6, y - R*1.6, R*3.2, R*3.2);
    ctx.globalAlpha = .7*f; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; const L = R*(1.3 + lv*.25);
    ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
    if (BOD[i] >= 0) grow.set(BOD[i], (grow.get(BOD[i]) || 0) + 1 + (lv >= 3 ? 2 : 0)); }
  for (const [bid, c] of grow) { const b = BODIES[bid]; if (!b || b.kind === "neb") continue; const [bx_, by_] = bodyPos(b), R = Math.max(30, b.r*k*.55);
    ctx.globalAlpha = Math.min(.35, .03 + .025*Math.sqrt(c)); ctx.drawImage(sprite(b.hue), sx(bx_) - R, sy(by_) - R, R*2, R*2); }
  ctx.restore(); }
const senseDateLabel = t => { const d = new Date(t); return senseStep === "week" ? `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// ---- the timeline bar: ▶ / ❚❚, Month | Week, a scrubber, the date, and × to show everything ----
let senseStep = pref("iv-sstep", "month") === "week" ? "week" : "month", senseFx = ["comet","rain","swirl","swirlin"].includes(pref("iv-sfx", "comet")) ? pref("iv-sfx", "comet") : "comet",   /* Popcorn retired: anyone on it moves to Comets */ sensePlaying = false, senseTimer = 0;
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
  pb.style.top = !isPhone() && !tb.hidden && (view === "sense" || view === "stars" || view === "gravity" || view === "chord" || expOn()) ? (tb.offsetTop + tb.offsetHeight + 8) + "px" : "";
  const db = $("#driftbar"); db.hidden = false;   // Orbit runs on every map (Earth, a fixed tilt, shows only on 3D maps)
  db.style.top = !isPhone() && pb.style.top ? (pb.offsetTop + pb.offsetHeight + 8) + "px" : ""; syncTB(); }
on(win, "resize", () => { placePlaybar(); placeAnitab(); });
function syncTimebar(){ const on = true; win.setTimeout(placePlaybar, 0);
  root.querySelectorAll("#tlstep button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.s === senseStep)));
  root.querySelectorAll("#tlfx button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === senseFx)));
  root.querySelectorAll("#tlspeed button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === senseSpeed))); $("#timebar").hidden = !on; if (!on) { senseStop(); if (senseT != null) { senseT = null; senseTrail = []; } }
 }
let morphing = false;
// Moves notes to their new places. With cam, the camera's destination is worked out from where the
// notes will land, and camera and notes move in the same frames (one motion, not two).
let morphId = 0, hopSlow = false;
function morph(animate, cam){
  if (view === "gravity") layoutGravity(); else if (view === "stars") layoutStars(); else if (view === "sense") layoutSense(); else if (view === "arc") layoutArc(); else if (view === "chord") layoutChord(); else if (view === "spacetime") layoutSpace(); else if (expOn()) { EHID.fill(0); EXP[view].layout(); }
  let tX = expOn() ? EX : view === "spacetime" ? XT : view === "gravity" ? GX : view === "stars" ? (S3D ? (project3D(), P3X) : SX) : view === "sense" ? SNX : view === "arc" ? ARX : view === "chord" ? CHX : curX(), tY = view === "gravity" ? GY : view === "stars" ? (S3D ? P3Y : SY) : view === "sense" ? SNY : view === "arc" ? ARY : view === "chord" ? CHY : view === "spacetime" ? YST : YE;
  if (expOn()) tY = EY;
  if (domeOn()) { domeUse(); domeAngles(tX, tY); domeProject(); tX = DX; tY = DY; }
  if (csphOn()) { csAngles(); csProject(); tX = DX; tY = DY; }
  const c1 = cam ? cam(tX, tY) : null;
  if (!animate || win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    X.set(tX); Y.set(tY); buildGrid(); if (c1) { k = c1.k; tx = c1.tx; ty = c1.ty; } draw(); return; }
  const fX = Float32Array.from(X), fY = Float32Array.from(Y), t0 = performance.now(), dur = hopSlow ? 1900 : 750, id = ++morphId;   // autoplay's map hops move slower, so you can watch the notes travel
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
  root.querySelectorAll("#vseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === tabOf())));
  root.dataset.view = view; syncTimebar(); root.dataset.dome = domeOn() || sphOn() || geo3On() ? "1" : "";
  if (yrNarrow()) { computeVis(); layoutACE(); layoutTime(); layoutProp(); updateCounts(); }
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
let chordBy = pref("iv-chordby", "folders") === "time" ? "time" : "folders";   // Chord, Corona and Tesla: arcs by folder, or by year (clockwise from 12 o'clock)
const CHCAT_F = (() => {
  const by = new Map(); const key = d => d.archive ? "x/z archive" : d.sub || d.ace;
  for (const d of N) by.set(key(d), (by.get(key(d)) || 0) + 1);
  const name = d => { const k_ = key(d); return d.archive || by.get(k_) >= 60 ? k_ : `${d.ace} · other`; };
  const cats = new Map(); N.forEach((d,i) => { const nm = name(d); if (!cats.has(nm)) cats.set(nm, {name:nm, ace: d.archive ? "x" : d.ace, ids:[]}); cats.get(nm).ids.push(i); });
  const order = ["+","Atlas","Calendar","Efforts","x"], list = [...cats.values()].sort((a,b) => order.indexOf(a.ace) - order.indexOf(b.ace) || (a.name.endsWith("· other") - b.name.endsWith("· other")) || b.ids.length - a.ids.length);
  list.forEach((c, j) => { c.id = j; c.short = c.name === "x/z archive" ? c.name : c.name === "+" ? "+" : c.name === "+ · other" ? "+ · other" : c.name.includes(" · other") ? c.name : c.name.split("/").pop(); });
  return list; })();
const CHCAT_T = (() => {   // one arc a year, oldest first; undated notes at the end
  const ys = new Map(); N.forEach((d, i) => { const y = isNaN(TV[i]) ? "No date" : String(new Date(TV[i]).getUTCFullYear()); if (!ys.has(y)) ys.set(y, []); ys.get(y).push(i); });
  const keys = [...ys.keys()].sort((a, b) => (a === "No date") - (b === "No date") || a.localeCompare(b)), nums = keys.filter(k => k !== "No date").map(Number), y0 = Math.min(...nums), y1 = Math.max(...nums);
  return keys.map((k, j) => { const f = k === "No date" ? -1 : (Number(k) - y0)/Math.max(1, y1 - y0);
    return {id: j, name: k, short: k, ace: k === "No date" ? "x" : "t", hue: f < 0 ? "#8b8b95" : `hsl(${Math.round(205 - 175*f)}, 58%, ${Math.round(50 + 6*f)}%)`, ids: ys.get(k)}; }); })();
let ribKey = null, CH_RIB = [], CH_MAX = 0;   // CH_MAX: the biggest band with every note shown (all time), the scale every band is drawn against
let CHCAT = chordBy === "time" ? CHCAT_T : CHCAT_F;
// By Folders, unless the notes shown all sit in one folder (a base of one folder, a filter): then by Time, so there are bands between years to see
let chOneFolder = false;
function chSetCats(){ let k = 0; if (typeof vis !== "undefined" && vis) for (const c of CHCAT_F) { if (c.ids.some(i => vis[i])) k++; if (k > 1) break; }
  chOneFolder = chordBy !== "time" && k === 1;
  const want = chordBy === "time" || chOneFolder ? CHCAT_T : CHCAT_F; if (want === CHCAT && ribKey !== null) return;
  CHCAT = want; for (const c of CHCAT) for (const i of c.ids) CHC[i] = c.id; ribKey = null; }
chSetCats();
// angles: share by count^0.6 so the big folders don't swallow the ring; small gaps between kinds, bigger between ACE folders.
// Only the kinds with notes showing get a share: switch folders off and the rest close up to fill the whole ring.
function chAngles(){
  const m = CHCAT.map(c => { let v = 0; for (const i of c.ids) if (vis[i]) v++; return v; }), on = CHCAT.filter((c, j) => m[j] > 0);
  const gapIn = .012, gapAce = .05; let tot = 0; on.forEach(c => tot += Math.pow(m[c.id], .6));
  let gaps = 0; on.forEach((c, j) => gaps += j && on[j-1].ace !== c.ace ? gapAce : j ? gapIn : 0); gaps += gapAce;
  let a = (chordBy === "time" ? -Math.PI/2 : Math.PI) + gapAce/2; const room = 2*Math.PI - gaps;
  for (const c of CHCAT) { if (m[c.id] === 0) { c.a0 = c.a1 = a; continue; } const j = on.indexOf(c); if (j) a += on[j-1].ace !== c.ace ? gapAce : gapIn; c.a0 = a; a += room*Math.pow(m[c.id], .6)/tot; c.a1 = a; }
}
// bundled ribbons between kinds (body, up and related links): drawn faintly as the default picture
function chRibbons(){   // counted among the notes shown (and, on the timeline, born by then), so the ribbons grow with the vault
  let nv = 0; for (let i=0;i<n;i++) if (vis[i]) nv++;
  const key_ = (senseT == null ? "all" : senseT) + ":" + nv; if (key_ === ribKey) return CH_RIB; ribKey = key_;
  const m = new Map(), on = i => vis[i] && (senseT == null || !(TV[i] > senseT));
  for (const [a,b,t] of E) { if (t === 2 || t === 3 || t === 5 || !on(a) || !on(b)) continue; const p = CHC[a], q = CHC[b]; if (p === q) continue; const kk = p < q ? p*1000 + q : q*1000 + p; m.set(kk, (m.get(kk) || 0) + 1); }
  CH_RIB = [...m].map(([kk, c]) => ({p: Math.floor(kk/1000), q: kk % 1000, c})).filter(r => r.c >= 3).sort((a,b) => a.c - b.c);
  if (senseT == null) CH_MAX = CH_RIB.length ? CH_RIB[CH_RIB.length - 1].c : 0; return CH_RIB; }
// bands are scaled to the biggest one among the notes shown, so a base, a filter or a focus still shows them clearly; on the timeline they grow toward that
const ribMax = () => Math.max(30, CH_MAX || 900);
function layoutChord(){
  chSetCats();
  chAngles();
  for (const c of CHCAT) { const ids = c.ids.slice().sort((a,b) => (isNaN(TV[a]) ? -1 : TV[a]) - (isNaN(TV[b]) ? -1 : TV[b])), m = ids.length;
    ids.forEach((i, j) => { const a = c.a0 + (c.a1 - c.a0)*((j + .5)/m), lv = N[i].level, h = hash(N[i].path, 23);
      const r = CH_R*(lv >= 3 ? 1.0 + .012*(lv - 3) : lv === 2 ? .955 + .03*h : .91 + .035*h);   // higher levels sit on the outer edge of the band
      CHX[i] = CH_C.x + r*Math.cos(a); CHY[i] = CH_C.y + r*Math.sin(a); }); }
}
const chHue = c => c.hue || CH_HUE[c.ace] || "#888";

// ---------- Chord Sphere (experimental): the chord ring wrapped onto a globe you orbit from outside ----------
// Each kind is a wedge from pole to pole (Level 5 toward the North Pole, Level 1 toward the South); the bundled ribbons
// arc between kinds, either out over the surface like solar prominences ("out") or through the inside of the globe ("in").
let CSPH = ["out", "in"].includes(pref("iv-csph", "")) ? pref("iv-csph", "") : "";
const csphOn = () => view === "chord" && !!CSPH;
let PMODE = ["flat", "table", "globe"].includes(pref("iv-planetmode", "")) ? pref("iv-planetmode", "") : ["flat", "table", "globe"].includes(pref("iv-pmode", "")) ? pref("iv-pmode", "") : pref("iv-pglobe", true) !== false ? "globe" : "table";   // (0.1.69–0.1.73 kept this under autoplay's key by mistake)   // Planet: the map flat, on a tabletop, or as a globe
let PGLOBE = PMODE === "globe";
const globeOn = () => view === "planet" && PGLOBE;
const sphOn = () => csphOn() || globeOn();   // any globe you orbit from outside: Corona, Tesla, or the PKM Planet globe
const csOut = () => globeOn() || CSPH === "out";
let csBands = pref("iv-csbands", true) !== false;   // Corona and Tesla: the bundled bands between kinds (on by default)   // links arc out over the surface
let camOwner = "";   // the chord sphere and the planet globe each keep their own camera
function sphCam(owner){ if (camOwner === owner) return; if (camOwner) save(camOwner === "globe" ? "iv-gcam" : "iv-cscam", [+csYaw.toFixed(3), +csPitch.toFixed(3)]);
  const c = pref(owner === "globe" ? "iv-gcam" : "iv-cscam", null); if (Array.isArray(c)) { csYaw = +c[0] || 0; csPitch = +c[1] || 0; } else if (owner === "globe") { csYaw = 0; csPitch = 0; } camOwner = owner; }
let csYaw = .4, csPitch = .35; { const c = pref("iv-cscam", null); if (Array.isArray(c)) { csYaw = +c[0] || csYaw; csPitch = +c[1] || csPitch; } }
const CS_R = 600, CS_D = 2400;   // the globe's radius; how far away you stand
const CSC = [];   // each kind's heart on the globe (the average direction of its notes): where its ribbons leave from
function csAngles(){ sphCam("chord"); for (let i=0;i<n;i++) { DTH[i] = Math.atan2(CHY[i] - CH_C.y, CHX[i] - CH_C.x); DPH[i] = Math.asin(Math.max(-1, Math.min(1, 1 - 2*YE[i]/WH)))*.92; }
  for (const c of CHCAT) { let x = 0, y = 0, z = 0; for (const i of c.ids) { if (!vis[i]) continue; const q = Math.cos(DPH[i]); x += q*Math.cos(DTH[i]); y += Math.sin(DPH[i]); z += q*Math.sin(DTH[i]); }
    CSC[c.id] = [Math.atan2(z, x), Math.atan2(y, Math.hypot(x, z))]; } }   // (in the notes' own angles; csCam does the mirroring)
function csCam(th, ph, r){   // a point on (or off) the globe → [world x, world y, hidden?]
  const c = Math.cos(ph); let x = c*Math.cos(th)*r, y = Math.sin(ph)*r, z = -c*Math.sin(th)*r;   // z mirrored: from outside, near the equator, the kinds read left to right (+, Atlas, Calendar, Efforts, x)
  const cy = Math.cos(csYaw), sy_ = Math.sin(csYaw), cp = Math.cos(csPitch), sp = Math.sin(csPitch);
  const x1 = x*cy - z*sy_, z1 = x*sy_ + z*cy, y2 = y*cp - z1*sp, z2 = y*sp + z1*cp;
  const dpt = CS_D - z2;
  // hidden behind the globe? (the line from your eye to the point passes through the sphere first)
  const dx = x1, dy = y2, dz = z2 - CS_D, a = dx*dx + dy*dy + dz*dz, b = 2*CS_D*dz, cc = CS_D*CS_D - CS_R*CS_R, disc = b*b - 4*a*cc;
  let hid = false; if (disc > 0) { const t1 = (-b - Math.sqrt(disc))/(2*a); hid = t1 > 0 && t1 < 1 - 2e-3; }
  return [x1*CS_D/dpt, -y2*CS_D/dpt, hid];
}
function csProject(){ const see = csphOn() && CSPH === "in";   // inside arcs: the globe is glass, so its far side shows too
  for (let i=0;i<n;i++) { const p = csCam(DTH[i], DPH[i], CS_R); DX[i] = p[0]; DY[i] = p[1]; DFR[i] = see || !p[2] ? 1 : 0; } }   // far-side notes keep their projected spot (for their links), but aren't drawn or clickable
function csKeep(){ save(globeOn() ? "iv-gcam" : "iv-cscam", [+csYaw.toFixed(3), +csPitch.toFixed(3)]); }
function csArc(th1, ph1, th2, ph2, steps){   // the path between two points: over the outside, or through the inside
  const u = [Math.cos(ph1)*Math.cos(th1), Math.sin(ph1), Math.cos(ph1)*Math.sin(th1)], v = [Math.cos(ph2)*Math.cos(th2), Math.sin(ph2), Math.cos(ph2)*Math.sin(th2)];
  const om = Math.acos(Math.max(-1, Math.min(1, u[0]*v[0] + u[1]*v[1] + u[2]*v[2]))), so = Math.sin(om) || 1e-6, out = [];
  const h = csOut() ? .06 + .32*om/Math.PI : -Math.min(.92, .25 + .8*om/Math.PI);
  for (let s_ = 0; s_ <= steps; s_++) { const t = s_/steps, A = Math.sin((1 - t)*om)/so, B = Math.sin(t*om)/so;
    let w = [A*u[0] + B*v[0], A*u[1] + B*v[1], A*u[2] + B*v[2]]; const L = Math.hypot(w[0], w[1], w[2]) || 1; w = w.map(q => q/L);
    const r = CS_R*(1 + h*Math.sin(Math.PI*t)), ph = Math.asin(w[1]), th = Math.atan2(w[2], w[0]); out.push(csCam(th, ph, r)); }
  return out;
}
function csStroke(pts){ let on = false; for (const p of pts) { if (p[2] && csOut()) { on = false; continue; } const x = sx(p[0]), y = sy(p[1]); if (on) ctx.lineTo(x, y); else { ctx.moveTo(x, y); on = true; } } }
function csGuides(){
  const cx = sx(0), cy = sy(0), rs = CS_R*k*CS_D/Math.sqrt(CS_D*CS_D - CS_R*CS_R);
  ctx.beginPath(); ctx.arc(cx, cy, rs, 0, 6.2832);
  if (CSPH === "out") {   // a lit globe: a faint atmosphere around the rim, soft light from the upper left, the far side in shade
    const tr = (c, al) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c; const v = m[1].split(",").slice(0, 3).join(","); return `rgba(${v},${al})`; };
    const halo = ctx.createRadialGradient(cx, cy, rs*.97, cx, cy, rs*1.16); halo.addColorStop(0, tr(css.accent, .035)); halo.addColorStop(1, tr(css.accent, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, rs*1.16, 0, 6.2832); ctx.fill();
    const g = ctx.createRadialGradient(cx - rs*.4, cy - rs*.45, 0, cx - rs*.15, cy - rs*.15, rs*1.15);
    g.addColorStop(0, tr(css.ink, .035)); g.addColorStop(.45, tr(css.ink, .01)); g.addColorStop(1, tr(css.ink, 0));
    ctx.beginPath(); ctx.arc(cx, cy, rs, 0, 6.2832); ctx.fillStyle = css.bg; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fill();
    const rim = ctx.createRadialGradient(cx, cy, rs*.82, cx, cy, rs); rim.addColorStop(0, tr(css.accent, 0)); rim.addColorStop(1, tr(css.accent, .02)); ctx.fillStyle = rim; ctx.fill(); }
  ctx.globalAlpha = .6; ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
  // each kind's wedge: its colored belt along the equator, and its edge from pole to pole
  ctx.lineCap = "butt";
  for (const c of CHCAT) { if (c.a1 <= c.a0) continue; const pts = []; for (let a = c.a0; a <= c.a1 + 1e-6; a += Math.max(.01, (c.a1 - c.a0)/16)) pts.push(csCam(a, 0, CS_R*1.04));
    ctx.strokeStyle = chHue(c); ctx.globalAlpha = .8; ctx.lineWidth = Math.max(2.5, rs*.025); ctx.beginPath(); csStroke(pts); ctx.stroke();
    const mer = []; for (let ph = -1.45; ph <= 1.45; ph += .05) mer.push(csCam(c.a0, ph, CS_R)); ctx.globalAlpha = .18; ctx.lineWidth = 1; ctx.beginPath(); csStroke(mer); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // ribbons between kinds: out over the surface, or through the glass
  // with a note picked, its own kind's bands stay bright and the rest step back (not out)
  const hl = sel >= 0 ? sel : hover, hk = hl >= 0 ? CHC[hl] : -1, mx = (chRibbons(), ribMax());
  if (csBands) for (const r of chRibbons()) { const A = CHCAT[r.p], B = CHCAT[r.q], fade = hk < 0 || r.p === hk || r.q === hk ? 1 : .4;
    ctx.strokeStyle = chHue(A); ctx.globalAlpha = (.08 + .3*Math.sqrt(r.c/mx))*fade; ctx.lineWidth = Math.max(.7, Math.sqrt(r.c/mx)*rs*(CSPH === "out" ? .045 : .07));
    const ca = CSC[A.id], cb = CSC[B.id]; if (!ca || !cb) continue; ctx.beginPath(); csStroke(csArc(ca[0], ca[1], cb[0], cb[1], 28)); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineCap = "round";
}
function csLabels(){
  ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const taken = [];
  for (const c of [...CHCAT].sort((p_, q_) => q_.ids.length - p_.ids.length)) { if (c.a1 <= c.a0) continue; const p = csCam((c.a0 + c.a1)/2, 0, CS_R*1.14); if (p[2]) continue;
    const x = sx(p[0]), y = sy(p[1]), t = c.short.toUpperCase(); ctx.font = `600 10.5px ${css.mono}`; const tw = ctx.measureText(t).width + 6, bx = [x - tw/2, y - 9, tw, 18];
    if (taken.some(q => bx[0] < q[0]+q[2] && bx[0]+bx[2] > q[0] && bx[1] < q[1]+q[3] && bx[1]+bx[3] > q[1])) continue; taken.push(bx);
    ctx.fillStyle = chHue(c); ctx.strokeText(t, x, y); ctx.fillText(t, x, y); }   // folder names: small caps in their folder's color, so they never read as note titles
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

// ======================================================================================================
// Experimental maps (under ⋯ → Experimental → Sketches → Unfinished): Geometric, Bookshelf, Tree, Treemap, Skyline.
// Each one fills EX/EY with where its notes sit, and may draw its own guides, notes and labels. Everything else
// (links on click, the note panel, search, the trail, the time-lapse) works as on every other map.
// ======================================================================================================
const EX = new Float32Array(n), EY = new Float32Array(n);
const RX = new Float32Array(n), RY = new Float32Array(n), RW = new Float32Array(n), RH = new Float32Array(n);   // a note's rectangle (spines, tiles), world units
const EXP = {};
const expOn = () => !!EXP[view];
let expBox = {x0: 0, y0: 0, x1: 1, y1: 1};
function expBounds(pad){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i=0;i<n;i++) { if (!vis[i]) continue; const a = RW[i] ? RX[i] : EX[i], b = RH[i] ? RY[i] : EY[i], c = RW[i] ? RX[i] + RW[i] : EX[i], d = RH[i] ? RY[i] + RH[i] : EY[i];
    if (a < x0) x0 = a; if (b < y0) y0 = b; if (c > x1) x1 = c; if (d > y1) y1 = d; }
  if (!isFinite(x0)) { x0 = y0 = 0; x1 = y1 = 1; } expBox = {x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad}; }
const UND = i => { const a = out[i], b = inn[i]; return a.length ? (b.length ? a.concat(b) : a) : b; };
// several sources at once: every note reached gets the source it's closest to (ties go to the earlier source); ok limits where it may go
function bfsMulti(sources, ok){ const src = new Int32Array(n).fill(-1), dist = new Int32Array(n).fill(-1), par = new Int32Array(n).fill(-1), q = [];
  for (const s of sources) if (src[s] < 0) { src[s] = s; dist[s] = 0; q.push(s); }
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of UND(i)) { if (src[j] >= 0 || !ok(j)) continue; src[j] = src[i]; dist[j] = dist[i] + 1; par[j] = i; q.push(j); } }
  return {src, dist, par}; }
const byRank = (a, b) => (N[b].level - N[a].level) || (N[b].score - N[a].score);
const hexHsl = (hex, dl, ds) => { const m = /^#?(..)(..)(..)$/.exec(hex || "#888888"); let r = parseInt(m[1],16)/255, g = parseInt(m[2],16)/255, b = parseInt(m[3],16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2, d_ = mx - mn; let h = 0, s = 0;
  if (d_) { s = d_/(1 - Math.abs(2*l - 1)); h = mx === r ? ((g-b)/d_ + 6) % 6 : mx === g ? (b-r)/d_ + 2 : (r-g)/d_ + 4; h *= 60; }
  return `hsl(${Math.round(h)},${Math.round(Math.max(0, Math.min(1, s + (ds || 0)))*100)}%,${Math.round(Math.max(.08, Math.min(.92, l + (dl || 0)))*100)}%)`; };
const aceHue = d => CH_HUE[d.archive ? "x" : d.ace] || "#7a8a99";
function lvFill(i, x, y, r){ const lv = N[i].level; if (lv < 3) return lv === 2 ? css.l2 : css.l1; const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, GRAD[lv][0]); g.addColorStop(1, GRAD[lv][1]); return g; }
function rectPick(x, y){ let best = -1, ba = Infinity;   // the smallest rectangle under the point
  for (let i=0;i<n;i++) { if (!RW[i] || !VV(i)) continue; const h = Math.abs(RH[i]); if (x >= RX[i] && x <= RX[i] + RW[i] && y >= RY[i] && y <= RY[i] + h) { const a = RW[i]*h + (RH[i] < 0 ? 1e9 : 0); if (a < ba) { ba = a; best = i; } } }   // leaning books answer only on their own footprint, and upright books win
  return best; }
// nearest map for every note (maps: Level 3 and up), and the hub each map belongs to, within the notes ok() allows
function mapGroups(ok){
  const maps = []; for (let i=0;i<n;i++) if (vis[i] && ok(i) && N[i].level >= 3) maps.push(i); maps.sort(byRank);
  const hubs = maps.filter(i => N[i].level === 5);
  const G = bfsMulti(maps, j => vis[j] && ok(j)), H = bfsMulti(hubs.length ? hubs : maps.slice(0, 1), j => vis[j] && ok(j));
  return {maps, hubs, map: G.src, hub: H.src}; }

// ---------- Geometric: the top 25 placed as far apart as the triangles allow; #1 in the center, #2–5 in the corners ----------
// Then each triangle gets a note at its center (6–9), which splits it in three, and so on. Every other note joins
// the top note it reaches in the fewest links, closer in the higher its level. Placement follows the scoring live.
// Three shapes: Square (#2–5 in the corners), Hexagon (#2–7 on the six corners, the same triangle splitting) and
// Mandala (#2–7 on an inner ring, #8–25 on an outer ring, three petals to each inner note).
const QS = 800; let QPTS = [], QTRI = [], QTOP = [], QRC = [], QPAR = [];
let GEO = ["square", "hex", "mandala", "octa", "shells"].includes(pref("iv-geo", "square")) ? pref("iv-geo", "square") : "square";
const hexAt = j => [Math.cos(-Math.PI/2 + j*Math.PI/3)*QS, Math.sin(-Math.PI/2 + j*Math.PI/3)*QS];
function mandalaSeeds(m){   // #1 in the center; 6 petals; 18 outer petals, three around each inner one
  const pts = [[0, 0]], par = [-1], r1 = QS*.48, r2 = QS;
  for (let j = 0; j < 6 && pts.length < m; j++) { const a = -Math.PI/2 + j*Math.PI/3; pts.push([Math.cos(a)*r1, Math.sin(a)*r1]); par.push(0); }
  for (const d of [0, -1, 1]) for (let j = 0; j < 6 && pts.length < m; j++) { const a = -Math.PI/2 + j*Math.PI/3 + d*Math.PI/9; pts.push([Math.cos(a)*r2, Math.sin(a)*r2]); par.push(1 + j); }
  return {pts, tris: [], par}; }
function quinSeeds(m){
  if (GEO === "mandala") return mandalaSeeds(m);
  const P = GEO === "hex" ? [[0, 0], ...[0, 1, 2, 3, 4, 5].map(hexAt)] : [[0, 0], [-QS, -QS], [QS, -QS], [QS, QS], [-QS, QS]];
  let tris = GEO === "hex" ? [[1, 2, 0], [2, 3, 0], [3, 4, 0], [4, 5, 0], [5, 6, 0], [6, 1, 0]] : [[1, 2, 0], [2, 3, 0], [3, 4, 0], [4, 1, 0]]; const pts = P.slice(0, Math.min(m, P.length)), all = [...tris];
  while (pts.length < m) {
    const cen = tris.map(t => [(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0])/3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1])/3]);
    const need = m - pts.length, take = new Set();
    if (cen.length <= need) cen.forEach((c, j) => take.add(j));
    else while (take.size < need) { let bj = -1, bd = -1;   // the emptiest centers first
      cen.forEach((c, j) => { if (take.has(j)) return; let d = Infinity; for (const p of pts) d = Math.min(d, Math.hypot(c[0]-p[0], c[1]-p[1])); for (const t of take) d = Math.min(d, Math.hypot(c[0]-cen[t][0], c[1]-cen[t][1])); if (d > bd + 1e-6) { bd = d; bj = j; } });
      take.add(bj); }
    const next = [];
    tris.forEach((t, j) => { if (!take.has(j)) { next.push(t); return; } const k_ = pts.length; pts.push(cen[j]); const s = [[t[0], t[1], k_], [t[1], t[2], k_], [t[2], t[0], k_]]; next.push(...s); all.push(...s); });
    tris = next; }
  return {pts, tris: all, par: []}; }
// ---------- Geometric · Octahedron (3D): the same rule in space ----------
// #1 at the core, #2–7 on the six points; then each tetrahedron (a face of the octahedron and the core) gets a note
// at its center, the emptiest first, which splits it in four. Other notes gather in a small cloud around their top note.
// the Obsidian map in 3D uses the same turntable camera as the 3D Geometric sketches
// Obsidian (flat, draggable) and Ideaverse (the same graph in 3D) share the graph engine
let GR3F = 2000, VGRID = pref("iv-vgrid", false) === true;
// which main tab a map lights: Space-Time is Emergence's, Tesla is the chord map turned inside a glass globe
function tabOf(){ return view === "spacetime" ? "emergence" : view === "chord" && CSPH === "in" ? "tesla" : view; }
function GRV(){ return view === "graph" || view === "ideaverse"; }
function IDV(){ return view === "ideaverse"; }
const geo3On = () => (view === "quincunx" && (GEO === "octa" || GEO === "shells")) || (GRV() && IDV());
let g3Yaw = .55, g3Pitch = .42; { const c = pref("iv-g3cam", null); if (Array.isArray(c)) { g3Yaw = +c[0] || g3Yaw; g3Pitch = +c[1] || g3Pitch; } }
const G3 = new Float32Array(3*n); let G3P = [], G3E = [];
const g3Keep = () => save("iv-g3cam", [+g3Yaw.toFixed(3), +g3Pitch.toFixed(3)]);
function g3Cam(x, y, z){ const cy = Math.cos(g3Yaw), sy_ = Math.sin(g3Yaw), cp = Math.cos(g3Pitch), sp = Math.sin(g3Pitch);
  const x1 = x*cy + z*sy_, z1 = -x*sy_ + z*cy, y2 = y*cp - z1*sp, z2 = y*sp + z1*cp, f = GRV() ? GR3F : QS*4.5, sc = f/Math.max(f*.15, f + z2); return [x1*sc, y2*sc, z2, sc]; }
function geoProj(){ for (let i=0;i<n;i++) { const q = g3Cam(G3[3*i], G3[3*i+1], G3[3*i+2]); EX[i] = q[0]; EY[i] = q[1]; DS3[i] = Math.max(.45, Math.min(2.2, q[3]*q[3])); } }
function octaSeeds(m){
  const P = [[0, 0, 0], [0, -QS, 0], [QS, 0, 0], [0, 0, QS], [-QS, 0, 0], [0, 0, -QS], [0, QS, 0]], pts = P.slice(0, Math.min(m, 7));
  let tets = []; for (const a of [1, 6]) for (const [b, c] of [[2, 3], [3, 4], [4, 5], [5, 2]]) tets.push([a, b, c, 0]);
  const edges = new Set(), ed = (a, b) => edges.add(a < b ? a + "," + b : b + "," + a); for (const t of tets) { ed(t[0], t[1]); ed(t[1], t[2]); ed(t[2], t[0]); ed(t[0], 3 - 3); }
  for (const [b, c] of [[2, 3], [3, 4], [4, 5], [5, 2]]) ed(b, c); for (let v = 1; v <= 6; v++) ed(0, v);
  while (pts.length < m) {
    const cen = tets.map(t => [0, 1, 2].map(a => (pts[t[0]][a] + pts[t[1]][a] + pts[t[2]][a] + pts[t[3]][a])/4)), need = m - pts.length, take = new Set();
    const d3 = (p, q) => Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]);
    if (cen.length <= need) cen.forEach((c, j) => take.add(j));
    else while (take.size < need) { let bj = -1, bd = -1; cen.forEach((c, j) => { if (take.has(j)) return; let d = Infinity; for (const p of pts) d = Math.min(d, d3(c, p)); for (const t of take) d = Math.min(d, d3(c, cen[t])); if (d > bd + 1e-6) { bd = d; bj = j; } }); take.add(bj); }
    const next = []; tets.forEach((t, j) => { if (!take.has(j)) { next.push(t); return; } const k_ = pts.length; pts.push(cen[j]); for (const v of t) ed(v, k_);
      next.push([t[0], t[1], t[2], k_], [t[0], t[1], k_, t[3]], [t[0], k_, t[2], t[3]], [k_, t[1], t[2], t[3]]); }); tets = next; }
  return {pts, edges: [...edges].map(e => e.split(",").map(Number)).filter(([a, b]) => a < pts.length && b < pts.length)}; }
function shellSeeds(m){   // #1 the core; #2–7 on an inner shell (the six directions); #8–25 on the outer shell, three petals around each inner note
  const r1 = QS*.5, r2 = QS, pts = [[0, 0, 0]], par = [-1], dirs = [[0, -1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1, 0]];
  for (let j = 0; j < 6 && pts.length < m; j++) { pts.push(dirs[j].map(v => v*r1)); par.push(0); }
  const norm = v => { const L = Math.hypot(...v) || 1; return v.map(x => x/L); }, cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  for (let ring = 0; ring < 3; ring++) for (let j = 0; j < 6 && pts.length < m; j++) {
    const d = dirs[j], u = norm(cross(d, Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), v = cross(d, u), ph = ring*2*Math.PI/3 + j*.5, a = .55;
    const c = norm([0, 1, 2].map(t => d[t]*Math.cos(a) + (u[t]*Math.cos(ph) + v[t]*Math.sin(ph))*Math.sin(a))); pts.push(c.map(x => x*r2)); par.push(1 + j); }
  return {pts, edges: par.map((p_, i) => [p_, i]).filter(([p_]) => p_ >= 0), par}; }
function layoutOcta(){
  const cand = []; for (let i=0;i<n;i++) if (vis[i] && !ARCH[i]) cand.push(i); cand.sort(byRank);
  QTOP = cand.slice(0, Math.min(25, cand.length)); const {pts, edges} = GEO === "shells" ? shellSeeds(QTOP.length) : octaSeeds(QTOP.length); G3P = pts; G3E = edges; QPTS = []; QTRI = []; QPAR = [];
  const rc = pts.map((p, a) => { let d = Infinity; pts.forEach((q, b) => { if (a !== b) d = Math.min(d, Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2])); }); return Math.min(isFinite(d) ? d*.42 : QS*.5, QS*.45); }); QRC = rc;
  const seedOf = new Map(QTOP.map((i, a) => [i, a])), B = bfsMulti(QTOP, j => vis[j]);
  for (let i=0;i<n;i++) { RW[i] = RH[i] = 0; const a = seedOf.get(i), h1 = hash(N[i].path, 31), h2 = hash(N[i].path, 37), h3 = hash(N[i].path, 41);
    const zz = 2*h1 - 1, th = 2*Math.PI*h2, rr = Math.sqrt(1 - zz*zz), dir = [rr*Math.cos(th), zz, rr*Math.sin(th)];   // an even spread of directions
    let p;
    if (a !== undefined) p = pts[a];
    else { const s_ = B.src[i]; if (s_ < 0) { const R_ = QS*(1.35 + .12*h3); p = dir.map(v => v*R_); }   // never reached: a faint shell around everything
      else { const a2 = seedOf.get(s_), lv = N[i].level, fr = lv >= 4 ? .18 + .1*h3 : lv === 3 ? .32 + .12*h3 : lv === 2 ? .48 + .38*Math.sqrt(h3) : .9 + .1*h3; p = pts[a2].map((v, c) => v + dir[c]*rc[a2]*fr*(a2 === 0 ? 1.7 : 1)); } }   // #1's cloud spreads wider, so the core isn't a knot
    G3[3*i] = p[0]; G3[3*i+1] = p[1]; G3[3*i+2] = p[2]; }
  geoProj(); expBox = {x0: -QS*1.45, y0: -QS*1.45, x1: QS*1.45, y1: QS*1.45}; }
function layoutQuin(){
  if (GEO === "octa" || GEO === "shells") { layoutOcta(); return; }
  const cand = []; for (let i=0;i<n;i++) if (vis[i] && !ARCH[i]) cand.push(i); cand.sort(byRank);
  QTOP = cand.slice(0, Math.min(25, cand.length)); const {pts, tris, par} = quinSeeds(QTOP.length); QPTS = pts; QTRI = tris; QPAR = par;
  QRC = pts.map((p, a) => { let d = Infinity; pts.forEach((q, b) => { if (a !== b) d = Math.min(d, Math.hypot(p[0]-q[0], p[1]-q[1])); }); return Math.min(isFinite(d) ? d*.46 : QS*.6, QS*.5); });
  const seedOf = new Map(QTOP.map((i, a) => [i, a])), B = bfsMulti(QTOP, j => vis[j]);
  for (let i=0;i<n;i++) { RW[i] = RH[i] = 0; const a = seedOf.get(i);
    if (a !== undefined) { EX[i] = pts[a][0]; EY[i] = pts[a][1]; continue; }
    const s = B.src[i], h1 = hash(N[i].path, 31), h2 = hash(N[i].path, 37);
    if (s < 0 && GEO !== "square") { const a = h1*2*Math.PI, r = QS*(1.2 + .1*h2); EX[i] = Math.cos(a)*r; EY[i] = Math.sin(a)*r; continue; }   // a ring around the hexagon or mandala
    if (s < 0) {   // never reached from the top 25: a frame around the square
      const t = h1*4, side = Math.floor(t), f = t - side, off = QS*(1.16 + .1*h2), e = -QS*1.1 + f*QS*2.2;
      [EX[i], EY[i]] = side === 0 ? [e, -off] : side === 1 ? [off, e] : side === 2 ? [-e, off] : [-off, -e]; continue; }
    const a2 = seedOf.get(s), lv = N[i].level, rc = QRC[a2];
    const fr = lv >= 4 ? .16 + .1*h2 : lv === 3 ? .3 + .12*h2 : lv === 2 ? .46 + .4*Math.sqrt(h2) : .88 + .1*h2, ang = h1*2*Math.PI;
    EX[i] = pts[a2][0] + Math.cos(ang)*rc*fr; EY[i] = pts[a2][1] + Math.sin(ang)*rc*fr; }
  expBounds(80); }
EXP.quincunx = {
  layout: layoutQuin,
  guides(){
    const gd = GEO === "shells" ? (sel >= 0 ? .22 : hover >= 0 ? .55 : 1) : (sel >= 0 ? .5 : hover >= 0 ? .78 : 1);   // Shells has many more petals, so they fade further   // the 3D shapes dim a little while a note is picked, less than other maps do
    if (geo3On() && GEO === "shells") {   // two glass shells, and a petal from each note to the one it grows from
      const Q = G3P.map(p => g3Cam(p[0], p[1], p[2]));
      for (const [r, al] of [[QS*.5, .22], [QS, .16]]) { ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.globalAlpha = gd*al;
        for (const ax of [0, 1, 2]) { ctx.beginPath(); for (let t = 0; t <= 64; t++) { const a = t/64*2*Math.PI, p = ax === 0 ? [0, Math.cos(a)*r, Math.sin(a)*r] : ax === 1 ? [Math.cos(a)*r, 0, Math.sin(a)*r] : [Math.cos(a)*r, Math.sin(a)*r, 0], q = g3Cam(...p); t ? ctx.lineTo(sx(q[0]), sy(q[1])) : ctx.moveTo(sx(q[0]), sy(q[1])); } ctx.stroke(); } }
      for (const [a, b] of G3E) { const A = Q[a], B = Q[b], inner = a === 0, z = (A[2] + B[2])/2, mx = (A[0] + B[0])/2, my = (A[1] + B[1])/2, dx = B[0] - A[0], dy = B[1] - A[1], w = inner ? .22 : .3;
        ctx.globalAlpha = gd*Math.max(.15, Math.min(.85, .6 - z/(QS*2.2))); ctx.strokeStyle = css.accent; ctx.lineWidth = inner ? 1.6 : 1.1; ctx.beginPath();
        ctx.moveTo(sx(A[0]), sy(A[1])); ctx.quadraticCurveTo(sx(mx - dy*w), sy(my + dx*w), sx(B[0]), sy(B[1])); ctx.quadraticCurveTo(sx(mx + dy*w), sy(my - dx*w), sx(A[0]), sy(A[1])); ctx.stroke(); }
      ctx.globalAlpha = 1; return; }
    if (geo3On()) {   // the octahedron's struts, fainter toward the back
      const Q = G3P.map(p => g3Cam(p[0], p[1], p[2])); ctx.strokeStyle = css.line; ctx.lineWidth = 1;
      for (const [a, b] of G3E) { const z = (Q[a][2] + Q[b][2])/2, hull = a >= 1 && a <= 6 && b >= 1 && b <= 6;   // the octahedron's own twelve edges stand out; the splits inside stay faint
        ctx.strokeStyle = hull ? css.accent : css.line; ctx.lineWidth = hull ? 1.6 : 1; ctx.globalAlpha = gd*Math.max(hull ? .3 : .12, Math.min(hull ? .9 : .6, (hull ? .7 : .4) - z/(QS*2.2)));
        ctx.beginPath(); ctx.moveTo(sx(Q[a][0]), sy(Q[a][1])); ctx.lineTo(sx(Q[b][0]), sy(Q[b][1])); ctx.stroke(); }
      ctx.globalAlpha = gd*.18; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.arc(sx(0), sy(0), QS*1.35*k, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; return; }
    ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.globalAlpha = .9; ctx.beginPath();
    if (GEO === "mandala") {   // petals: each note's petal reaches from the note it grows from; rings behind
      const petal = (a, b, w) => { const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2)/2, my = (y1 + y2)/2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy/L*L*w, ny = dx/L*L*w;
        ctx.moveTo(sx(x1), sy(y1)); ctx.quadraticCurveTo(sx(mx + nx), sy(my + ny), sx(x2), sy(y2)); ctx.quadraticCurveTo(sx(mx - nx), sy(my - ny), sx(x1), sy(y1)); };
      QPTS.forEach((p, a) => { if (a && QPAR[a] >= 0) petal(QPTS[QPAR[a]], p, QPAR[a] === 0 ? .3 : .22); });
      ctx.stroke(); ctx.globalAlpha = .5; ctx.beginPath(); for (const r of [QS*.48, QS]) { ctx.moveTo(sx(r), sy(0)); ctx.arc(sx(0), sy(0), r*k, 0, 6.2832); } ctx.stroke(); }
    for (const t of QTRI) { const a = QPTS[t[0]], b = QPTS[t[1]], c = QPTS[t[2]]; if (!a || !b || !c) continue; ctx.moveTo(sx(a[0]), sy(a[1])); ctx.lineTo(sx(b[0]), sy(b[1])); ctx.lineTo(sx(c[0]), sy(c[1])); ctx.closePath(); }
    ctx.stroke(); ctx.globalAlpha = .35; ctx.setLineDash([2, 5]); ctx.beginPath(); QPTS.forEach((p, a) => { ctx.moveTo(sx(p[0]) + QRC[a]*k, sy(p[1])); ctx.arc(sx(p[0]), sy(p[1]), QRC[a]*k, 0, 6.2832); }); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; },
  labels(){ ctx.font = `600 10px ${css.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.lineWidth = 4; ctx.strokeStyle = css.bg;
    QTOP.forEach((i, a) => { if (!VV(i)) return; const x = sx(EX[i]), y = sy(EY[i]) + rad(i) + 5, t = "#" + (a + 1); ctx.fillStyle = a === 0 ? css.accent : css.muted; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; },
  mustLabel: () => QTOP.filter(i => VV(i)).slice(0, geo3On() ? 7 : 25),
  get legend(){ return GEO === "shells" ? "Geometric · Shells (3D): your top 25 notes by score. #1 sits at the core, #2–7 on an inner shell, and #8–25 on the outer shell, three petals around each inner note. Every other note gathers in a small cloud around the top note it reaches in the fewest links: the higher its level, the closer it sits. Notes the top 25 never reach make a faint shell around everything. Drag to turn it."
    : GEO === "octa" ? "Geometric · Octahedron (3D): your top 25 notes by score. #1 sits at the core and #2–7 on the six points; then each pyramid between a face and the core gets a note at its center, which splits it in four. Every other note gathers in a small cloud around the top note it reaches in the fewest links: the higher its level, the closer it sits. Notes the top 25 never reach make a faint shell around everything. Drag to turn it."
    : GEO === "mandala" ? "Geometric · Mandala: your top 25 notes by score. #1 sits in the center, #2–7 on the inner ring, and #8–25 on the outer ring, three petals around each inner note. Every other note joins the top note it reaches in the fewest links: the higher its level, the closer it sits. Notes the top 25 never reach ring the outside."
    : GEO === "hex" ? "Geometric · Hexagon: your top 25 notes by score. #1 sits in the center and #2–7 on the six corners; then each triangle gets a note at its center, which splits it in three. Every other note joins the top note it reaches in the fewest links: the higher its level, the closer it sits. Notes the top 25 never reach ring the outside."
    : "Geometric · Square: your top 25 notes by score. #1 sits in the center and #2–5 in the corners; then each triangle gets a note at its center, which splits it in three. Every other note joins the top note it reaches in the fewest links: the higher its level, the closer it sits. Notes the top 25 never reach line the frame."; },
};

// ---------- Bookshelf: a double-wide wall of books with your own call numbers ----------
// Left bay: knowledge (Atlas and the other folders), shelved by call number: hub → map → note. Each map is a bookend
// that holds its notes; unlinked notes lean at the end. Right bay: Calendar by date, then Efforts, +, x and the archive.
// Spine width is words, height is level; maps and hubs wear their level colors.
const SB = {W: 1500, gap: 140, SH: 100, board: 14};
let SHELF = {rows: [], secs: [], calls: [], ghosts: []};
// Bookshelf highlights: areas and projects picked in the Efforts panel light up their own notes (the effort and every note linked to it) in a color each
let shelfHi = Array.isArray(pref("iv-shelfhi", null)) ? pref("iv-shelfhi", null) : [];
const HI_COL = ["#f2c14e", "#e8538a", "#4fc3ef", "#3ddc84", "#ff8a3d", "#b18cff", "#c9cf3c", "#ef6a4f"];
let hiCache = null;
function shelfHiMap(){ if (hiCache) return hiCache; const m = new Map();
  shelfHi.forEach((p, j) => { const i = N.findIndex(d => d.path === p); if (i < 0) return; const c = HI_COL[j % HI_COL.length]; for (const x of [i, ...out[i], ...inn[i]]) if (!m.has(x)) m.set(x, c); });
  return hiCache = m; }
let shelfSort = ["call", "az", "created", "modified", "folder"].includes(pref("iv-ssort", "call")) ? pref("iv-ssort", "call") : "call";
function layoutShelf(){
  const rows = [], secs = [], calls = [], ghosts = [], tapes = [], index = []; for (let i=0;i<n;i++) RW[i] = RH[i] = 0;
  const right = i => ARCH[i] || ["Calendar", "Efforts", "x"].includes(N[i].ace);
  const topOf = i => N[i].ace === "(root)" || N[i].ace === "+" ? "Root / +" : N[i].ace;   // the vault's top level and + share one shelf, above Atlas
  const width = i => (N[i].level >= 3 ? 3 : 0) + 2 + 2.6*Math.log10(1 + ((N[i].p && N[i].p.w) || 0)/40);
  const height = i => { const lv = N[i].level, h = hash(N[i].path, 41); return SB.SH*(lv === 5 ? .97 : lv === 4 ? .9 : lv === 3 ? .82 : lv === 2 ? .6 + .14*h : .5 + .1*h); };
  for (const [bay, x0] of [[0, 0], [1, SB.W + SB.gap]]) {
    let row = 0, x = x0, used = false;
    const baseY = r => (r + 1)*(SB.SH + SB.board + 8);
    const newRow = () => { if (used) { row++; x = x0; used = false; } };
    const put = (i, lean) => { const w = width(i); if (x + w > x0 + SB.W) { row++; x = x0; } const h = height(i), by = baseY(row);
      RX[i] = x; RW[i] = w; RH[i] = h; RY[i] = by - h; EX[i] = x + w/2; EY[i] = by - h; x += w + .6; used = true;   // links land on the top of the spine, where you can see them
      if (lean) { RH[i] = -h; EX[i] = x - .6 - w + w/2*Math.cos(.22) + h*Math.sin(.22); EY[i] = by - h*Math.cos(.22); } };
    const section = (label) => { newRow(); secs.push({label, x: x0, y: baseY(row) - SB.SH - 4}); };
    // Shelve by A–Z, Created or Modified: one run per section, with a marker where the letter or year changes
    const subOf = i => { const sb = N[i].sub || ""; return sb.includes("/") ? sb.slice(sb.indexOf("/") + 1) : ""; };
    const sorted = ids => { const tk = i => shelfSort === "az" ? N[i].title.toLowerCase() : shelfSort === "modified" ? (N[i].mt || 0) : shelfSort === "folder" ? subOf(i).toLowerCase() + "\u0000" + String(isNaN(TV[i]) ? 0 : TV[i]).padStart(16, "0") : (isNaN(TV[i]) ? -Infinity : TV[i]);
      const mk = i => shelfSort === "folder" ? (subOf(i) || "(top)") : shelfSort === "az" ? (N[i].title[0] || "?").toUpperCase() : shelfSort === "modified" ? (N[i].mt ? String(new Date(N[i].mt).getUTCFullYear()) : "?") : (isNaN(TV[i]) ? "?" : String(new Date(TV[i]).getUTCFullYear()));
      ids.sort((a, b) => { const p = tk(a), q = tk(b); return p < q ? -1 : p > q ? 1 : 0; }); let last = null, tp = null;
      for (const i of ids) { const m = mk(i);
        if (shelfSort === "folder") { if (m !== last) { last = m; x += 14; tp = {label: m, ids: [], segs: []}; tapes.push(tp); } put(i, N[i].level === 1); tp.ids.push(i); continue; }   // Subfolder: label tape under each group instead of a marker
        if (m !== last) { last = m; x += 6; put(i, N[i].level === 1); calls.push({x: RX[i], y: RY[i] + Math.abs(RH[i]), t: m, i}); continue; } put(i, N[i].level === 1); } };
    if (bay === 0) {
      const ok = i => !right(i), G = mapGroups(ok), mapRank = new Map(G.maps.map((m, j) => [m, j])), hubRank = new Map(G.hubs.map((h_, j) => [h_, j]));
      const rank_ = t => t === "Root / +" ? 0 : t === "Atlas" ? 1 : 2;
      const tops = [...new Set(N.map((d, i) => vis[i] && ok(i) ? topOf(i) : null).filter(Boolean))].sort((a, b) => rank_(a) - rank_(b) || a.localeCompare(b));
      for (const top of tops) {
        const ids = []; for (let i=0;i<n;i++) if (vis[i] && ok(i) && topOf(i) === top) ids.push(i);
        if (!ids.length) continue; section(top);
        if (shelfSort !== "call") { if (top === "Root / +") { sorted(ids.filter(i => N[i].ace === "(root)")); sorted(ids.filter(i => N[i].ace !== "(root)")); } else sorted(ids); continue; }   // root notes always lead
        if (top === "Root / +") { ids.sort((a, b) => (N[b].ace === "(root)") - (N[a].ace === "(root)") || (isNaN(TV[a]) ? -Infinity : TV[a]) - (isNaN(TV[b]) ? -Infinity : TV[b])); for (const i of ids) put(i, N[i].level === 1); continue; }   // root notes first, then the inbox by date; unlinked notes lean
        const key = i => { const m = G.map[i], hb = G.hub[i]; return [hb >= 0 ? hubRank.get(hb) ?? 999 : 999, m >= 0 ? mapRank.get(m) : 1e6, m === i ? -1 : 0, isNaN(TV[i]) ? 0 : TV[i]]; };
        const shelved = ids.filter(i => G.map[i] >= 0).sort((a, b) => { const p = key(a), q = key(b); for (let j = 0; j < 4; j++) if (p[j] !== q[j]) return p[j] - q[j]; return 0; });
        const loose = ids.filter(i => G.map[i] < 0).sort((a, b) => (TV[a] || 0) - (TV[b] || 0));
        let lastMap = -2, hubN = 0, mapN = 0, noteN = 0, lastHub = -2;
        for (const i of shelved) { const m = G.map[i], hb = G.hub[i];
          if (hb !== lastHub) { lastHub = hb; hubN++; mapN = 0; }
          if (m !== lastMap) { lastMap = m; mapN++; noteN = 0; x += 4; index.push({sec: top, call: `${hubN}.${mapN}`, hubN, hub: hb, m, n: 0}); }
          index[index.length - 1].n++;
          if (index[index.length - 1].n === 1) {   // the run's first book
            if (m !== i) { const gw = width(m), gh = height(m); if (x + gw > x0 + SB.W) { row++; x = x0; } ghosts.push({m, x, w: gw, h: gh, by: baseY(row)}); calls.push({x, y: baseY(row), t: `${hubN}.${mapN}`, i: m}); x += gw + .6; used = true; put(i); continue; }   // the map lives on another shelf: a ghost of it starts the run
            put(i); calls.push({x: RX[i], y: RY[i] + RH[i], t: `${hubN}.${mapN}`, i}); continue; }
          noteN++; put(i); }
        if (loose.length) { x += 10; for (const i of loose) put(i, true); }
      }
    } else {
      const groups = [["Calendar", i => !ARCH[i] && N[i].ace === "Calendar"], ["Efforts", i => !ARCH[i] && N[i].ace === "Efforts"], ["x", i => !ARCH[i] && N[i].ace === "x"], ["Archive", i => !!ARCH[i]]];
      for (const [label, f] of groups) { const ids = []; for (let i=0;i<n;i++) if (vis[i] && f(i)) ids.push(i); if (!ids.length) continue;
        section(label); if (shelfSort !== "call") { sorted(ids); continue; } ids.sort((a, b) => (isNaN(TV[a]) ? -Infinity : TV[a]) - (isNaN(TV[b]) ? -Infinity : TV[b]));
        let lastY = null; for (const i of ids) { const y = isNaN(TV[i]) ? "?" : new Date(TV[i]).getUTCFullYear(); if (y !== lastY) { lastY = y; x += 6; put(i); calls.push({x: RX[i], y: RY[i] + RH[i], t: String(y), i}); continue; } put(i); } }
    }
    rows.push({bay, x0, n: row + 1, baseY});
  }
  for (const t of tapes) { const by = new Map(); for (const i of t.ids) { const b = Math.round(RY[i] + Math.abs(RH[i])), sg = by.get(b); if (sg) { sg.x0 = Math.min(sg.x0, RX[i]); sg.x1 = Math.max(sg.x1, RX[i] + RW[i]); sg.top = Math.min(sg.top, RY[i]); } else by.set(b, {x0: RX[i], x1: RX[i] + RW[i], top: RY[i], by: b}); } t.segs = [...by.values()]; }   // one stretch of tape per shelf the group spans
  shTape = -1; SHELF = {rows, secs, calls, ghosts, tapes, index}; if (!$("#callpanel").hidden) renderCallIndex(); expBounds(40); }
let shTape = -1;   // the subfolder tape under the pointer
dbg.__ivShelfMaps = () => { const r = []; for (let i=0;i<n;i++) if (RW[i] && VV(i) && N[i].level >= 3 && out[i].length + inn[i].length > 4) r.push([sx(RX[i] + RW[i]/2), sy(RY[i] + Math.abs(RH[i])*.6), out[i].length + inn[i].length]); return r; };
dbg.__ivTapes = () => (SHELF.tapes || []).map(t => ({label: t.label, n: t.ids.length, at: t.segs.map(g => [sx((g.x0 + g.x1)/2), sy(g.by) + 2])}));
function tapeAt(px, py){ if (view !== "shelf" || !SHELF.tapes) return -1; const x = wx(px), y = wy(py);
  for (let j = 0; j < SHELF.tapes.length; j++) for (const g of SHELF.tapes[j].segs) if (x >= g.x0 - 1 && x <= g.x1 + 1 && y >= g.by - 1 && y <= g.by + SB.board*.8 + 3/k) return j;
  return -1; }
function tapeTip(j){ const t = SHELF.tapes[j]; return `<b>${esc(t.label)}</b><span>${t.ids.length.toLocaleString()} note${t.ids.length === 1 ? "" : "s"} · ${esc(N[t.ids[0]].ace === "(root)" ? "Root" : N[t.ids[0]].ace)}</span>`; }
EXP.shelf = {
  layout: layoutShelf, pick: (x, y) => rectPick(x, y), spinePick: true,
  guides(){ ctx.fillStyle = css.panel; ctx.strokeStyle = css.line;
    for (const r of SHELF.rows) { const top = sy(0) - 6*k, x0 = sx(r.x0 - 10), w = (SB.W + 20)*k, bot = sy(r.baseY(r.n - 1) + SB.board);
      ctx.globalAlpha = .55; ctx.fillRect(x0, top, w, bot - top); ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.strokeRect(x0, top, w, bot - top);
      ctx.fillStyle = css.line; for (let j = 0; j < r.n; j++) { const y = sy(r.baseY(j)); ctx.fillRect(x0, y, w, Math.max(1.5, SB.board*k*.6)); } ctx.fillStyle = css.panel; } },
  notes(lit, dim){
    const ws = k;
    for (const g of SHELF.ghosts || []) { const x = sx(g.x), w = Math.max(.6, g.w*k), h = g.h*k, by = sy(g.by); if (x > W + 10 || x + w < -10 || by < -10 || by - h > H + 10) continue;   // ghost bookends: the map that holds this run lives on another shelf
      ctx.globalAlpha = .55; ctx.strokeStyle = GRAD[Math.max(3, N[g.m].level)][0]; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(x + .5, by - h + .5, w - 1, h - 1); ctx.setLineDash([]);
      if (w >= 9 && h > 40) { ctx.save(); ctx.translate(x + w/2, by - 4); ctx.rotate(-Math.PI/2); ctx.fillStyle = css.muted; ctx.font = `italic 500 ${Math.min(11, w*.7)}px ${css.body}`; ctx.textBaseline = "middle"; let t = "→ " + N[g.m].title; const mw = h - 10; while (t.length > 4 && ctx.measureText(t).width > mw) t = t.slice(0, -2); ctx.fillText(t, 0, 0); ctx.restore(); } }
    ctx.globalAlpha = 1;
    for (let i=0;i<n;i++) { if (!RW[i] || !VV(i)) continue; const x = sx(RX[i]), w = Math.max(.6, RW[i]*ws), h = Math.abs(RH[i])*k, by = sy(RY[i] + Math.abs(RH[i]));
      if (x > W + 10 || x + w < -10 || by < -10 || by - h > H + 10) continue;
      const d = N[i], HI = shelfHi.length ? shelfHiMap() : null, hc = HI && HI.get(i); ctx.globalAlpha = (lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .22 : .7) : 1)*(HI && !hc ? .3 : 1);
      ctx.fillStyle = hc ? hc : d.level >= 3 ? lvFill(i, x, by - h, Math.max(w, h)) : hexHsl(aceHue(d), (hash(d.sub || d.ace, 3) - .5)*.2 + (hash(d.path, 5) - .5)*.12 - (d.level === 1 ? .08 : 0), d.level === 1 ? -.25 : 0);
      if (RH[i] < 0) { ctx.save(); ctx.translate(x, by); ctx.rotate(.22); ctx.fillRect(0, -h, w, h); ctx.restore(); continue; }   // unlinked: leaning
      ctx.fillRect(x, by - h, w, h);
      if (w >= 3) { const ga = ctx.globalAlpha;   // dust on books untouched for two years; worn spines on books you keep coming back to
        const idle = d.mt ? (Date.now() - d.mt)/YEAR : 0, used = inn[i].length;
        if (idle > 2) { ctx.globalAlpha = ga*Math.min(.55, .15 + .1*(idle - 2)); ctx.fillStyle = "#cfc6b4"; ctx.fillRect(x, by - h, w, Math.max(1.2, Math.min(4, h*.035)));
          for (let q = 0; q < 3; q++) { const hx = hash(d.path, 131 + q); ctx.fillRect(x + hx*(w - 1), by - h + h*(.05 + .25*hash(d.path, 137 + q)), 1, 1); } }
        if (used >= 8) { ctx.globalAlpha = ga*Math.min(.45, .12 + used/120); ctx.fillStyle = "#fff"; ctx.fillRect(x + w*.15, by - h*.55, Math.max(.8, w*.12), h*.22); ctx.fillRect(x + w*.72, by - h*.3, Math.max(.8, w*.08), h*.12); }
        ctx.globalAlpha = ga; }
      if (d.level >= 3 && w > 1.5) { ctx.fillStyle = css.ink; ctx.globalAlpha *= .8; ctx.fillRect(x - 2*k, by - h*.55, Math.max(1, 1.6*k), h*.55); }   // the bookend
      if (w >= 9 && h > 40) { ctx.save(); ctx.translate(x + w/2, by - 4); ctx.rotate(-Math.PI/2); ctx.fillStyle = d.level >= 3 ? "#1a1a1a" : css.ink; ctx.globalAlpha = .9;
        ctx.font = `500 ${Math.min(11, w*.7)}px ${css.body}`; ctx.textBaseline = "middle"; let t = d.title; const mw = h - 10; while (t.length > 3 && ctx.measureText(t).width > mw) t = t.slice(0, -2); if (t !== d.title) t += "…"; ctx.fillText(t, 0, 0); ctx.restore(); } }
    ctx.globalAlpha = 1;
    const hl = sel >= 0 ? sel : hover;   // the nodes the link lines end in, sitting on top of the spines
    if (lit && hl >= 0) for (const j of lit) { if (!RW[j] || !VV(j)) continue; const x = sx(EX[j]), y = sy(EY[j]); if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
      const up = N[j].level > N[hl].level || (N[j].level === N[hl].level && Y[j] < Y[hl]);
      ctx.fillStyle = j === hl ? css.ink : edgeColor(hl, j, up); ctx.strokeStyle = css.bg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, j === hl ? 4 : 3, 0, 6.2832); ctx.fill(); ctx.stroke(); }
    const th = Math.max(3, SB.board*k*.8);   // Subfolder: gray label tape along the shelf edge, with the name printed when there's room
    (SHELF.tapes || []).forEach((t, j) => { const on = j === shTape;
      for (const g of t.segs) { const x = sx(g.x0), w = (g.x1 - g.x0)*k, y = sy(g.by); if (x > W + 10 || x + w < -10 || y < -20 || y > H + 20) continue;
        ctx.globalAlpha = on ? 1 : .75; ctx.fillStyle = css.muted; ctx.fillRect(x, y + .5, w, th);
        if (on) { ctx.globalAlpha = .9; ctx.strokeStyle = css.accent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); const tp = sy(g.top) - 4; ctx.strokeRect(x - 3, tp, w + 6, y - tp + th + 2); ctx.setLineDash([]); }
        if (th >= 8 && w > 24) { ctx.globalAlpha = 1; ctx.fillStyle = css.bg; ctx.font = `600 ${Math.min(10, th - 1)}px ${css.mono}`; ctx.textBaseline = "middle"; let s_ = t.label; while (s_.length > 2 && ctx.measureText(s_).width > w - 8) s_ = s_.slice(0, -2); if (s_ !== t.label) s_ += "…"; if (ctx.measureText(s_).width <= w - 6) ctx.fillText(s_, x + 4, y + .5 + th/2); } } });
    ctx.globalAlpha = 1; },
  labels(){ ctx.textBaseline = "alphabetic"; ctx.lineWidth = 4; ctx.strokeStyle = css.bg;
    for (const s of SHELF.secs) { const x = sx(s.x), y = sy(s.y); if (y < -20 || y > H + 20) continue; ctx.font = `600 ${k > .8 ? 12 : 10}px ${css.mono}`; ctx.fillStyle = css.accent; const t = s.label.toUpperCase(); ctx.strokeText(t, x + 2, y); ctx.fillText(t, x + 2, y); }
    if (k > 1.6) { ctx.font = `500 9.5px ${css.mono}`; ctx.fillStyle = css.muted; for (const c of SHELF.calls) { const x = sx(c.x), y = sy(c.y) + 11; if (x < -20 || x > W || y < 0 || y > H + 12) continue; ctx.strokeText(c.t, x, y); ctx.fillText(c.t, x, y); } } },
  ownLabels: true,
  about: [
    "Call numbers (hub.map). Every note belongs to the Level 5 hub it reaches in the fewest links, and to the map (Level 3 or higher) it reaches in the fewest links. 2.18 is the second hub's 18th map. Hubs and maps are numbered by score.",
    "Runs. A run is the notes one map gathers, in the order they were created. The map's own tall spine starts its run, with a thin bookend before it. When the map lives in another folder, a dashed ghost spine (→ its name) starts the run instead.",
    "Spines. Height is the Idea Emergence level: hubs and maps stand tallest and wear their level colors; linked notes are shorter. Width is word count. Unlinked notes lean at the end of each section.",
    "Sections. Each top folder has its own section: Root and + on the top shelf, then Atlas and the rest on the left; Calendar, Efforts and x on the right.",
    "Shelve by (under Layout): Call no., A–Z, Created, Modified or Subfolder. The others ignore maps and mark each new letter or year. Subfolder runs a label tape along the shelf edge under each group; hover the tape to outline the group.",
    "Light up areas and projects: open Efforts and pick any. Each one and every note linked to it glows in its own color; the rest of the shelf dims.",
    "Dust and wear. Books you haven't changed in over two years gather dust along the top; books that many notes link to show worn patches on the spine.",
  ],
  legend: "Bookshelf: every note as a book, shelved by your own call numbers. Tall spines are maps and hubs; unlinked notes lean.",
};

// ---------- Tree: Home is the trunk, the hubs and maps branch from it, notes are leaves ----------
// Every note hangs from the path it reaches Home by in the fewest links. Leaves are colored by age: new growth green,
// older notes turning to autumn. Notes Home never reaches are fallen leaves on the ground.
const TR = {trunk: 130, step: 110, span: [-Math.PI*.93, -Math.PI*.07]};
let TREE = {root: -1, par: null, kids: null, w: null, depth: null};
function layoutTree(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0;
  let root = -1, best = -1; for (let i=0;i<n;i++) if (vis[i] && N[i].home && !ARCH[i]) { const s_ = out[i].length + inn[i].length; if (s_ > best) { best = s_; root = i; } }
  if (root < 0) { const c = []; for (let i=0;i<n;i++) if (vis[i] && !ARCH[i]) c.push(i); c.sort(byRank); root = c.length ? c[0] : -1; }
  if (root < 0) { expBounds(10); return; }
  // breadth-first from Home, preferring higher levels first so maps carry the branches
  const par = new Int32Array(n).fill(-2), depth = new Int32Array(n).fill(-1); par[root] = -1; depth[root] = 0; let q = [root];
  while (q.length) { const nq = []; q.sort(byRank); for (const i of q) for (const j of UND(i)) { if (par[j] !== -2 || !vis[j] || ARCH[j]) continue; par[j] = i; depth[j] = depth[i] + 1; nq.push(j); } q = nq; }
  const kids = Array.from({length: n}, () => []); for (let i=0;i<n;i++) if (par[i] >= 0) kids[par[i]].push(i);
  for (const ks of kids) ks.sort((a, b) => (TV[a] || 0) - (TV[b] || 0));
  const w = new Float64Array(n); const post = []; { const st = [root]; while (st.length) { const i = st.pop(); post.push(i); for (const j of kids[i]) st.push(j); } }
  for (let p = post.length - 1; p >= 0; p--) { const i = post[p]; w[i] = kids[i].length ? kids[i].reduce((s_, j) => s_ + w[j], 0) + .4 : 1; }
  // angles: each subtree gets a share of the canopy by its weight
  const A0 = new Float64Array(n), A1 = new Float64Array(n); A0[root] = TR.span[0]; A1[root] = TR.span[1];
  for (const i of post) { let a = A0[i]; const tot = kids[i].reduce((s_, j) => s_ + w[j], 0) || 1; for (const j of kids[i]) { A0[j] = a; a += (A1[i] - A0[i])*w[j]/tot; A1[j] = a; } }
  const maxD = Math.max(1, ...post.map(i => depth[i]));
  // a parent with many leaves sets them in a few staggered rows instead of one dense arc
  const row = new Float64Array(n); for (let i=0;i<n;i++) { const ks = kids[i]; if (!ks.length) continue; const lv = ks.filter(j => !kids[j].length), R = Math.max(1, Math.min(5, Math.round(Math.sqrt(lv.length) / 3)));
    lv.forEach((j, q) => { row[j] = (q % R) / Math.max(1, R - 1 || 1) * (R > 1 ? 1 : 0); }); }
  for (let i=0;i<n;i++) {
    if (i === root) { EX[i] = 0; EY[i] = -TR.trunk; continue; }
    if (par[i] >= 0) { const a = (A0[i] + A1[i])/2, r = TR.step*Math.pow(depth[i], .85)*(5/Math.max(5, maxD))*1.6 + (kids[i].length ? 0 : 30*hash(N[i].path, 43) + 150*row[i]);
      EX[i] = Math.cos(a)*r*1.25; EY[i] = -TR.trunk + Math.sin(a)*r; continue; }
    const h1 = hash(N[i].path, 47), h2 = hash(N[i].path, 53);   // fallen leaves
    EX[i] = (h1 - .5)*TR.step*9; EY[i] = 30 + h2*90; }
  TREE = {root, par, kids, w, depth}; expBounds(60); }
// the path from a note back to the root, through each note it hangs from
let TREE_CH = new Set();
const treeChain = i => { const out_ = []; if (i < 0 || !TREE.par || TREE.par[i] === -2) return out_; let g = 0; while (i >= 0 && g++ < 200) { out_.push(i); i = TREE.par[i]; } return out_; };
const leafCol = i => { const t = TV[i]; if (isNaN(t)) return "hsl(40,25%,45%)"; const y = (T1 - t)/YEAR; const hue = y < 1 ? 110 : y < 2 ? 90 : y < 4 ? 55 : y < 7 ? 32 : 18, l = y < 1 ? 52 : y < 4 ? 50 : 42; return `hsl(${hue},${y > 7 ? 35 : 55}%,${l}%)`; };
EXP.tree = {
  layout: layoutTree,
  guides(){ const {root, par, w} = TREE; if (root < 0) return;
    ctx.fillStyle = css["band-a"] || css.panel; ctx.fillRect(0, sy(0), W, H - sy(0));   // the ground
    ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(W, sy(0)); ctx.stroke();
    const bark = css.muted; ctx.strokeStyle = bark; ctx.lineCap = "round"; const hl0 = sel >= 0 ? sel : hover, dimT = treeChain(hl0).length > 1 ? .28 : 1;
    // the trunk
    const tw = Math.max(2, Math.min(26, Math.sqrt(w[root])*.5*k)); ctx.lineWidth = tw; ctx.globalAlpha = .75; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.quadraticCurveTo(sx(-20), sy(-TR.trunk*.5), sx(0), sy(-TR.trunk)); ctx.stroke();
    for (let i=0;i<n;i++) { const p = par[i]; if (p < 0 || !VV(i)) continue; const x1 = sx(EX[p]), y1 = sy(EY[p]), x2 = sx(EX[i]), y2 = sy(EY[i]);
      if ((x1 < -50 && x2 < -50) || (x1 > W + 50 && x2 > W + 50) || (y1 < -50 && y2 < -50) || (y1 > H + 50 && y2 > H + 50)) continue;
      ctx.lineWidth = Math.max(.5, Math.min(tw*.6, Math.sqrt(w[i])*.42*k)); ctx.globalAlpha = (TREE.kids[i].length ? .42 : Math.max(.05, Math.min(.2, .05 + .1*k))) * dimT;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(x1 + (x2 - x1)*.15, y1 + (y2 - y1)*.75, x2, y2); ctx.stroke(); }
    // the picked note's way home: every branch from it back down to the trunk, lit, like degrees of separation
    const hl = sel >= 0 ? sel : hover, chain = treeChain(hl);
    if (chain.length > 1) { ctx.lineCap = "round";
      for (const [col, lw, al] of [[css.bg, 7, .7], [css.accent, 3.2, .95]]) { ctx.strokeStyle = col; ctx.globalAlpha = al * (sel >= 0 ? 1 : .7); ctx.lineWidth = lw; ctx.beginPath();
        for (let q = 0; q < chain.length - 1; q++) { const i = chain[q], p = chain[q + 1], x1 = sx(EX[p]), y1 = sy(EY[p]), x2 = sx(EX[i]), y2 = sy(EY[i]); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(x1 + (x2 - x1)*.15, y1 + (y2 - y1)*.75, x2, y2); }
        ctx.moveTo(sx(0), sy(-TR.trunk)); ctx.quadraticCurveTo(sx(-20), sy(-TR.trunk*.5), sx(0), sy(0)); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = css.accent; ctx.strokeStyle = css.bg; ctx.lineWidth = 2;
      for (const i of chain) { ctx.beginPath(); ctx.arc(sx(EX[i]), sy(EY[i]), i === hl ? 5.5 : 4, 0, 6.2832); ctx.fill(); ctx.stroke(); }
      // how far it is from the root
      const d = chain.length - 1, t = `${d} ${d === 1 ? "link" : "links"} from ${N[chain[chain.length - 1]].title}`; ctx.font = `600 11px ${css.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const x = sx(EX[hl]) + 12, y = sy(EY[hl]) - 16, tw = ctx.measureText(t).width; ctx.globalAlpha = .9; ctx.fillStyle = css.bg; ctx.fillRect(x - 4, y - 9, tw + 8, 18); ctx.globalAlpha = 1; ctx.fillStyle = css.accent; ctx.fillText(t, x, y); ctx.textBaseline = "alphabetic"; }
    ctx.globalAlpha = 1; ctx.lineCap = "butt"; },
  notes(lit, dim){ const r0 = Math.max(1.2, 2.2*Math.pow(k, .55)); TREE_CH = new Set(treeChain(sel >= 0 ? sel : hover));
    for (let i=0;i<n;i++) { if (!VV(i)) continue; const x = sx(EX[i]), y = sy(EY[i]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const onWay = TREE_CH.has(i); ctx.globalAlpha = onWay ? 1 : TREE_CH.size > 1 ? (lit && lit.has(i) ? .55 : .1) : lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .2 : .65) : 1; const lv = N[i].level;
      if (lv >= 3) { const r = rad(i); ctx.fillStyle = lvFill(i, x, y, r); ctx.beginPath(); shape(lv, x, y, r); ctx.fill(); continue; }
      const fallen = TREE.par[i] === -2, a = hash(N[i].path, 59)*Math.PI; ctx.fillStyle = fallen ? "hsl(28,30%,38%)" : leafCol(i);
      ctx.beginPath(); ctx.ellipse(x, y, r0*1.5, r0*.8, fallen ? 0 : a, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1; },
  mustLabel: () => { const m = TREE.root >= 0 && VV(TREE.root) ? [TREE.root] : []; const c = treeChain(sel >= 0 ? sel : hover); for (const i of c) if (VV(i)) m.push(i); return m; },
  legend: "Tree: Home is the trunk; every note hangs from the path it reaches Home by in the fewest links, so hubs and maps carry the branches. Click any leaf to light its way home, branch by branch, with how many links it takes. Leaves show age: new growth green, older notes turning to autumn. Notes Home never reaches lie fallen on the ground.",
};

// Maps that fill the whole plane with shapes (Treemap) would hide the link lines drawn beneath them, so they draw them again on top
function overLinks(lit){
  if (focus >= 0 && !showAll) { ctx.strokeStyle = css.muted; ctx.globalAlpha = .3; ctx.lineWidth = 1; ctx.beginPath();
    for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; ctx.moveTo(sx(X[a]), sy(Y[a])); ctx.lineTo(sx(X[b]), sy(Y[b])); } ctx.stroke(); }
  let hl = sel >= 0 ? sel : hover;
  if (hl < 0 && focus >= 0 && VV(focus)) { hl = focus; lit = new Set([focus, ...out[focus], ...inn[focus]].filter(j => VV(j))); }   // in focus mode the focused note's own links stand out
  if (!lit || hl < 0) { ctx.globalAlpha = 1; return; }
  const ends = [];
  for (const j of lit) { if (j === hl || !VV(j)) continue; const up = N[j].level > N[hl].level || (N[j].level === N[hl].level && Y[j] < Y[hl]), c = edgeColor(hl, j, up); ends.push([j, c]);
    const x1 = sx(X[hl]), y1 = sy(Y[hl]), x2 = sx(X[j]), y2 = sy(Y[j]), mx = (x1+x2)/2, my = (y1+y2)/2 - Math.abs(x2-x1)*.12;
    ctx.strokeStyle = css.bg; ctx.globalAlpha = .55; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();   // a dark casing keeps the line readable over bright boxes
    ctx.strokeStyle = c; ctx.globalAlpha = .95; ctx.lineWidth = sel >= 0 ? 1.6 : 1.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = css.bg;
  for (const [j, c] of ends) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx(X[j]), sy(Y[j]), 3.2, 0, 6.2832); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = css.ink; ctx.beginPath(); ctx.arc(sx(X[hl]), sy(Y[hl]), 4.5, 0, 6.2832); ctx.fill(); ctx.stroke(); }

// ---------- Treemap: every folder and note as a rectangle, sized by its score (after GrandPerspective) ----------
const TM = {W: 3200, H: 1800, pad: 6};
let TMBOX = [];   // folder and subfolder boxes, for their names
let tmSubs = pref("iv-tmsubs", false) === true;   // Treemap: show subfolder boxes and names
function squarify(items, x, y, w, h, place){   // items: [{v, …}] sorted by v desc; place(item, x, y, w, h)
  const tot = items.reduce((s_, it) => s_ + it.v, 0); if (!tot || w <= 0 || h <= 0) return;
  const sc = w*h/tot; let i0 = 0;
  while (i0 < items.length) { const short = Math.min(w, h); let row = [], rs = 0, worst = Infinity;
    for (let j = i0; j < items.length; j++) { const a = items[j].v*sc, nrs = rs + a, mx = Math.max(...row.map(it => it.v*sc), a), mn = Math.min(...row.map(it => it.v*sc), a);
      const wst = Math.max(short*short*mx/(nrs*nrs), nrs*nrs/(short*short*mn)); if (wst > worst && row.length) break; row.push(items[j]); rs = nrs; worst = wst; }
    const thick = rs/short; let off = 0;
    for (const it of row) { const len = it.v*sc/thick; if (w >= h) place(it, x, y + off, thick, len); else place(it, x + off, y, len, thick); off += len; }
    if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; } i0 += row.length; } }
function layoutTreemap(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0; TMBOX = [];
  const val = i => .35 + N[i].score;
  const tops = new Map(); for (let i=0;i<n;i++) { if (!vis[i]) continue; const t = ARCH[i] ? "Archive" : N[i].ace === "(root)" ? "Root" : N[i].ace, s_ = ARCH[i] ? "Archive" : N[i].sub || t;
    if (!tops.has(t)) tops.set(t, new Map()); const m = tops.get(t); if (!m.has(s_)) m.set(s_, []); m.get(s_).push(i); }
  const T = [...tops].map(([t, subs]) => ({t, subs, v: [...subs.values()].flat().reduce((s_, i) => s_ + val(i), 0)})).sort((a, b) => b.v - a.v);
  squarify(T, 0, 0, TM.W, TM.H, (tt, x, y, w, h) => { TMBOX.push({name: tt.t, x, y, w, h, lv: 0});
    const p = TM.pad, S = [...tt.subs].map(([s_, ids]) => ({s: s_, ids, v: ids.reduce((a, i) => a + val(i), 0)})).sort((a, b) => b.v - a.v);
    squarify(S, x + p, y + p + 14, w - 2*p, h - 2*p - 14, (ss, x2, y2, w2, h2) => { if (S.length > 1) TMBOX.push({name: ss.s.split("/").pop(), x: x2, y: y2, w: w2, h: h2, lv: 1});
      const q = S.length > 1 ? 2 : 0, items = ss.ids.map(i => ({i, v: val(i)})).sort((a, b) => b.v - a.v);
      squarify(items, x2 + q, y2 + q, w2 - 2*q, h2 - 2*q, (it, x3, y3, w3, h3) => { const i = it.i; RX[i] = x3; RY[i] = y3; RW[i] = w3; RH[i] = h3; EX[i] = x3 + w3/2; EY[i] = y3 + h3/2; }); }); });
  expBounds(20); }
EXP.treemap = {
  layout: layoutTreemap, pick: (x, y) => rectPick(x, y),
  notes(lit, dim){
    for (let i=0;i<n;i++) { if (!RW[i] || !VV(i)) continue; const x = sx(RX[i]), y = sy(RY[i]), w = RW[i]*k, h = RH[i]*k; if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      ctx.globalAlpha = lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .25 : .7) : 1; const d = N[i];
      if (w < 2.5 || h < 2.5) { ctx.fillStyle = d.level >= 3 ? GRAD[d.level][0] : hexHsl(aceHue(d), -.05, 0); ctx.fillRect(x, y, Math.max(.6, w), Math.max(.6, h)); continue; }
      const g = ctx.createLinearGradient(x, y, x + w, y + h);   // the GrandPerspective cushion: light top-left, dark bottom-right
      if (d.level >= 3) { g.addColorStop(0, GRAD[d.level][0]); g.addColorStop(1, GRAD[d.level][1]); }
      else { const base = aceHue(d), sh = (hash(d.path, 61) - .5)*.12; g.addColorStop(0, hexHsl(base, .18 + sh, 0)); g.addColorStop(1, hexHsl(base, -.22 + sh, d.level === 1 ? -.35 : 0)); }
      ctx.fillStyle = g; ctx.fillRect(x + .5, y + .5, w - 1, h - 1);
      if (w > 70 && h > 16) { ctx.fillStyle = d.level >= 3 ? "#111" : "rgba(0,0,0,.72)"; ctx.font = `500 ${Math.min(13, h*.45)}px ${css.body}`; ctx.textBaseline = "top"; let t = d.title; while (t.length > 3 && ctx.measureText(t).width > w - 8) t = t.slice(0, -2); if (t !== d.title) t += "…"; ctx.fillText(t, x + 4, y + 3); } }
    ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"; overLinks(lit); },
  labels(){ ctx.textBaseline = "top";
    const tag = (t, x, y, f, th, bold) => { ctx.font = f; const tw = ctx.measureText(t).width; ctx.globalAlpha = .82; ctx.fillStyle = css.bg; ctx.fillRect(x, y, tw + 8, th); ctx.globalAlpha = bold ? 1 : .92; ctx.fillStyle = css.ink; ctx.fillText(t, x + 4, y + (th - parseFloat(f.split(" ")[1]))/2); ctx.globalAlpha = 1; };
    const tops = TMBOX.filter(b => b.lv === 0);
    if (tmSubs) for (const b of TMBOX) { if (b.lv !== 1) continue;   // subfolders: a thin outline and a small name tag, quieter than the top folders
      const x = sx(b.x), y = sy(b.y), w = b.w*k, h = b.h*k; if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      ctx.strokeStyle = css.bg; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
      const fs = k > 1.2 ? 11 : 9.5, th = fs + 4, f = `500 ${fs}px ${css.body}`; ctx.font = f;
      const top = tops.find(t => b.x >= t.x - 1 && b.x <= t.x + t.w && b.y >= t.y - 1 && b.y <= t.y + t.h);
      const tx_ = Math.max(x, 2), ty_ = Math.max(y, 2) + (top && Math.abs(sy(top.y) - y) < 22 && Math.abs(sx(top.x) - x) < 140 ? 18 : 0);   // stay in view; step below the top folder's name
      const room = Math.min(x + w, W) - tx_ - 12; if (room < 24 || Math.min(y + h, H) - ty_ < th + 2) continue;
      let t = b.name; while (t.length > 3 && ctx.measureText(t).width > room) t = t.slice(0, -2); if (t !== b.name) t += "…"; tag(t, tx_ + 3, ty_ + 3, f, th, false); }
    for (const b of tops) { const x = sx(b.x), y = sy(b.y), w = b.w*k; if (w < 50 || x > W || y > H) continue;   // top folders: outlined, and named last so they sit above everything
      ctx.strokeStyle = css.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, b.h*k);
      const t = b.name.toUpperCase(), f = `600 12px ${css.mono}`;
      if (tmSubs) tag(t, Math.max(x, 2) + 2, Math.max(y, 2) + 2, f, 16, true);
      else { ctx.font = f; ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.fillStyle = css.ink; ctx.strokeText(t, x + 5, y + 3); ctx.fillText(t, x + 5, y + 3); } }
    ctx.textBaseline = "alphabetic"; },
  ownLabels: true,
  legend: "Treemap: every top folder, subfolder and note as a rectangle, its area set by its link score, after GrandPerspective. Maps and hubs wear their level colors; unlinked notes are the dull slivers. Layout → Subfolders outlines and names each subfolder.",
};

// ---------- Skyline: your vault as a city. Each top folder is a district, each map a tower ----------
// A tower's height is its score; its footprint is how many notes it gathers. Its notes are its windows (lit if recent).
// Notes no map reaches are low houses on the district's edge; unlinked notes are empty lots.
const ISO = {c: Math.cos(Math.PI/6), s: Math.sin(Math.PI/6)};
const iso = (gx, gy, z) => [(gx - gy)*ISO.c, (gx + gy)*ISO.s - z];
let CITY = {blds: [], districts: []};
function layoutSkyline(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0;
  const G = mapGroups(() => true), members = new Map(G.maps.map(m => [m, []]));
  for (let i=0;i<n;i++) if (vis[i] && G.map[i] >= 0 && G.map[i] !== i) members.get(G.map[i]).push(i);
  const dist = new Map(); const dkey = i => ARCH[i] ? "Archive" : N[i].ace === "(root)" ? "Root" : N[i].ace;
  for (const m of G.maps) { const d = dkey(m); if (!dist.has(d)) dist.set(d, {name: d, blds: [], lots: [], houses: []}); dist.get(d).blds.push(m); }
  for (let i=0;i<n;i++) { if (!vis[i] || G.map[i] >= 0) continue; const d = dkey(i); if (!dist.has(d)) dist.set(d, {name: d, blds: [], lots: [], houses: []}); (N[i].level === 1 ? dist.get(d).lots : dist.get(d).houses).push(i); }
  const order = ["+", "Atlas", "Calendar", "Efforts", "x"], D_ = [...dist.values()].sort((a, b) => ((order.indexOf(a.name) + 1) || 9) - ((order.indexOf(b.name) + 1) || 9) || a.name.localeCompare(b.name));
  const blds = []; let gx0 = 0;
  for (const d of D_) {
    const items = d.blds.map(m => ({m, f: 16 + 5*Math.sqrt(members.get(m).length), h: 30 + Math.pow(N[m].score, 1.25)*22*(N[m].level === 5 ? 1.5 : 1)})).sort((a, b) => b.h - a.h);
    const area = items.reduce((s_, it) => s_ + (it.f + 10)**2, 0) + (d.houses.length + d.lots.length)*36, side = Math.max(160, Math.sqrt(area)*1.15);
    // the tallest towers downtown (the middle of the district), the rest spiral out
    // a grid of 6-unit cells, filled from the middle outward (a typed array, and a pointer past the filled middle, keep this fast on big vaults)
    const step = 6, Gn = Math.ceil(side/step), grid = new Uint8Array(Gn*Gn), dd = new Float32Array(Gn*Gn), cells = new Int32Array(Gn*Gn);
    for (let c = 0; c < Gn*Gn; c++) { cells[c] = c; dd[c] = Math.hypot(Math.floor(c/Gn)*step - side/2, (c % Gn)*step - side/2); } cells.sort((p, q) => dd[p] - dd[q]);
    const fits = (ix, iy, kf) => { if (ix + kf > Gn || iy + kf > Gn) return false; for (let u = 0; u < kf; u++) { const row = (ix + u)*Gn + iy; for (let v = 0; v < kf; v++) if (grid[row + v]) return false; } return true; };
    let ci = 0; const placeAt = f => { const kf = Math.ceil((f + 6)/step); while (ci < cells.length && grid[cells[ci]]) ci++;
      for (let t = ci; t < cells.length; t++) { const c = cells[t]; if (grid[c]) continue; const ix = Math.floor(c/Gn), iy = c % Gn; if (!fits(ix, iy, kf)) continue;
        for (let u = 0; u < kf; u++) grid.fill(1, (ix + u)*Gn + iy, (ix + u)*Gn + iy + kf); return [ix*step, iy*step]; }
      return [side, 0]; };
    for (const it of items) { const [a, b] = placeAt(it.f); blds.push({m: it.m, gx: gx0 + a, gy: b, f: it.f, h: it.h}); }
    const smalls = [...d.houses.map(i => [i, 8, 10]), ...d.lots.map(i => [i, 7, 0])];
    for (const [i, f, h] of smalls) { const [a, b] = placeAt(f); if (h) blds.push({m: i, gx: gx0 + a, gy: b, f, h, house: true}); else { const [x, y] = iso(gx0 + a + f/2, b + f/2, 0); EX[i] = x; EY[i] = y; RX[i] = gx0 + a; RY[i] = b; RW[i] = f; RH[i] = -1; } }
    d.gx = gx0; d.side = side; gx0 += side + 70; }
  for (const B of blds) { const [x, y] = iso(B.gx + B.f/2, B.gy + B.f/2, B.h); EX[B.m] = x; EY[B.m] = y;
    const ms = B.house ? [] : members.get(B.m), cols = Math.max(2, Math.round(B.f/7)), rows = Math.max(1, Math.ceil(ms.length/(cols*2)));
    ms.forEach((i, j) => { const face = j % 2, idx = j >> 1, c = idx % cols, r = Math.floor(idx/cols), zz = B.h*(1 - (r + .7)/(rows + .4)), u = (c + .5)/cols*B.f;
      const [wx_, wy_] = face ? iso(B.gx + B.f, B.gy + u, zz) : iso(B.gx + u, B.gy + B.f, zz); EX[i] = wx_; EY[i] = wy_; }); }
  blds.sort((a, b) => (a.gx + a.gy + a.f) - (b.gx + b.gy + b.f));
  CITY = {blds, districts: D_, isB: new Set(blds.map(B => B.m))}; expBounds(60); }
dbg.__ivCam = () => [Math.round(tx), Math.round(ty), +k.toFixed(3), +csYaw.toFixed(2)];
dbg.__ivTime = (fn) => { const t0 = performance.now(); if (fn === 'skyline') layoutSkyline(); else if (fn === 'draw') render(); return Math.round(performance.now() - t0); };
EXP.skyline = {
  layout: layoutSkyline,
  guides(){ for (const d of CITY.districts) { const P = [iso(d.gx, 0, 0), iso(d.gx + d.side, 0, 0), iso(d.gx + d.side, d.side, 0), iso(d.gx, d.side, 0)];
      ctx.fillStyle = css.panel; ctx.globalAlpha = .7; ctx.beginPath(); P.forEach((p, j) => j ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = css.line; ctx.stroke(); } },
  notes(lit, dim){
    const fade = i => lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .25 : .75) : 1;
    for (let i=0;i<n;i++) { if (RH[i] !== -1 || !VV(i)) continue; const P = [iso(RX[i], RY[i], 0), iso(RX[i] + RW[i], RY[i], 0), iso(RX[i] + RW[i], RY[i] + RW[i], 0), iso(RX[i], RY[i] + RW[i], 0)];   // empty lots
      ctx.globalAlpha = fade(i)*.6; ctx.strokeStyle = css.muted; ctx.setLineDash([2, 2]); ctx.beginPath(); P.forEach((p, j) => j ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
    for (const B of CITY.blds) { const i = B.m; if (!VV(i)) continue; const d = N[i], hue = aceHue(d), {gx, gy, f, h} = B;
      const p = (a, b, z) => { const q = iso(a, b, z); return [sx(q[0]), sy(q[1])]; }, poly = pts => { ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); };
      const top = p(gx + f/2, gy + f/2, h); if (top[0] < -200 || top[0] > W + 200 || top[1] > H + 200 || top[1] < -H) continue;
      ctx.globalAlpha = fade(i);
      ctx.fillStyle = hexHsl(hue, -.12, -.1); poly([p(gx, gy + f, 0), p(gx + f, gy + f, 0), p(gx + f, gy + f, h), p(gx, gy + f, h)]);   // left face
      ctx.fillStyle = hexHsl(hue, -.24, -.15); poly([p(gx + f, gy, 0), p(gx + f, gy + f, 0), p(gx + f, gy + f, h), p(gx + f, gy, h)]);   // right face
      ctx.fillStyle = d.level >= 3 ? GRAD[d.level][0] : hexHsl(hue, .1, 0); poly([p(gx, gy, h), p(gx + f, gy, h), p(gx + f, gy + f, h), p(gx, gy + f, h)]); }   // the roof wears its level color
    const now = T1, wz = Math.max(.8, 1.6*Math.pow(k, .5));
    for (let i=0;i<n;i++) { if (RW[i] || !VV(i) || N[i].level >= 3) continue; if (CITY.isB.has(i)) continue;
      const x = sx(EX[i]), y = sy(EY[i]); if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue; const recent = !isNaN(TV[i]) && now - TV[i] < 1.2*YEAR;
      ctx.globalAlpha = fade(i); ctx.fillStyle = recent ? "#ffd27a" : "rgba(255,240,200,.28)"; ctx.fillRect(x - wz/2, y - wz/2, wz, wz*1.3); }
    ctx.globalAlpha = 1; },
  labels(){ ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.textAlign = "center"; ctx.font = `600 13px ${css.mono}`; ctx.fillStyle = css.accent;
    for (const d of CITY.districts) { const q = iso(d.gx + d.side/2, d.side + 30, 0), x = sx(q[0]), y = sy(q[1]) + 16, t = rowName(d.name === "Root" ? "\u0000root" : d.name === "Archive" ? "\u0000arch" : d.name).toUpperCase(); ctx.strokeText(t, x, y); ctx.fillText(t, x, y); }
    ctx.textAlign = "left"; },
  legend: "Skyline: each top folder is a district, each map a tower. Height is its link score, footprint how many notes it gathers, and its notes are the windows (lit if from the last year). Notes no map reaches are low houses; unlinked notes are empty lots.",
};

// ---------- Linear: time drawn as lines ----------
const yOf = t => new Date(t).getUTCFullYear(), yStart = y => Date.UTC(y, 0, 1), yFrac = t => { const y = yOf(t); return (t - yStart(y))/(yStart(y + 1) - yStart(y)); };
function datedYears(){ let a = Infinity, b = -Infinity; for (let i=0;i<n;i++) if (vis[i] && !isNaN(TV[i])) { const y = yOf(TV[i]); if (y < a) a = y; if (y > b) b = y; } return isFinite(a) ? [a, b] : [NOW_Y, NOW_Y]; }
// Spiral and Lifeline show a range of years (Layout → from – to); every year by default
// Lifeline and Spiral each keep their own range: Lifeline defaults to the latest two years, Spiral to the latest three.
let LR = Array.isArray(pref("iv-llrange", null)) ? pref("iv-llrange", null) : null;
let LRS = Array.isArray(pref("iv-srange", null)) ? pref("iv-srange", null) : null;
function yearRange(){ const [a, b] = datedYears(), R = view === "spiral" ? (LRS || [b - 2, b]) : (LR || [b - 1, b]); const y0 = Math.max(a, Math.min(b, R[0])), y1 = Math.max(y0, Math.min(b, R[1])); return [y0, y1]; }
const inRange = (i, y0, y1) => { const y = yOf(TV[i]); return y >= y0 && y <= y1; };
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Linear Calendar: a year as twelve rows, one per month, each day a box; a month's first day sits under its own weekday,
// so the weeks line up down the page (the Year Map). The notes made that day fill its box.
let LCALL = pref("iv-lcall", false) === true, LCY = +pref("iv-lcyear", 0) || 0, LC = {years: [], C: 44};
const LC_GAP = 150;
function layoutLincal(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0;
  const [y0, y1] = datedYears(); if (!LCY || LCY < y0 || LCY > y1) LCY = Math.min(y1, NOW_Y);
  const years = LCALL ? Array.from({length: y1 - y0 + 1}, (_, j) => y0 + j) : [LCY], C = LC.C, H1 = 12*C + LC_GAP, cells = new Map();
  for (let i=0;i<n;i++) { if (!vis[i] || isNaN(TV[i])) { EHID[i] = 1; continue; } const d = new Date(TV[i]), y = d.getUTCFullYear(), yi = years.indexOf(y); if (yi < 0) { EHID[i] = 1; continue; }
    const key = yi*400 + d.getUTCMonth()*32 + d.getUTCDate(); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(i); }
  const col = (y, m, day) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7 + day - 1;   // weeks start on Monday
  for (const [key, ids] of cells) { const yi = Math.floor(key/400), m = Math.floor((key % 400)/32), day = key % 32, y = years[yi], cx = col(y, m, day)*C + C/2, cy = yi*H1 + m*C + C/2;
    ids.sort(byRank); const g = Math.ceil(Math.sqrt(ids.length)), st = Math.min(C*.26, C*.8/g);
    ids.forEach((i, j) => { const r = Math.floor(j/g), c = j % g; EX[i] = cx + (c - (g - 1)/2)*st; EY[i] = cy + (r - (g - 1)/2)*st; }); }
  LC = {years, C, H1, col};
  const last = years.length - 1; expBox = {x0: -90, y0: last*H1 - 70, x1: 37*C + 20, y1: last*H1 + 12*C + 20}; }   // fit to the latest year; the wheel scrolls back through the rest
EXP.lincal = {
  layout: layoutLincal,
  guides(){ const {years, C, H1, col} = LC, now = new Date();
    for (let yi = 0; yi < years.length; yi++) { const y = years[yi], top = yi*H1; if (sy(top + 12*C) < -40 || sy(top - 70) > H + 40) continue;
      ctx.fillStyle = css.panel; ctx.globalAlpha = .55; for (const wc of [5, 6, 12, 13, 19, 20, 26, 27, 33, 34]) ctx.fillRect(sx(wc*C), sy(top - 6), C*k, (12*C + 6)*k); ctx.globalAlpha = 1;   // weekend columns
      ctx.strokeStyle = css.line; ctx.lineWidth = 1;
      for (let m = 0; m < 12; m++) { const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        for (let d = 1; d <= days; d++) { const x = sx(col(y, m, d)*C) + 1.5, yy = sy(top + m*C) + 1.5, w = C*k - 3; ctx.globalAlpha = .7; ctx.strokeRect(x, yy, w, w);
          if (k*C > 30) { ctx.globalAlpha = .55; ctx.fillStyle = css.muted; ctx.font = `500 ${Math.min(10, C*k*.22)}px ${css.mono}`; ctx.textBaseline = "top"; ctx.fillText(String(d), x + 3, yy + 2); }
          if (y === now.getFullYear() && m === now.getMonth() && d === now.getDate()) { ctx.globalAlpha = 1; ctx.strokeStyle = css.accent; ctx.lineWidth = 2; ctx.strokeRect(x, yy, w, w); ctx.strokeStyle = css.line; ctx.lineWidth = 1; } } }
      ctx.globalAlpha = 1; ctx.textBaseline = "middle"; ctx.fillStyle = css.muted; ctx.font = `600 ${Math.max(9, Math.min(13, C*k*.32))}px ${css.mono}`; ctx.textAlign = "right";
      for (let m = 0; m < 12; m++) ctx.fillText(MON3[m].toUpperCase(), sx(-10), sy(top + m*C + C/2));
      ctx.textAlign = "center"; for (let c = 0; c < 37; c++) ctx.fillText("MTWTFSS"[c % 7], sx(c*C + C/2), sy(top - 16));
      ctx.textAlign = "left"; ctx.fillStyle = css.accent; ctx.font = `600 ${Math.max(14, Math.min(30, C*k*.7))}px ${css.mono}`; ctx.fillText(String(y), sx(0), sy(top - 46)); ctx.textBaseline = "alphabetic"; } },
  legend: "Linear Calendar: a year as twelve rows, one per month, each day a box, with the weeks lined up down the page. The notes you made that day fill its box: maps and hubs first, in their level colors. Layout → One year (‹ › to change it) or All years (the wheel scrolls through them; ⌘ + wheel zooms).",
};

// Spiral: time as one line winding outward, a turn a year, starting at 12 o'clock and running clockwise, so the same date
// lines up year after year. Maps and hubs sit on the line; the rest of each day's notes gather around it.
const SPI = {R0: 240, G: 150};
function layoutSpiral(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0; const [y0, y1r] = yearRange(); SPI.y0 = y0;
  for (let i=0;i<n;i++) { if (!vis[i] || isNaN(TV[i]) || !inRange(i, y0, y1r)) { EHID[i] = 1; continue; }
    const f = yFrac(TV[i]), t = yOf(TV[i]) - y0 + f, a = -Math.PI/2 + 2*Math.PI*f, lv = N[i].level, h = hash(N[i].path, 151) - .5;
    const off = lv >= 3 ? 0 : lv === 2 ? h*SPI.G*.42 : (h < 0 ? -1 : 1)*SPI.G*(.32 + .12*Math.abs(h));   // unlinked notes drift to the edges of their band
    const r = SPI.R0 + t*SPI.G + off; EX[i] = Math.cos(a)*r; EY[i] = Math.sin(a)*r; }
  const y1 = y1r, R1 = SPI.R0 + (y1 - y0 + 1)*SPI.G; SPI.y1 = y1; expBox = {x0: -R1 - 60, y0: -R1 - 60, x1: R1 + 60, y1: R1 + 60}; }
EXP.spiral = {
  layout: layoutSpiral,
  guides(){ const gd = sel >= 0 ? .5 : hover >= 0 ? .78 : 1, {R0, G, y0, y1} = SPI, turns = y1 - y0 + 1, R1 = R0 + turns*G;
    ctx.strokeStyle = css.line; ctx.globalAlpha = .45*gd; ctx.lineWidth = 1; ctx.beginPath();
    for (let m = 0; m < 12; m++) { const a = -Math.PI/2 + 2*Math.PI*m/12; ctx.moveTo(sx(Math.cos(a)*R0*.85), sy(Math.sin(a)*R0*.85)); ctx.lineTo(sx(Math.cos(a)*R1), sy(Math.sin(a)*R1)); } ctx.stroke();
    ctx.globalAlpha = .9*gd; ctx.strokeStyle = css.muted; ctx.lineWidth = 1.4; ctx.beginPath();   // the line of time
    for (let s_ = 0; s_ <= turns*360; s_++) { const t = s_/360, a = -Math.PI/2 + 2*Math.PI*t, r = R0 + t*G, x = sx(Math.cos(a)*r), y = sy(Math.sin(a)*r); s_ ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    const tn = (Date.now() - yStart(y0))/(365.2425*DAY); if (tn > 0 && tn < turns) { const a = -Math.PI/2 + 2*Math.PI*(tn % 1), r = R0 + tn*G; ctx.fillStyle = css.accent; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(sx(Math.cos(a)*r), sy(Math.sin(a)*r), 5, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `600 11px ${css.mono}`; ctx.fillStyle = css.muted;
    for (let m = 0; m < 12; m++) { const a = -Math.PI/2 + 2*Math.PI*(m + .5)/12; ctx.fillText(MON3[m].toUpperCase(), sx(Math.cos(a)*(R1 + 34)), sy(Math.sin(a)*(R1 + 34))); }
    ctx.fillStyle = css.accent; ctx.font = `600 12px ${css.mono}`; ctx.lineWidth = 4; ctx.strokeStyle = css.bg;
    for (let y = y0; y <= y1; y++) { const r = R0 + (y - y0)*G, x = sx(0), yy = sy(-r); ctx.strokeText(String(y), x, yy); ctx.fillText(String(y), x, yy); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; },
  legend: "Spiral: time as one line winding outward, a turn a year, starting at 12 o'clock and running clockwise, so each month lines up across the years. Maps and hubs sit on the line; linked notes gather around it, unlinked notes at the edges. The gold dot is today.",
};

// Lifeline: your whole ideaverse on one line, left to right. Each note stands on it like a mark on a seismograph:
// the higher its level, the taller its stem. Unlinked notes hang just below the line.
const LL = {pxYear: 900, base: 0};
function layoutLifeline(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0; const [y0, y1] = yearRange(); LL.y0 = y0; LL.y1 = y1;
  const f = Math.max(1, (y1 - y0 + 1)*LL.pxYear/2600), hgt = [0, -46, -120, -210, -290, -380].map(v => v*f); LL.f = f;   // stems grow with the span, so the line keeps its shape at any length
  for (let i=0;i<n;i++) { if (!vis[i] || isNaN(TV[i]) || !inRange(i, y0, y1)) { EHID[i] = 1; continue; } const lv = N[i].level, h = hash(N[i].path, 157);
    EX[i] = (yOf(TV[i]) - y0 + yFrac(TV[i]))*LL.pxYear; EY[i] = lv === 1 ? (26 + 30*h)*f : hgt[lv] - (lv === 2 ? 60*h : 30*h)*f; }
  expBox = {x0: -40, y0: -430*f, x1: (y1 - y0 + 1)*LL.pxYear + 40, y1: 110*f}; }
EXP.lifeline = {
  layout: layoutLifeline,
  guides(){ const {y0, y1, pxYear} = LL, x0 = sx(0), x1 = sx((y1 - y0 + 1)*pxYear), by = sy(0);
    ctx.lineWidth = 1;   // stems: every map and hub stands on the line in its level color; linked notes get a faint hair
    for (let i=0;i<n;i++) { if (!VV(i)) continue; const lv = N[i].level; if (lv === 1) continue; const x = sx(X[i]); if (x < -5 || x > W + 5) continue;
      ctx.strokeStyle = lv >= 3 ? GRAD[lv][0] : css.line; ctx.globalAlpha = lv >= 3 ? .55 : .22; ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, sy(Y[i])); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = css.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x1, by); ctx.stroke();
    ctx.fillStyle = css.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let y = y0; y <= y1 + 1; y++) { const x = sx((y - y0)*pxYear); ctx.strokeStyle = css.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, by - 8); ctx.lineTo(x, by + 8); ctx.stroke();
      if (y <= y1) { ctx.font = `600 13px ${css.mono}`; ctx.fillStyle = css.accent; ctx.fillText(String(y), x + pxYear*k/2, by + 78); }
      if (y <= y1 && pxYear*k > 260) { ctx.font = `500 9.5px ${css.mono}`; ctx.fillStyle = css.muted; ctx.lineWidth = 1; ctx.strokeStyle = css.line; for (let m = 1; m < 12; m++) { const xm = x + m/12*pxYear*k; ctx.beginPath(); ctx.moveTo(xm, by - 4); ctx.lineTo(xm, by + 4); ctx.stroke(); } for (let m = 0; m < 12; m++) ctx.fillText(MON3[m], x + (m + .5)/12*pxYear*k, by + 62); } }
    const tn = (Date.now() - yStart(y0))/(365.2425*DAY); if (tn > 0 && tn < y1 - y0 + 1) { ctx.fillStyle = css.accent; ctx.beginPath(); ctx.arc(sx(tn*pxYear), by, 5, 0, 6.2832); ctx.fill(); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; },
  legend: "Lifeline: your whole ideaverse on one line, left to right. Each note stands on it like a mark on a seismograph: the higher its level, the taller its stem (hubs tallest). Unlinked notes hang just below the line. The gold dot is today.",
};

// ---------- Posters: a targeted dataset (a base's view, a filter) laid out by its own properties ----------
// Across: a date or number property (year, rating, created…). Lanes: a category (genre, status, a base's own groups).
// Size: a number (your rank). Each note is a card, and when the note has an image property (a poster, a cover),
// the card shows it once you zoom in. The map reads the properties itself, so it works on any dataset.
const PST = { across: pref("iv-pacross", null), lanes: pref("iv-planes", null), size: pref("iv-psize", null), height: pref("iv-pheight", null), mosaic: !!pref("iv-pmosaic", false), mbox: [], mosaicOn: false, rng: pref("iv-prng", null) || {}, lhide: pref("iv-plhide", null) || {}, ext: {}, laneAll: [], yticks: [], diag: null, rings: null, scatter: false, opts: null, key: "", lanesOut: [], ticks: [], img: "" };
let BASEINFO = null;   // from a base: its sort property and each note's group
// (a note whose properties Obsidian hasn't read yet, right after it starts, is asked again next time instead of remembered as empty)
const FMC = new Map(); const fmOf = i => { let f = FMC.get(i); if (f === undefined) { f = (host.frontmatter && host.frontmatter(N[i].path)) || null; if (f) FMC.set(i, f); } return f; };
const linkName = v => String(v).replace(/^!?\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
const isLink = v => typeof v === "string" && /^!?\[\[[^\]]+\]\]$/.test(v.trim());
const asNum = v => typeof v === "number" ? (isFinite(v) ? v : null) : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? +v : null;
const isImg = (k_, v) => typeof v === "string" && (/^https?:\/\/\S+\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i.test(v.trim()) || (/image|cover|poster|thumb|banner|art/i.test(k_) && (/^https?:\/\//.test(v.trim()) || /\.(jpe?g|png|webp|gif|avif)\]*$/i.test(v.trim()))));
const DATEK = new Set(["created","createdat","created_at","created on","date created","datecreated","creation date","creation_date","date"]);
function postersDetect(){
  const ids = []; for (let i=0;i<n;i++) if (vis[i]) ids.push(i);
  const key = ids.length + ":" + (ids[0] ?? -1) + ":" + (ids[ids.length - 1] ?? -1) + ":" + (BASEINFO ? BASEINFO.v : 0); if (PST.key === key && PST.opts) return PST.opts; PST.key = key;
  const step = Math.max(1, Math.floor(ids.length / 3000)), st = new Map();
  for (let q = 0; q < ids.length; q += step) { const fm = fmOf(ids[q]); if (!fm) continue;
    for (const k_ of Object.keys(fm)) { if (k_ === "position" || k_ === "aliases" || k_ === "cssclasses" || DATEK.has(k_.toLowerCase())) continue; const v = fm[k_]; if (v == null || v === "") continue;
      let o = st.get(k_); if (!o) st.set(k_, o = { n: 0, num: 0, yr: 0, day: 0, img: 0, link: 0, cat: 0, vals: new Map() });
      o.n++; const vs = Array.isArray(v) ? v.slice(0, 12) : [v];
      const nv = Array.isArray(v) ? null : asNum(v); if (nv != null) { o.num++; if (Number.isInteger(nv) && nv >= 1000 && nv <= 2200) o.yr++; continue; }
      if (!Array.isArray(v) && isImg(k_, v)) { o.img++; continue; }
      if (!Array.isArray(v) && typeof v === "string" && parseDay(v)) { o.day++; continue; }
      for (const x of vs) { if (x == null || typeof x === "object") continue; const t = String(x); if (isLink(t)) o.link++; else if (t.length <= 40) o.cat++; else continue;
        const lab = isLink(t) ? linkName(t) : t.trim(); o.vals.set(lab, (o.vals.get(lab) || 0) + 1); } } }
  const sampled = Math.ceil(ids.length / step), ok = o => o.n >= Math.max(3, sampled * .15);
  const across = [{ id: "@created", name: "Created date", kind: "date" }], lanes = [{ id: "", name: "None" }, { id: "@folder", name: "Folder" }], size = [{ id: "", name: "None" }, { id: "@score", name: "Link score" }];
  let img = "";
  if (BASEINFO && BASEINFO.groups && BASEINFO.groups.size) lanes.splice(1, 0, { id: "@base", name: "This base's groups" });
  for (const [k_, o] of [...st].sort((a, b) => b[1].n - a[1].n)) { if (!ok(o)) continue;
    if (o.num >= o.n * .7) { across.push({ id: k_, name: k_, kind: o.yr >= o.num * .8 ? "year" : "num" }); size.push({ id: k_, name: k_ }); continue; }
    if (o.day >= o.n * .7) { across.push({ id: k_, name: k_, kind: "date" }); continue; }
    if (o.img >= o.n * .5) { if (!img) img = k_; continue; }
    const d = o.vals.size; if ((o.cat + o.link) >= o.n * .6 && d >= 2 && d <= Math.max(60, sampled * .5)) lanes.push({ id: k_, name: k_, vals: o.vals, people: o.link > o.cat }); }
  const want = BASEINFO && BASEINFO.sort; const rk = a => a.id === want ? 0 : a.kind === "year" ? 1 : a.id === "@created" ? 4 : a.kind === "date" ? 2 : 3; across.sort((a, b) => rk(a) - rk(b));
  // the default lanes: the first category whose top 13 values hold most of the notes, else none
  const cover = l => { if (!l.vals) return 0; const top = [...l.vals.values()].sort((a, b) => b - a).slice(0, 13).reduce((a, b) => a + b, 0); return top / Math.max(1, sampled); };
  const dl = lanes.find(l => l.vals && cover(l) >= .5);
  PST.opts = { across, lanes, size, img, defLane: BASEINFO && BASEINFO.groups && BASEINFO.groups.size ? "@base" : dl ? dl.id : "" }; return PST.opts; }
function postersOptsUI(){ const box = $("#postctl"); if (!box) return; const o = postersDetect();
  const fill = (sel_, list, cur) => { sel_.empty(); sel_.disabled = !list.length; if (!list.length) { sel_.createEl("option", { value: "", text: "Nothing to pick" }); return; }
    for (const it of list) sel_.createEl("option", { value: it.id, text: it.name }); sel_.value = list.some(it => it.id === cur) ? cur : list[0].id; };
  const cu = PST.cur; fill($("#pacross"), o.across, cu ? cu.acrossId : PST.across ?? o.across[0].id); fill($("#pheight"), o.across.filter(a => !cu || a.id !== cu.acrossId), cu ? cu.heightId : "");
  { const sc_ = !!(cu && cu.heightId); box.querySelectorAll('[data-k="lanes"]').forEach(el => el.hidden = sc_); box.querySelectorAll('[data-k="height"]').forEach(el => el.hidden = !sc_);
    const md = cu && cu.mosaic ? "mosaic" : sc_ ? "scatter" : "rows"; box.querySelectorAll("#pmode button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pm === md)));
    const ar = box.querySelector('.prow[data-k="across"] > span'), ah = box.querySelector('.phint[data-k="across"]');
    if (ar) ar.setText(md === "mosaic" ? "Narrow by" : "Left to right"); if (ah) ah.setText(md === "mosaic" ? "A date or number. Use its slider to keep part of the set." : "A date or number. Places each card left to right.");
    const lr = box.querySelector('.prow[data-k="lanes"] > span'), lh_ = box.querySelector('.phint[data-k="lanes"]');
    if (lr) lr.setText(md === "mosaic" ? "Blocks by" : "Rows by"); if (lh_) lh_.setText(md === "mosaic" ? "A category. Each value gets its own block." : "A category. Each value gets its own row."); }
  for (const key of ["across", "height", "size"]) postersSlider(key); postersLaneChips(); fill($("#planes"), o.lanes, cu ? cu.laneId : o.defLane);
  fill($("#psize"), o.size, cu ? cu.sizeId : "");
  $("#pimg").setText(o.img ? `Pictures from ${o.img}` : "No image property found"); }
function layoutPosters(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0; FMC.clear();
  const o = postersDetect(), acrossId = (o.across.find(a => a.id === PST.across) || o.across.find(a => a.id === (BASEINFO && BASEINFO.sort)) || o.across[0]).id;
  const ac = o.across.find(a => a.id === acrossId);
  const laneId = PST.lanes != null && o.lanes.some(l => l.id === PST.lanes) ? PST.lanes : o.defLane;
  const hgt = !PST.mosaic && PST.height ? o.across.find(a => a.id === PST.height && a.id !== acrossId) : null, heightId = hgt ? hgt.id : "";
  const sizeId = PST.size != null && o.size.some(s_ => s_.id === PST.size) ? PST.size : (o.size.find(s_ => /^(rank|rating|stars|score|my.?rating|runtime|pages|length)$/i.test(s_.id) && s_.id !== heightId && s_.id !== acrossId) || o.size[0]).id;
  PST.cur = { acrossId, laneId, sizeId, heightId, kind: ac.kind, mosaic: PST.mosaic };
  const valBy = (id, kind, i) => { if (id === "@created") return isNaN(TV[i]) ? null : yOf(TV[i]) + yFrac(TV[i]); const v = fmOf(i) && fmOf(i)[id]; if (v == null) return null;
    if (kind === "date") { const d = parseDay(Array.isArray(v) ? v[0] : v); if (!d) return null; const t = Date.parse(d); return yOf(t) + yFrac(t); } const x = asNum(Array.isArray(v) ? v[0] : v); return x == null ? null : x + (kind === "year" ? .5 : 0); };
  const val = i => valBy(acrossId, ac.kind, i);
  const laneOf = i => { if (!laneId) return ""; if (laneId === "@folder") return N[i].ace === "(root)" ? "Root" : N[i].ace; if (laneId === "@base") return (BASEINFO.groups.get(N[i].path)) ?? "—";
    const v = fmOf(i) && fmOf(i)[laneId]; if (v == null || v === "") return "—"; const f = Array.isArray(v) ? v[0] : v; return f == null ? "—" : isLink(String(f)) ? linkName(f) : String(f).trim(); };
  const szOf = i => { if (!sizeId) return null; if (sizeId === "@score") return N[i].score; const v = fmOf(i) && fmOf(i)[sizeId]; return asNum(Array.isArray(v) ? v[0] : v); };
  // every variable's full spread (for its mini slider), then only the notes inside each slider's range
  const all = []; for (let i=0;i<n;i++) if (vis[i]) all.push(i);
  const ext = {}, mk = (key, id, kind, f) => { if (!id) return null; const a = new Float64Array(n).fill(NaN); let lo = Infinity, hi = -Infinity;
    for (const i of all) { const v = f(i); if (v != null && isFinite(v)) { a[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; } } if (!isFinite(lo)) return a;
    const B = 28, bins = new Array(B).fill(0); for (const i of all) if (!isNaN(a[i])) bins[Math.min(B - 1, Math.floor((a[i] - lo) / ((hi - lo) || 1) * B))]++;
    ext[key] = { id, kind, lo, hi, bins }; return a; };
  const AV = mk("across", acrossId, ac.kind, val), AS = mk("size", sizeId, "num", szOf), AH = heightId ? mk("height", heightId, hgt.kind, i => valBy(heightId, hgt.kind, i)) : null;
  PST.ext = ext;
  const inR = (key, a, i) => { const e = ext[key], r = e && PST.rng[e.id]; if (!r || !a || isNaN(a[i])) return true; const v = e.kind === "year" ? Math.floor(a[i]) : a[i]; return v >= r[0] - 1e-9 && v <= r[1] + 1e-9; };
  const lab = new Array(n), cntAll = new Map(); if (!heightId) for (const i of all) { const L_ = laneOf(i); lab[i] = L_; cntAll.set(L_, (cntAll.get(L_) || 0) + 1); }
  PST.laneAll = laneId && !heightId ? [...cntAll].sort((a, b) => (a[0] === "—") - (b[0] === "—") || b[1] - a[1]) : [];
  const lh = new Set(laneId && !heightId ? PST.lhide[laneId] || [] : []);
  const ids = [], V = new Float64Array(n).fill(NaN), S = new Float64Array(n).fill(NaN); let v0 = Infinity, v1 = -Infinity, s0 = Infinity, s1 = -Infinity; const cnt = new Map();
  for (const i of all) { if (!inR("across", AV, i) || !inR("size", AS, i) || !inR("height", AH, i) || (lh.size && lh.has(lab[i]))) continue; ids.push(i);
    const v = AV ? AV[i] : NaN; if (!isNaN(v)) { V[i] = v; if (v < v0) v0 = v; if (v > v1) v1 = v; }
    const z = AS ? AS[i] : NaN; if (!isNaN(z)) { S[i] = z; if (z < s0) s0 = z; if (z > s1) s1 = z; } if (!heightId) cnt.set(lab[i], (cnt.get(lab[i]) || 0) + 1); }
  if (!isFinite(v0)) { v0 = 0; v1 = 1; } if (v1 - v0 < 1e-9) v1 = v0 + 1;
  PST.scatter = !!heightId; PST.mosaicOn = false; PST.diag = PST.rings = null; PST.yticks = [];
  if (heightId) { layoutPostersXY(ids, V, S, v0, v1, s0, s1, ac, hgt, i => AH[i], o); postersOptsUI(); return; }
  // lanes: the base's own order, else biggest first; past 14, the rest share "Other"
  let order = [...cnt.keys()]; if (laneId === "@base" && BASEINFO.order) order.sort((a, b) => BASEINFO.order.indexOf(a) - BASEINFO.order.indexOf(b)); else order.sort((a, b) => (a === "—") - (b === "—") || cnt.get(b) - cnt.get(a) || String(a).localeCompare(String(b)));
  if (order.length > 14) { const keep = new Set(order.slice(0, 13)); for (const i of ids) if (!keep.has(lab[i])) lab[i] = "Other"; order = [...order.slice(0, 13), "Other"]; cnt.set("Other", ids.filter(i => lab[i] === "Other").length); }
  if (PST.mosaic) { layoutMosaic(ids, S, s0, s1, lab, order, laneId, o); postersOptsUI(); return; }
  const WD = Math.max(520, Math.min(5200, Math.sqrt(ids.length) * 90)), PW = 16, PH = 24, NOV = -90, xOf = v => (v - v0) / (v1 - v0) * WD;
  const sc = i => isNaN(S[i]) || s1 <= s0 ? 1 : .7 + .8 * (S[i] - s0) / (s1 - s0);
  // stack each lane's cards in columns, later (higher-ranked) on top; a lane is as tall as its tallest pile
  const piles = new Map(), stackOf = new Int32Array(n); const byLane = new Map(order.map(l => [l, []])); for (const i of ids) byLane.get(lab[i]).push(i);
  const lanesOut = []; let y = 0;
  for (const L_ of order) { const arr = byLane.get(L_) || []; arr.sort((a, b) => (S[a] || 0) - (S[b] || 0)); const col = new Map(); let top = 0;
    for (const i of arr) { const x = isNaN(V[i]) ? NOV : xOf(V[i]), c = Math.round(x / (PW * .9)), h = (col.get(c) || 0); col.set(c, h + 1); stackOf[i] = h; if (h > top) top = h; }
    const LH_ = Math.max(PH * 1.6, PH * 1.5 + top * PH * .42) + 26; lanesOut.push({ name: L_ === "" ? "All" : L_, n: arr.length, y0: y, y1: y + LH_ });
    for (const i of arr) { const s_ = sc(i), w = PW * s_, h = PH * s_, x = isNaN(V[i]) ? NOV : xOf(V[i]), by = y + LH_ - 10 - stackOf[i] * PH * .42;
      RX[i] = x - w / 2; RY[i] = by - h; RW[i] = w; RH[i] = h; EX[i] = x; EY[i] = by - h / 2; }
    y += LH_; }
  // ticks across the top
  const span = v1 - v0, raw = span / 9, mag = Math.pow(10, Math.floor(Math.log10(raw))), tk = [1, 2, 5, 10].map(m => m * mag).find(t => t >= raw) || 10 * mag, ticks = [];
  for (let t = Math.ceil(v0 / tk) * tk; t <= v1 + 1e-9; t += tk) ticks.push({ x: xOf(ac.kind === "year" || ac.kind === "date" ? t : t), t: ac.kind === "year" || ac.kind === "date" ? String(Math.round(t)) : String(+t.toFixed(2)) });
  PST.lanesOut = lanesOut; PST.ticks = ticks; PST.WD = WD; PST.H = y; PST.img = o.img; PST.hasNo = ids.some(i => isNaN(V[i]));
  expBox = { x0: (PST.hasNo ? NOV - 40 : -40) - 150, y0: -60, x1: WD + 40, y1: y + 20 }; postersOptsUI(); }
// each variable's mini slider: its spread as a little histogram, and two handles that keep only the notes in between
const prngFmt = (v, kind) => kind === "year" ? String(Math.round(v)) : kind === "date" ? String(Math.floor(v)) : String(+v.toFixed(Math.abs(v) < 10 ? 1 : 0));
let prngRaf = 0; const prngRelayout = fit => { if (fit) { morph(true, () => fitTarget()); legend(); return; } if (prngRaf) return; prngRaf = RAF(() => { prngRaf = 0; morph(false); }); };
function postersSlider(key){ const box = $("#rng-" + key); if (!box) return; const e = PST.ext[key];
  if (!e || e.hi - e.lo < 1e-9) { box.hidden = true; box.dataset.sig = ""; return; } box.hidden = false;
  const yr = e.kind === "year", lo = yr ? Math.floor(e.lo) : e.lo, hi = yr ? Math.floor(e.hi) : e.hi, step = yr ? 1 : (hi - lo) / 200, sig = e.id + "|" + lo + "|" + hi + "|" + e.bins.join(",");
  const r = PST.rng[e.id] || [lo, hi];
  if (box.dataset.sig !== sig) { box.dataset.sig = sig; box.empty();
    const hist = box.createDiv({ cls: "phist" }), mx = Math.max(...e.bins); e.bins.forEach(b => hist.createEl("i").style.height = (b ? 8 + 92 * b / mx : 0) + "%");
    const d = box.createDiv({ cls: "dual" }); d.createSpan({ cls: "trk" }); d.createSpan({ cls: "fill" });
    const a = d.createEl("input", { type: "range" }), b = d.createEl("input", { type: "range" }); a.setAttribute("aria-label", `Lowest ${e.id}`); b.setAttribute("aria-label", `Highest ${e.id}`);
    for (const x of [a, b]) { x.min = lo; x.max = hi; x.step = step; }
    const labs = box.createDiv({ cls: "srange" }); labs.createSpan(); labs.createSpan();
    const upd = (commit) => { let p = +a.value, q = +b.value; if (p > q) [p, q] = [q, p]; const full = p <= lo + step / 2 && q >= hi - step / 2;
      if (full) delete PST.rng[e.id]; else PST.rng[e.id] = [p, q]; postersSliderPaint(box, e, lo, hi); if (commit) save("iv-prng", { ...PST.rng }); prngRelayout(commit); };
    a.oninput = b.oninput = () => upd(false); a.onchange = b.onchange = () => upd(true); }
  const [a, b] = box.querySelectorAll("input"); a.value = r[0]; b.value = r[1]; postersSliderPaint(box, e, lo, hi); }
function postersSliderPaint(box, e, lo, hi){ const [a, b] = box.querySelectorAll("input"); let p = +a.value, q = +b.value; if (p > q) [p, q] = [q, p];
  const f = v => (v - lo) / ((hi - lo) || 1), fill = box.querySelector(".fill"); fill.style.left = `calc(9px + (100% - 18px)*${f(p)})`; fill.style.width = `calc((100% - 18px)*${f(q) - f(p)})`;
  box.querySelectorAll(".phist i").forEach((el, j, all) => { const c = (j + .5) / all.length; el.classList.toggle("off", c < f(p) - .5 / all.length || c > f(q) + .5 / all.length); });
  const [l0, l1] = box.querySelectorAll(".srange span"); l0.setText(prngFmt(p, e.kind)); l1.setText(prngFmt(q, e.kind)); }
// Lanes: a category has no range, so its values are chips to switch off and on
function postersLaneChips(){ const box = $("#rng-lanes"); if (!box) return; const id = PST.cur && PST.cur.laneId, L = PST.laneAll;
  if (!id || !L.length || L.length < 2) { box.hidden = true; box.dataset.sig = ""; return; } box.hidden = false;
  const hid = new Set(PST.lhide[id] || []), sig = id + "|" + L.map(x => x[0] + ":" + x[1]).join(",") + "|" + [...hid].join(",");
  if (box.dataset.sig === sig) return; box.dataset.sig = sig; box.empty();
  const show = L.slice(0, 24);
  for (const [v, c] of show) { const ch = box.createEl("button", { cls: "pchip" + (hid.has(v) ? " off" : "") }); ch.createSpan({ text: v === "—" ? "No value" : v }); ch.createEl("b", { text: c.toLocaleString() });
    ch.setAttribute("aria-pressed", String(!hid.has(v)));
    ch.onclick = ev => { ev.stopPropagation(); const h = new Set(PST.lhide[id] || []);
      if (ev.altKey || ev.metaKey) { const only = !(h.size === L.length - 1 && !h.has(v)); h.clear(); if (only) for (const [w] of L) if (w !== v) h.add(w); }   // ⌥/⌘-click: only this one (again: all)
      else if (h.has(v)) h.delete(v); else if (h.size < L.length - 1) h.add(v);
      if (h.size) PST.lhide[id] = [...h]; else delete PST.lhide[id]; save("iv-plhide", { ...PST.lhide }); prngRelayout(true); }; }
  if (L.length > 24) box.createSpan({ cls: "pn", text: `+${L.length - 24} more in Other` });
  if (hid.size) { const all_ = box.createEl("button", { cls: "pchip pall", text: "Show all" }); all_.onclick = ev => { ev.stopPropagation(); delete PST.lhide[id]; save("iv-plhide", { ...PST.lhide }); prngRelayout(true); }; } }

// Mosaic: the cards as tiles with no gaps, a block per row value, each tile sized by Card size (pictures fill their tile)
function layoutMosaic(ids, S, s0, s1, lab, order, laneId, o){
  const area = Math.max(1, ids.length) * 1500, WD = Math.sqrt(area * 1.6), HT = area / WD;
  const sz = i => isNaN(S[i]) || s1 <= s0 ? 1 : .3 + 1.4 * (S[i] - s0) / (s1 - s0);
  const byL = new Map(); for (const i of ids) { const L_ = laneId ? lab[i] : ""; let a = byL.get(L_); if (!a) byL.set(L_, a = []); a.push({ i, v: sz(i) }); }
  const groups = [...byL].map(([t, items]) => ({ t, items: items.sort((a, b) => b.v - a.v), v: items.reduce((a, b) => a + b.v, 0) })).sort((a, b) => b.v - a.v);
  const mbox = [], head = laneId ? 26 : 0, pad = laneId ? 5 : 0, gap = 1.5;
  squarify(groups, 0, 0, WD, HT, (g, x, y, w, h) => { mbox.push({ name: g.t === "" ? "All" : g.t, n: g.items.length, x, y, w, h });
    squarify(g.items, x + pad, y + pad + head, Math.max(1, w - 2 * pad), Math.max(1, h - 2 * pad - head), (it, x2, y2, w2, h2) => { const i = it.i;
      RX[i] = x2 + gap / 2; RY[i] = y2 + gap / 2; RW[i] = Math.max(.5, w2 - gap); RH[i] = Math.max(.5, h2 - gap); EX[i] = x2 + w2 / 2; EY[i] = y2 + h2 / 2; }); });
  PST.mbox = mbox; PST.mosaicOn = true; PST.lanesOut = []; PST.ticks = []; PST.WD = WD; PST.H = HT; PST.img = o.img; PST.hasNo = false; PST.miss = 0;
  expBox = { x0: -20, y0: -20, x1: WD + 20, y1: HT + 20 }; }

// Posters with Height: a number up the side too, so each card sits at (Across, Height). When the two are the same kind
// of thing (two ratings, two years) a line marks where they agree, and the cards furthest from it get a ring.
const niceStep = (span, k_) => { const raw = span / k_, mag = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 5, 10].map(m => m * mag).find(t => t >= raw) || 10 * mag; };
function layoutPostersXY(ids, V, S, v0, v1, s0, s1, ac, hgt, hv, o){
  const Hh = new Float64Array(n).fill(NaN); let h0 = Infinity, h1 = -Infinity; const dist = new Set();
  for (const i of ids) { const h = hv(i); if (h != null && isFinite(h)) { Hh[i] = h; if (h < h0) h0 = h; if (h > h1) h1 = h; dist.add(h); } }
  if (!isFinite(h0)) { h0 = 0; h1 = 1; } if (h1 - h0 < 1e-9) h1 = h0 + 1;
  const WD = Math.max(560, Math.min(5200, Math.sqrt(ids.length) * 90)), HT = WD * .58, PW = 12, PH = 18, NOV = -80;
  const pv = (v1 - v0) * .03, ph = (h1 - h0) * .04, X0 = v0 - pv, X1 = v1 + pv, Y0 = h0 - ph, Y1 = h1 + ph;
  const xOf = v => (v - X0) / (X1 - X0) * WD, yOfH = h => HT - (h - Y0) / (Y1 - Y0) * HT;
  // spread cards that share a value (half-star ratings, whole years) across part of the gap to the next value
  const dv = [...dist].sort((a, b) => a - b); let gap = Infinity; if (dv.length <= 40) for (let q = 1; q < dv.length; q++) gap = Math.min(gap, dv[q] - dv[q - 1]);
  const jy = isFinite(gap) ? gap / (Y1 - Y0) * HT * .38 : PH * .4;
  const sc = i => isNaN(S[i]) || s1 <= s0 ? 1 : .7 + .8 * (S[i] - s0) / (s1 - s0);
  const MISS = HT + 70; let miss = 0, missX = new Map();
  for (const i of ids) { const s_ = sc(i), w = PW * s_, h = PH * s_; let x, y;
    if (!isNaN(V[i]) && !isNaN(Hh[i])) { x = xOf(V[i]) + (hash(N[i].path, 7) - .5) * PW * 1.1; y = yOfH(Hh[i]) + (hash(N[i].path, 9) - .5) * 2 * jy; }
    else if (!isNaN(Hh[i])) { x = NOV + (hash(N[i].path, 7) - .5) * PW; y = yOfH(Hh[i]); }
    else { miss++; x = isNaN(V[i]) ? NOV : xOf(V[i]); const c = Math.round(x / (PW * .9)), k_ = missX.get(c) || 0; missX.set(c, k_ + 1); y = MISS + k_ * PH * .42; }
    RX[i] = x - w / 2; RY[i] = y - h / 2; RW[i] = w; RH[i] = h; EX[i] = x; EY[i] = y; }
  const yr = k_ => k_ === "year" || k_ === "date", lab = (t, k_) => yr(k_) ? String(Math.round(t)) : String(+t.toFixed(2));
  const tx = niceStep(v1 - v0, 9), ty = niceStep(h1 - h0, 6), ticks = [], yticks = [];
  for (let t = Math.ceil(v0 / tx) * tx; t <= v1 + 1e-9; t += tx) ticks.push({ x: xOf(t), t: lab(t, ac.kind) });
  for (let t = Math.ceil(h0 / ty) * ty; t <= h1 + 1e-9; t += ty) yticks.push({ y: yOfH(t), t: lab(t, hgt.kind) });
  // where the two agree: the same year, or the same score once both are read on their own scale (5 stars vs 10 points)
  const top = m => [1, 5, 10, 100, 1000].find(c => c >= m - 1e-9) || m;
  let f = null, dlab = "";
  if (yr(ac.kind) && yr(hgt.kind)) { f = x => x; dlab = "same year"; }
  else if (ac.kind === "num" && hgt.kind === "num" && v0 >= 0 && h0 >= 0) { const r = top(h1) / top(v1); f = x => x * r; dlab = "same score"; }
  if (f) { const pts = []; for (let q = 0; q <= 200; q++) { const x = X0 + (X1 - X0) * q / 200, h = f(x); if (h >= Y0 && h <= Y1) pts.push([xOf(x), yOfH(h)]); }
    if (pts.length > 1) PST.diag = { a: pts[0], b: pts[pts.length - 1], label: dlab, above: `${hgt.name} higher`, below: `${ac.name} higher`, yr: yr(ac.kind) };
    const res = ids.filter(i => !isNaN(V[i]) && !isNaN(Hh[i])).map(i => [i, (Hh[i] - f(V[i])) / (Y1 - Y0)]).filter(r => Math.abs(r[1]) > .18).sort((a, b) => b[1] - a[1]);
    PST.rings = new Set([...res.slice(0, 4), ...res.slice(-4)].map(r => r[0])); }
  PST.lanesOut = []; PST.ticks = ticks; PST.yticks = yticks; PST.WD = WD; PST.H = HT; PST.img = o.img; PST.hasNo = ids.some(i => isNaN(V[i]) && !isNaN(Hh[i])); PST.miss = miss ? MISS : 0;
  PST.axes = { x: ac.name, y: hgt.name };
  expBox = { x0: (PST.hasNo ? NOV - 30 : -20) - 70, y0: -60, x1: WD + 40, y1: (miss ? MISS + 60 : HT + 40) }; }
// pictures: loaded only for cards on screen and big enough to see, a few at a time
const PIMG = new Map(); let pimgBusy = 0, pimgRaf = 0;
function posterImg(i){ if (!PST.img) return null; const fm = fmOf(i); let v = fm && fm[PST.img]; if (Array.isArray(v)) v = v[0]; if (!v || typeof v !== "string") return null; v = v.trim();
  let src = /^https?:\/\//.test(v) ? v : (host.resource ? host.resource(linkName(v), N[i].path) : null); if (!src) return null;
  let e = PIMG.get(src); if (e) return e.ok ? e.img : null; if (pimgBusy >= 8) return null;
  e = { img: new Image(), ok: false }; PIMG.set(src, e); pimgBusy++; e.img.decoding = "async"; e.img.referrerPolicy = "no-referrer";
  e.img.onload = () => { pimgBusy--; e.ok = true; if (!pimgRaf) pimgRaf = RAF(() => { pimgRaf = 0; if (view === "posters" || view === "people") draw(); }); };
  e.img.onerror = () => { pimgBusy--; if (!pimgRaf) pimgRaf = RAF(() => { pimgRaf = 0; if (view === "posters" || view === "people") draw(); }); };
  e.img.src = src; return null; }
const PPAL = ["#c9563c", "#d9a441", "#3f7cac", "#5b8c5a", "#8d5a97", "#c77d9b", "#2f6f8a", "#e0b07a", "#6b9ac4", "#a33b3b", "#4f8f80", "#b8763e"];
EXP.posters = {
  layout: layoutPosters, pick: (x, y) => rectPick(x, y), ownLabels: true,
  guides(){ const gd = sel >= 0 ? .55 : 1;
    ctx.textBaseline = "middle"; ctx.lineWidth = 1;
    if (PST.mosaicOn) { ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
      for (const b of PST.mbox) { const x = sx(b.x), y = sy(b.y), w = b.w * k, h = b.h * k; if (x > W || y > H || x + w < 0 || y + h < 0) continue;
        ctx.globalAlpha = .9 * gd; ctx.strokeStyle = css.line; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
        if (PST.mbox.length > 1 && w > 46 && 26 * k > 9) { const fs_ = Math.max(9, Math.min(13, 26 * k * .45)); ctx.font = `600 ${fs_}px ${css.mono}`; ctx.fillStyle = css.ink; let t = String(b.name).toUpperCase(); while (t.length > 3 && ctx.measureText(t + "  " + b.n).width > w - 12) t = t.slice(0, -2) + "…";
          ctx.fillText(t, x + 7, y + 5 * k + 26 * k * .62); const tw = ctx.measureText(t + "  ").width; ctx.font = `400 ${fs_ * .9}px ${css.mono}`; ctx.fillStyle = css.muted; ctx.fillText(b.n.toLocaleString(), x + 7 + tw, y + 5 * k + 26 * k * .62); } }
      ctx.globalAlpha = 1; return; }
    if (PST.scatter) { ctx.font = `400 10.5px ${css.mono}`; ctx.textAlign = "right";
      for (const t of PST.yticks) { const y = sy(t.y); if (y < -20 || y > H + 20) continue; ctx.strokeStyle = css.line; ctx.globalAlpha = .45 * gd; ctx.beginPath(); ctx.moveTo(sx(0), y); ctx.lineTo(sx(PST.WD), y); ctx.stroke(); ctx.globalAlpha = gd; ctx.fillStyle = css.muted; ctx.fillText(t.t, Math.max(sx(0) - 8, 40), y); }
      ctx.textAlign = "left"; ctx.fillStyle = css.muted; ctx.globalAlpha = gd;
      ctx.save(); ctx.translate(Math.max(sx(0) - 52, 14), sy(PST.H / 2)); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText(String(PST.axes.y).toUpperCase() + " →", 0, 0); ctx.restore();
      ctx.textAlign = "center"; ctx.fillText(String(PST.axes.x).toUpperCase() + " →", sx(PST.WD / 2), sy(PST.H) + 30);
      if (PST.miss) { ctx.textAlign = "left"; ctx.fillText("MISSING " + String(PST.axes.y).toUpperCase(), sx(0), sy(PST.miss) - 30); }
      const d = PST.diag; if (d) { ctx.save(); ctx.beginPath(); ctx.rect(sx(0), sy(0), PST.WD * k, PST.H * k); ctx.clip(); ctx.strokeStyle = css.accent; ctx.globalAlpha = .55 * gd; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx(d.a[0]), sy(d.a[1])); ctx.lineTo(sx(d.b[0]), sy(d.b[1])); ctx.stroke(); ctx.restore();
        ctx.globalAlpha = gd; ctx.fillStyle = css.accent; ctx.font = `400 11px ${css.mono}`; ctx.textAlign = "right"; ctx.fillText(d.label, sx(d.b[0]) - 6, sy(d.b[1]) + 14);
        if (!d.yr) { ctx.font = `400 18px ${css.display}`; ctx.fillStyle = css.ink; ctx.globalAlpha = .6 * gd; ctx.textAlign = "left"; ctx.fillText(d.above, sx(PST.WD * .03), sy(PST.H * .06)); ctx.textAlign = "right"; ctx.fillText(d.below, sx(PST.WD * .97), sy(PST.H * .94)); } }
      ctx.textAlign = "center"; ctx.font = `400 15px ${css.display}`; ctx.globalAlpha = gd; ctx.fillStyle = css.ink;
      for (const t of PST.ticks) { const x = sx(t.x); if (x < -40 || x > W + 40) continue; ctx.strokeStyle = css.line; ctx.globalAlpha = .45 * gd; ctx.beginPath(); ctx.moveTo(x, sy(0)); ctx.lineTo(x, sy(PST.H)); ctx.stroke(); ctx.globalAlpha = gd; ctx.fillText(t.t, x, Math.min(sy(PST.H) + 14, H - 20)); }
      if (PST.hasNo) { ctx.fillStyle = css.muted; ctx.font = `500 10.5px ${css.mono}`; ctx.fillText("NO " + String(PST.axes.x).toUpperCase(), sx(-80), sy(-24)); }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1; return; }
    for (const L_ of PST.lanesOut) { const y0 = sy(L_.y0), y1 = sy(L_.y1); if (y1 < 0 || y0 > H) continue; ctx.strokeStyle = css.line; ctx.globalAlpha = .8 * gd; ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(W, y1); ctx.stroke();
      ctx.globalAlpha = gd; ctx.font = `600 11px ${css.mono}`; ctx.fillStyle = css.ink; const lx = Math.max(12, sx(expBox.x0 + 10)), ly = Math.max(y0 + 14, Math.min(y1 - 22, 70));
      ctx.lineWidth = 4; ctx.strokeStyle = css.bg; const t = String(L_.name).toUpperCase(); ctx.strokeText(t, lx, y0 + 16); ctx.fillText(t, lx, y0 + 16); ctx.font = `400 10.5px ${css.mono}`; ctx.fillStyle = css.muted; ctx.strokeText(L_.n.toLocaleString(), lx, y0 + 30); ctx.fillText(L_.n.toLocaleString(), lx, y0 + 30); ctx.lineWidth = 1; }
    ctx.textAlign = "center"; ctx.font = `400 15px ${css.display}`;
    for (const t of PST.ticks) { const x = sx(t.x); if (x < -40 || x > W + 40) continue; ctx.strokeStyle = css.line; ctx.globalAlpha = .45 * gd; ctx.beginPath(); ctx.moveTo(x, Math.max(sy(0), 40)); ctx.lineTo(x, sy(PST.H)); ctx.stroke(); ctx.globalAlpha = gd; ctx.fillStyle = css.ink; ctx.fillText(t.t, x, Math.max(sy(-28), 22)); }
    if (PST.hasNo) { ctx.fillStyle = css.muted; ctx.font = `500 10.5px ${css.mono}`; ctx.fillText("NO VALUE", sx(-90), Math.max(sy(-28), 22)); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1; },
  notes(lit, dim){
    const ord = []; for (let i=0;i<n;i++) if (RW[i] && VV(i)) ord.push(i); ord.sort((a, b) => RY[b] - RY[a]);   // lower cards first, so each pile reads top-down
    for (const i of ord) { const x = sx(RX[i]), y = sy(RY[i]), w = RW[i] * k, h = RH[i] * k; if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      ctx.globalAlpha = lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .22 : .65) : 1;
      const img = w >= 9 ? posterImg(i) : null;
      if (img) { if (PST.mosaicOn) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, r = Math.max(w / iw, h / ih), sw = w / r, sh = h / r; ctx.drawImage(img, (iw - sw) / 2, (ih - sh) * .3, sw, sh, x, y, w, h); } else ctx.drawImage(img, x, y, w, h); }
      else { ctx.fillStyle = PPAL[Math.floor(hash(N[i].path, 171) * PPAL.length)]; ctx.fillRect(x, y, w, h);
        if (w > 44) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.font = `600 ${Math.min(13, w * .12)}px ${css.body}`; ctx.textBaseline = "bottom";
          const words = N[i].title.split(/\s+/), lines = []; let cur = ""; for (const wd of words) { const t = cur ? cur + " " + wd : wd; if (ctx.measureText(t).width > w - 8 && cur) { lines.push(cur); cur = wd; } else cur = t; } if (cur) lines.push(cur);
          const lh = Math.min(13, w * .12) * 1.15; lines.slice(-4).forEach((t, j, a) => ctx.fillText(t, x + 4, y + h - 4 - (a.length - 1 - j) * lh)); ctx.restore(); } }
      ctx.strokeStyle = i === sel ? css.accent : "rgba(0,0,0,.45)"; ctx.lineWidth = i === sel ? 2.5 : 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
      if (PST.rings && PST.rings.has(i)) { const p = Math.max(3, w * .18); ctx.strokeStyle = css.ink; ctx.globalAlpha *= .8; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x - p, y - p, w + 2 * p, h + 2 * p, p * 1.4); ctx.stroke(); }
      if (w >= 60 && img && !PST.mosaicOn) { ctx.fillStyle = css.ink; ctx.font = `500 ${Math.min(12, w * .1)}px ${css.body}`; ctx.textBaseline = "top"; let t = N[i].title; while (t.length > 3 && ctx.measureText(t).width > w) t = t.slice(0, -2); if (t !== N[i].title) t += "…"; ctx.fillText(t, x, y + h + 3); ctx.textBaseline = "alphabetic"; } }
    ctx.globalAlpha = 1; },
  legend: "Posters: the notes on screen laid out by their own properties. Across is a date or number (release year, created, your rating); lanes are a category (genre, status, this base's own groups); size is a number. Pick a Height and lanes give way to a second number up the side (your rating against the crowd's, the year you watched it against the year it came out), with a line where the two agree and rings on the notes furthest from it. Notes with an image property (a poster, a cover) show it once you zoom in. Click the map's tab for Across, Lanes and Size.",
};

// ---------- People: a constellation of the people your notes name ----------
// The people in properties like director, actors, author or guests become hubs, sized by how many notes name them, and
// pulled together by the notes they share (a director and the actors they keep casting). Each note orbits its main
// person, on the side facing the others it names. A person needs no note to become a hub; if they have one, that note
// sits at the hub's heart. Notes that name nobody leave the map.
const PPL = { pick: -1, act: null, props: pref("iv-pplprops", null), max: pref("iv-pplmax", 40), hubs: [], pairs: [], np: new Map(), cand: [], key: "" };
const PPL_RX = /^(directors?|actors?|cast|stars?|authors?|writers?|by|creators?|artists?|hosts?|guests?|speakers?|people|persons?|with|composers?|producers?|editors?|illustrators?|narrators?|interviewees?|teachers?|mentors?|characters?)$/i;
function peopleDetect(){
  const ids = []; for (let i=0;i<n;i++) if (vis[i]) ids.push(i);
  const key = ids.length + ":" + (ids[0] ?? -1) + ":" + (ids[ids.length - 1] ?? -1); if (PPL.key === key) return PPL.cand; PPL.key = key;
  const step = Math.max(1, Math.floor(ids.length / 3000)), st = new Map(); let sampled = 0;
  for (let q = 0; q < ids.length; q += step) { sampled++; const fm = fmOf(ids[q]); if (!fm) continue;
    for (const k_ of Object.keys(fm)) { if (/^(up|related|collections|tags|aliases|cssclasses|position)$/i.test(k_)) continue; const v = fm[k_]; const vs = Array.isArray(v) ? v : v == null ? [] : [v];
      let o = st.get(k_); const good = vs.filter(x => typeof x === "string" && x.trim() && x.length <= 80 && !/^\d/.test(x.trim()) && !/^https?:/.test(x) && !/\.(png|jpe?g|webp|gif|avif|svg|pdf|md)\]*$/i.test(x.trim())); if (!good.length) continue;
      if (!o) st.set(k_, o = { n: 0, link: 0, vals: new Set() }); o.n++; for (const x of good) { if (isLink(x)) o.link++; o.vals.add(linkName(x).toLowerCase()); } } }
  PPL.cand = [...st].filter(([k_, o]) => o.n >= Math.max(3, sampled * .05) && o.vals.size >= 3).map(([k_, o]) => ({ id: k_, n: o.n, d: o.vals.size, def: PPL_RX.test(k_) }))
    .filter(c => c.def || c.d >= 12).sort((a, b) => b.def - a.def || b.n - a.n).slice(0, 10);
  return PPL.cand; }
function layoutPeople(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0;
  const cand = peopleDetect(), props = (PPL.props && PPL.props.length ? cand.filter(c => PPL.props.includes(c.id)) : cand.filter(c => c.def)).map(c => c.id);
  PPL.active = props; PST.img = postersDetect().img; const ids = []; for (let i=0;i<n;i++) if (vis[i]) ids.push(i);
  const np = new Map(), cnt = new Map(), propOf = new Map();
  for (const i of ids) { const fm = fmOf(i); if (!fm) continue; const got = [];
    for (const k_ of props) { const v = fm[k_]; const vs = Array.isArray(v) ? v : v == null ? [] : [v];
      for (const x of vs) { if (typeof x !== "string" || !x.trim() || x.length > 80) continue; const nm = linkName(x); const key = nm.toLowerCase(); if (got.some(g => g[0] === key)) continue; got.push([key, nm, k_]); } }
    if (!got.length) continue; np.set(i, got); for (const [key, nm, k_] of got) { const c = cnt.get(key); if (c) c.n++; else cnt.set(key, { n: 1, name: nm, prop: k_ }); } }
  let ranked = [...cnt].sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1)); PPL.named = ranked.length; const two = ranked.filter(r => r[1].n >= 2); if (two.length >= 3) ranked = two; PPL.avail = ranked.length;
  const hubs = ranked.slice(0, Math.max(3, PPL.max)).map(([key, c], h) => ({ key, name: c.name, prop: c.prop, n: c.n, h })), hix = new Map(hubs.map(h => [h.key, h.h])), H = hubs.length;
  // which notes stay: those naming at least one hub; their main person is the most-named one
  const keep = new Map(); const pair = new Map();
  for (const [i, got] of np) { const hs = got.map(g => hix.get(g[0])).filter(h => h != null); if (!hs.length) continue; hs.sort((a, b) => hubs[b].n - hubs[a].n || a - b); keep.set(i, hs);
    const lim = hs.slice(0, 12); for (let a = 0; a < lim.length; a++) for (let b = a + 1; b < lim.length; b++) { const p_ = Math.min(lim[a], lim[b]), q_ = Math.max(lim[a], lim[b]), k2 = p_ * H + q_; pair.set(k2, (pair.get(k2) || 0) + 1); } }
  // place the people: the same physics as Graph, people pulled together by the notes they share
  const x = new Float64Array(H), y = new Float64Array(H); hubs.forEach((h, q) => { const r = 10 * Math.sqrt(.5 + q), a = q * Math.PI * (3 - Math.sqrt(5)); x[q] = r * Math.cos(a); y[q] = r * Math.sin(a); });
  const EA = [], EB = []; for (const k2 of pair.keys()) { EA.push(Math.floor(k2 / H)); EB.push(k2 % H); }
  if (H > 1) { const F = graphForce(H, Int32Array.from(EA), Int32Array.from(EB), x, y, Int32Array.from(hubs.map(h => h.h))); let guard = 0; while (F.step() && guard++ < 400); }
  // room for each person's orbit, then nudge apart any that overlap
  const RING = 15, PER = r => Math.max(6, Math.floor(2 * Math.PI * r / 13));
  const orbit = new Array(H).fill(0); for (const hs of keep.values()) orbit[hs[0]]++;
  for (const h of hubs) { h.r = 9 + Math.sqrt(h.n) * 4.2; let left = orbit[h.h], r = h.r + RING; while (left > 0) { left -= PER(r); r += RING; } h.R = r + 6; }
  let sc = 1; { let md = Infinity; for (let e = 0; e < EA.length; e++) { const a = hubs[EA[e]], b = hubs[EB[e]], d = Math.hypot(x[a.h] - x[b.h], y[a.h] - y[b.h]) / (a.R + b.R); if (d < md) md = d; } sc = isFinite(md) && md > 0 ? Math.max(1, 1.15 / md) : 6; sc = Math.min(sc, 40); }
  for (const h of hubs) { h.x = x[h.h] * sc; h.y = y[h.h] * sc; }
  for (let it = 0; it < 80; it++) { let moved = false; for (let a = 0; a < H; a++) for (let b = a + 1; b < H; b++) { const A = hubs[a], B = hubs[b]; let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .01; const need = A.R + B.R + 8; if (d >= need) continue;
      const push = (need - d) / 2; dx /= d; dy /= d; A.x -= dx * push; A.y -= dy * push; B.x += dx * push; B.y += dy * push; moved = true; } if (!moved) break; }
  // each note orbits its main person, on the side facing the others it names
  const byHub = hubs.map(() => []); for (const [i, hs] of keep) { const h = hubs[hs[0]]; let ax = 0, ay = 0; for (const o of hs.slice(1)) { ax += hubs[o].x - h.x; ay += hubs[o].y - h.y; }
    const want = hs.length > 1 ? Math.atan2(ay, ax) : hash(N[i].path, 77) * Math.PI * 2; byHub[hs[0]].push({ i, a: want, far: hs.length > 1 ? 0 : 1 }); }
  const tit = new Map(); for (let i=0;i<n;i++) if (vis[i]) tit.set(N[i].title.toLowerCase(), i);
  for (let i=0;i<n;i++) EHID[i] = 1;
  for (const h of hubs) { const list = byHub[h.h].sort((p_, q_) => p_.far - q_.far || p_.a - q_.a); let r = h.r + RING, k_ = 0;
    while (k_ < list.length) { const cap = PER(r), part = list.slice(k_, k_ + cap); part.sort((p_, q_) => p_.a - q_.a); const off = part.length ? part[0].a : 0;
      part.forEach((it, j) => { const aa = off + j * 2 * Math.PI / cap; EX[it.i] = h.x + Math.cos(aa) * r; EY[it.i] = h.y + Math.sin(aa) * r; EHID[it.i] = 0; }); k_ += cap; r += RING; }
    const own = tit.get(h.key); h.note = own != null ? own : -1; if (own != null) { EX[own] = h.x; EY[own] = h.y; EHID[own] = 0; } }
  // lines only for the strongest ties when there are many, so the picture doesn't fill in
  let prs = [...pair].map(([k2, w]) => [hubs[Math.floor(k2 / H)], hubs[k2 % H], w]).sort((a, b) => b[2] - a[2]); if (prs.length > H * 2.5) prs = prs.slice(0, Math.round(H * 2.5));
  PPL.hubs = hubs; PPL.pairs = prs; PPL.np = keep; PPL.shown = keep.size;
  const props_ = [...new Set(hubs.map(h => h.prop))]; PPL.col = Object.fromEntries(props_.map((p_, j) => [p_, ["#f2c14e", "#6fb7ff", "#ef8a62", "#7bd389", "#c7a6ff", "#f28fb5", "#5fd0d0", "#d9b26f", "#9fb4ff", "#e07070"][j % 10]]));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const h of hubs) { x0 = Math.min(x0, h.x - h.R); x1 = Math.max(x1, h.x + h.R); y0 = Math.min(y0, h.y - h.R); y1 = Math.max(y1, h.y + h.R + 24); }
  if (!isFinite(x0)) { x0 = y0 = -100; x1 = y1 = 100; } expBox = { x0: x0 - 20, y0: y0 - 20, x1: x1 + 20, y1: y1 + 20 }; pplOptsUI(); }
function pplOptsUI(){ const box = $("#pplctl"); if (!box) return; const cand = PPL.cand || [], act = new Set(PPL.active || []), list = box.querySelector(".pplchips"); if (!list) return;
  const sig = cand.map(c => c.id + (act.has(c.id) ? "+" : "")).join(","); if (list.dataset.sig !== sig) { list.dataset.sig = sig; list.empty();
    if (!cand.length) list.createSpan({ cls: "pn", text: "No people properties found in these notes (director, actors, author, guests…)." });
    for (const c of cand) { const b = list.createEl("button", { cls: "pchip" + (act.has(c.id) ? "" : " off") }); b.createSpan({ text: c.id }); b.createEl("b", { text: c.n.toLocaleString() }); b.setAttribute("aria-pressed", String(act.has(c.id)));
      b.onclick = ev => { ev.stopPropagation(); const s_ = new Set(PPL.active || []); if (s_.has(c.id)) s_.delete(c.id); else s_.add(c.id); PPL.props = [...s_]; save("iv-pplprops", PPL.props); morph(true, () => fitTarget()); legend(); }; } }
  const r = box.querySelector("input"), v = box.querySelector(".pplv"); const top = Math.min(1000, PPL.avail || 0); if (r) { r.max = String(Math.max(5, top)); if (document.activeElement !== r) r.value = Math.min(PPL.max, top); }
  // how many of the people are on the map: those named in two or more notes are the ones the slider can reach
  if (v) v.setText(`${Math.min(PPL.max, PPL.avail || 0).toLocaleString()} of ${(PPL.avail || 0).toLocaleString()} people named in 2+ notes${PPL.named > (PPL.avail || 0) ? ` (${(PPL.named - PPL.avail).toLocaleString()} more named once)` : ""} · ${(PPL.shown || 0).toLocaleString()} notes`); }
// a person on the map: the star under the pointer (people with no note of their own can be clicked too)
function pplHubAt(px, py){ let best = -1, bd = Infinity; for (const h of PPL.hubs) { const d = Math.hypot(sx(h.x) - px, sy(h.y) - py), r = Math.max(8, Math.min(26, h.r * k * .55) + 4); if (d < r && d < bd) { bd = d; best = h.h; } } return best; }
function pplClick(i, px, py){ if (i >= 0) { PPL.pick = -1; return false; } const h = pplHubAt(px, py);
  if (h < 0) { if (PPL.pick >= 0) { PPL.pick = -1; draw(); } return false; }
  const hub = PPL.hubs[h]; if (hub.note >= 0) { PPL.pick = -1; return false; }   // they have a note: pick it like any other
  PPL.pick = PPL.pick === h ? -1 : h; select(-1); draw(); return true; }
// what's lit: a picked person (with or without a note), or a picked/focused note and its people; in Focus mode, two steps
// also bring in the other notes those people share
function pplActive(){ let hub = PPL.pick >= 0 ? PPL.pick : -1; const f = focus >= 0 ? focus : sel >= 0 ? sel : hover; if (hub < 0 && f >= 0) { const hh = PPL.hubs.find(h => h.note === f); if (hh) hub = hh.h; }
  if (hub < 0 && (f < 0 || !PPL.np.has(f))) return null;
  const hubs = new Set(), notes = new Set(), deep = focus >= 0 && fDepth >= 2;
  if (hub >= 0) { hubs.add(hub); for (const [i, hs] of PPL.np) if (hs.includes(hub)) { notes.add(i); if (deep) for (const o of hs) hubs.add(o); } }
  else { notes.add(f); for (const o of PPL.np.get(f)) hubs.add(o); if (deep) for (const [i, hs] of PPL.np) if (hs.some(o => hubs.has(o))) notes.add(i); }
  return { hub, hubs, notes }; }
EXP.people = {
  layout: layoutPeople, ownLabels: true,
  guides(){ const act = pplActive(), hl = sel >= 0 ? sel : hover, gd = act ? .5 : 1; PPL.act = act;
    // shared notes between two people: the more they share, the brighter the line; with something picked, only its ties stay bright
    ctx.lineCap = "round"; for (const [a, b, w] of PPL.pairs) { const on = !act || (act.hubs.has(a.h) && act.hubs.has(b.h)); ctx.strokeStyle = "#c7a6ff"; ctx.globalAlpha = Math.min(.75, .14 + w * .07) * (on ? 1 : .12) * (act && on ? 1.6 : gd); ctx.lineWidth = Math.min(8, 1 + w * .6) * Math.min(1.6, Math.max(.6, k)); ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke(); }
    // a picked person's notes, each tied to them
    if (act && act.hub >= 0) { const p_ = PPL.hubs[act.hub]; ctx.strokeStyle = css.accent; ctx.globalAlpha = .55; ctx.lineWidth = 1; ctx.beginPath(); for (const i of act.notes) { if (!VV(i)) continue; ctx.moveTo(sx(p_.x), sy(p_.y)); ctx.lineTo(sx(X[i]), sy(Y[i])); } ctx.stroke(); }
    // the picked note's people
    if (hl >= 0 && PPL.np.has(hl)) { ctx.strokeStyle = css.accent; ctx.globalAlpha = .85; ctx.lineWidth = 1.5; ctx.beginPath(); for (const h of PPL.np.get(hl)) { const p_ = PPL.hubs[h]; ctx.moveTo(sx(X[hl]), sy(Y[hl])); ctx.lineTo(sx(p_.x), sy(p_.y)); } ctx.stroke(); }
    for (const h of PPL.hubs) { const x = sx(h.x), y = sy(h.y), r = Math.max(3, Math.min(26, h.r * k * .55)); if (x < -200 || x > W + 200 || y < -200 || y > H + 200) continue; const col = PPL.col[h.prop] || css.accent;
      const lit = act ? act.hubs.has(h.h) : false;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2); g.addColorStop(0, col); g.addColorStop(.3, col + "55"); g.addColorStop(1, col + "00"); ctx.globalAlpha = (lit ? 1 : .85) * (act && !lit ? .22 : 1); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = act && !lit ? .3 : 1; if (act && act.hub === h.h) { ctx.strokeStyle = css.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke(); } ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.lineCap = "butt"; },
  notes(lit, dim){ const r = Math.max(2, Math.min(6, 3.4 * Math.sqrt(k))), big = 10 * k;
    for (let i=0;i<n;i++) { if (!VV(i) || !PPL.np.has(i)) continue; const x = sx(X[i]), y = sy(Y[i]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const act = PPL.act; ctx.globalAlpha = act ? (act.notes.has(i) ? 1 : .1) : lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .2 : .55) : .9;
      const img = big >= 14 && PST.img ? posterImg(i) : null;
      if (img) { const w = big * .8, h = big * 1.2; ctx.drawImage(img, x - w / 2, y - h / 2, w, h); if (i === sel) { ctx.strokeStyle = css.accent; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h / 2, w, h); } }
      else { ctx.fillStyle = i === sel ? css.accent : css.ink; ctx.beginPath(); ctx.arc(x, y, i === sel ? r * 1.8 : r, 0, Math.PI * 2); ctx.fill(); } }
    ctx.globalAlpha = 1; },
  labels(){ ctx.textAlign = "center"; ctx.textBaseline = "top"; const placed = [];
    for (const h of [...PPL.hubs].sort((a, b) => b.n - a.n)) { const x = sx(h.x), y = sy(h.y) + Math.max(3, Math.min(26, h.r * k * .55)) + 6; if (x < -100 || x > W + 100 || y < -40 || y > H + 40) continue;
      const fs = Math.max(10, Math.min(15, 9 + Math.sqrt(h.n) * 1.1)); ctx.font = `600 ${fs}px ${css.body}`; const w = ctx.measureText(h.name).width;
      if (placed.some(p_ => Math.abs(p_[0] - x) < (p_[2] + w) / 2 + 4 && Math.abs(p_[1] - y) < fs + 10)) continue; placed.push([x, y, w]);
      ctx.globalAlpha = PPL.act && !PPL.act.hubs.has(h.h) ? .35 : 1; ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.fillStyle = css.ink; ctx.strokeText(h.name, x, y); ctx.fillText(h.name, x, y);
      ctx.font = `400 ${fs * .72}px ${css.mono}`; ctx.fillStyle = css.muted; const t = `${h.n} · ${h.prop}`; ctx.strokeText(t, x, y + fs + 2); ctx.fillText(t, x, y + fs + 2); }
    ctx.globalAlpha = 1;
    // a picked person's notes are named when there's room
    if (PPL.act && PPL.act.hub >= 0 && PPL.pick >= 0 && PPL.act.notes.size <= 60) { ctx.font = `500 11px ${css.body}`; ctx.fillStyle = css.ink; ctx.lineWidth = 3; ctx.strokeStyle = css.bg; for (const i of PPL.act.notes) { if (!VV(i)) continue; const x = sx(X[i]), y = sy(Y[i]) + 6; if (x < 0 || x > W || y < 0 || y > H) continue; ctx.strokeText(N[i].title, x, y); ctx.fillText(N[i].title, x, y); } }
    if (sel >= 0 && VV(sel)) { ctx.font = `600 12px ${css.body}`; ctx.fillStyle = css.ink; ctx.lineWidth = 4; ctx.strokeStyle = css.bg; ctx.strokeText(N[sel].title, sx(X[sel]), sy(Y[sel]) + 8); ctx.fillText(N[sel].title, sx(X[sel]), sy(Y[sel]) + 8); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; },
  legend: "People: the people your notes name in properties like director, actors, author or guests, as stars sized by how many notes name them. Lines join people who share notes, brighter the more they share. Each note orbits its main person, on the side facing the others it names; zoom in to see pictures. Click the People tab to pick which properties count and how many people to show.",
};

// ---------- Mosaic: every note a tile, set like stones ----------
// Emergence (the default): Level 5 tiles in the middle, each level a square frame around the one above it, out to the
// unlinked notes at the edge. Within a frame, notes of a folder sit together, so folders show as patches of one color.
// Scattered: the same tiles, set in no order at all. A tile's size comes from its link score; color from its level
// (maps and hubs wear the level colors) or its folder.
let MOS = pref("iv-mos", "emergence") === "scatter" ? "scatter" : "emergence"; const MOSF = [];
function layoutMosaic2(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0; MOSF.length = 0;
  const wt = i => .6 + Math.pow(Math.max(0, N[i].score), 1.35) * .35, fold = i => N[i].path.includes("/") ? N[i].path.slice(0, N[i].path.lastIndexOf("/")) : "";
  const ids = []; for (let i=0;i<n;i++) if (vis[i]) ids.push(i); if (!ids.length) { expBox = { x0: 0, y0: 0, x1: 100, y1: 100 }; return; }
  const area = ids.reduce((a, i) => a + wt(i), 0), U = 1600 / Math.max(1, ids.reduce((a, i) => a + wt(i), 0) / ids.length);   // about 1,600 square units for an average tile
  const set = (it, x, y, w, h) => { const i = it.i; RX[i] = x; RY[i] = y; RW[i] = w; RH[i] = h; EX[i] = x + w / 2; EY[i] = y + h / 2; };
  // folder patches inside a region: a squarified block per folder, then the notes inside it
  const fill = (items, x, y, w, h) => { if (!items.length || w <= 0 || h <= 0) return; const by = new Map(); for (const it of items) { const f = fold(it.i); let a = by.get(f); if (!a) by.set(f, a = []); a.push(it); }
    const groups = [...by.values()].map(a => ({ items: a.sort((p, q) => q.v - p.v), v: a.reduce((t, it) => t + it.v, 0) })).sort((p, q) => q.v - p.v);
    squarify(groups, x, y, w, h, (g, x2, y2, w2, h2) => squarify(g.items, x2, y2, w2, h2, set)); };
  if (MOS === "scatter") {
    // in no order, laid like a brick wall: each row as tall as it needs to be to fill the width; a tile is wider the higher its score
    const items = ids.map(i => ({ i, a: .8 + 1.8 * Math.sqrt(Math.pow(Math.max(0, N[i].score), 1.35) * .35 / 3), r: hash(N[i].path, 97) })).sort((p, q) => p.r - q.r);
    const S_ = Math.sqrt(area * U), h0 = Math.sqrt(U * 1.1); let y = -S_ / 2, row = [], sa = 0;
    const flush = last => { const h = last ? Math.min(h0, S_ / Math.max(sa, 1e-9)) : S_ / sa; let x = -S_ / 2; for (const it of row) { const w = it.a * h; set(it, x, y, w, h); x += w; } y += h; row = []; sa = 0; };
    for (const it of items) { row.push(it); sa += it.a; if (sa * h0 >= S_) flush(false); } if (row.length) flush(true);
    expBox = { x0: -S_ / 2 - 20, y0: -S_ / 2 - 20, x1: S_ / 2 + 20, y1: y + 20 }; return; }
  // emergence: concentric square frames, Level 5 at the heart
  let inner = 0;
  for (let L = 5; L >= 1; L--) { const items = ids.filter(i => N[i].level === L).map(i => ({ i, v: wt(i) * U })); if (!items.length) continue;
    const a = items.reduce((t, it) => t + it.v, 0), outer = Math.sqrt(inner * inner + a), o = outer / 2, m = inner / 2, b = o - m;
    MOSF.push({ L, s: outer, n: items.length });
    if (!inner) { fill(items, -o, -o, outer, outer); inner = outer; continue; }
    // the frame as four strips, clockwise from the top; the notes run around it in folder order
    const strips = [[-o, -o, outer, b], [m, -m, b, inner], [-o, m, outer, b], [-o, -m, b, inner]], sa = strips.map(r => r[2] * r[3]), tot = sa.reduce((t, v) => t + v, 0);
    items.sort((p, q) => fold(p.i) < fold(q.i) ? -1 : fold(p.i) > fold(q.i) ? 1 : q.v - p.v);
    let k_ = 0, acc = 0; for (let r = 0; r < 4; r++) { const goal = sa[r] / tot * a, part = []; while (k_ < items.length && (acc < goal || r === 3)) { part.push(items[k_]); acc += items[k_].v; k_++; } acc -= goal;
      const pv = part.reduce((t, it) => t + it.v, 0) || 1, [rx, ry, rw, rh] = strips[r]; for (const it of part) it.v *= rw * rh / pv; fill(part, rx, ry, rw, rh); }
    inner = outer; }
  expBox = { x0: -inner / 2 - 20, y0: -inner / 2 - 20, x1: inner / 2 + 20, y1: inner / 2 + 20 }; }
EXP.mosaic = {
  layout: layoutMosaic2, pick: (x, y) => rectPick(x, y), ownLabels: true,
  notes(lit, dim){ const gr = Math.max(.5, Math.min(2, k * 1.2));   // the grout between tiles
    ctx.fillStyle = css.bg;
    for (let i=0;i<n;i++) { if (!RW[i] || !VV(i)) continue; const x = sx(RX[i]), y = sy(RY[i]), w = RW[i]*k, h = RH[i]*k; if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      ctx.globalAlpha = lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .25 : .7) : 1; const d = N[i], j_ = (hash(d.path, 53) - .5) * .14;
      if (w < 3 || h < 3) { ctx.fillStyle = d.level >= 3 ? GRAD[d.level][hash(d.path, 7) < .5 ? 0 : 1] : hexHsl(aceHue(d), j_, d.level === 1 ? -.3 : 0); ctx.fillRect(x, y, Math.max(.6, w - gr * .5), Math.max(.6, h - gr * .5)); continue; }
      const g = ctx.createLinearGradient(x, y, x + w, y + h);   // each stone catches the light a little differently
      if (d.level >= 3) { g.addColorStop(0, GRAD[d.level][0]); g.addColorStop(1, GRAD[d.level][1]); }
      else { const base = aceHue(d); g.addColorStop(0, hexHsl(base, .14 + j_, 0)); g.addColorStop(1, hexHsl(base, -.18 + j_, d.level === 1 ? -.35 : 0)); }
      ctx.fillStyle = g; const r = Math.min(w, h) * .12; ctx.beginPath(); ctx.roundRect(x + gr / 2, y + gr / 2, w - gr, h - gr, Math.min(r, 6)); ctx.fill();
      if (i === sel) { ctx.strokeStyle = css.ink; ctx.lineWidth = 2; ctx.stroke(); }
      if (w > 64 && h > 18) { ctx.fillStyle = d.level >= 3 ? "rgba(255,255,255,.95)" : "rgba(0,0,0,.72)"; ctx.font = `500 ${Math.min(13, h * .3, w * .1)}px ${css.body}`; ctx.textBaseline = "top"; let t = d.title; while (t.length > 3 && ctx.measureText(t).width > w - 10) t = t.slice(0, -2); if (t !== d.title) t += "…"; ctx.fillText(t, x + 5, y + 5); } }
    ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"; overLinks(lit); },
  guides(){ if (MOS !== "emergence") return;   // each level's frame, named at its top left corner
    ctx.textBaseline = "bottom"; ctx.textAlign = "left";
    // each level's frame, a faint outline; the level names and counts live in the legend
    for (const f of MOSF) { const x = sx(-f.s / 2), y = sy(-f.s / 2), w = f.s * k; if (w < 30) continue; ctx.strokeStyle = css.line; ctx.globalAlpha = .9; ctx.lineWidth = 1; ctx.strokeRect(x - 2, y - 2, w + 4, w + 4); }
    ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"; },
  legend: "Mosaic: every note a tile, set like stones. Emergence (the default) puts Level 5 at the heart and each level in a square frame around the one above it (the levels and counts above, from the middle out), out to the unlinked notes at the edge; inside a frame, a folder's notes sit together as a patch of color. Scattered sets the same tiles in no order. A tile's size is its link score; maps and hubs wear their level colors. Click the Mosaic tab to switch.",
};

// ---------- Graph: our take on Obsidian's graph view ----------
// Notes as dots pulled together by their links and pushed apart by each other, like the core graph, but drawn with
// the Idea Emergence symbols, so hubs and maps stand out, and with everything the other maps have (time-lapse, Wander, Focus).
// The physics runs once per set of notes (a few hundred steps on a grid, so 15,000 notes settle in about a second) and is
// cached; the same vault always settles the same way. Unlinked notes ring the outside, as in the core graph.
const GPH = { key: "", x: null, y: null, run: 0 };
function layoutGraph(){
  const ids = []; for (let i=0;i<n;i++) if (vis[i]) ids.push(i);
  const key = (IDV() ? "3d:" : "") + ids.length + ":" + ids.reduce((a, i) => (a * 31 + i) | 0, 7);
  if (GPH.key !== key) graphSim(ids, key);
  if (IDV()) { for (let i=0;i<n;i++) { G3[3*i] = GPH.x[i]; G3[3*i+1] = GPH.y[i]; G3[3*i+2] = GPH.z ? GPH.z[i] : 0; } geoProj(); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i=0;i<n;i++) { if (!IDV()) { EX[i] = GPH.x[i]; EY[i] = GPH.y[i]; } if (vis[i]) { if (EX[i] < x0) x0 = EX[i]; if (EX[i] > x1) x1 = EX[i]; if (EY[i] < y0) y0 = EY[i]; if (EY[i] > y1) y1 = EY[i]; } }
  if (!isFinite(x0)) { x0 = y0 = -100; x1 = y1 = 100; } expBox = { x0: x0 - 40, y0: y0 - 40, x1: x1 + 40, y1: y1 + 40 }; }
// d3-force style: many-body (Barnes–Hut) + links + centering, velocity Verlet with alpha cooling
function graphForce(m, EA, EB, x, y, act, z) {   // act: Int32Array of node indices that move; z: a third axis for 3D (optional)
  const D3 = !!z, K = D3 ? 8 : 4;
  const vx = new Float64Array(m), vy = new Float64Array(m), vz = new Float64Array(m), cnt = new Int32Array(m), ne = EA.length; if (!z) z = new Float64Array(m);
  for (let e = 0; e < ne; e++) { cnt[EA[e]]++; cnt[EB[e]]++; }
  const str = new Float64Array(ne), bias = new Float64Array(ne);
  for (let e = 0; e < ne; e++) { const a = cnt[EA[e]], b = cnt[EB[e]]; str[e] = 1 / Math.min(a, b); bias[e] = a / (a + b); }
  const na = act.length, cap = na * (D3 ? 6 : 4) + 8;
  // quadtree (octree in 3D) as flat arrays: K children per node, mass, center of mass, leaf point
  const ch = new Int32Array(cap * K), qm = new Float64Array(cap), qx = new Float64Array(cap), qy = new Float64Array(cap), qz = new Float64Array(cap), qp = new Int32Array(cap);
  let nq = 0, S0;
  const STR = -30, TH2 = .81, LD = 30;
  let alpha = 1; const aMin = .001, aDecay = 1 - Math.pow(aMin, 1 / (na > 5000 ? 220 : 300)), vDecay = .6;
  const isLeaf = q => { for (let c = 0; c < K; c++) if (ch[q * K + c] !== -1) return false; return true; };
  const newQ = () => { const q = nq++; for (let c = 0; c < K; c++) ch[q * K + c] = -1; qm[q] = 0; qx[q] = qy[q] = qz[q] = 0; qp[q] = -1; return q; };
  const oct = (j, x0, y0, z0, h) => (x[j] >= x0 + h ? 1 : 0) + (y[j] >= y0 + h ? 2 : 0) + (D3 && z[j] >= z0 + h ? 4 : 0);
  function build() { nq = 0; let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity, e0 = Infinity, e1 = -Infinity;
    for (let k = 0; k < na; k++) { const j = act[k]; if (x[j] < a) a = x[j]; if (x[j] > c) c = x[j]; if (y[j] < b) b = y[j]; if (y[j] > d) d = y[j]; if (z[j] < e0) e0 = z[j]; if (z[j] > e1) e1 = z[j]; }
    S0 = Math.max(c - a, d - b, D3 ? e1 - e0 : 0) + 1; const X0 = a, Y0 = b, Z0 = D3 ? e0 : 0, root = newQ();
    for (let k = 0; k < na; k++) { const j = act[k]; let q = root, x0 = X0, y0 = Y0, z0 = Z0, s = S0, depth = 0;
      for (;;) { if (nq >= cap - K) break;
        if (qp[q] === -1 && qm[q] === 0 && isLeaf(q)) { qp[q] = j; qm[q] = 1; qx[q] = x[j]; qy[q] = y[j]; qz[q] = z[j]; break; }
        // an occupied leaf: push its note down a level first
        if (qp[q] !== -1) { const o = qp[q]; qp[q] = -1; if (depth > 40 || (x[o] === x[j] && y[o] === y[j] && z[o] === z[j])) { qp[q] = o; qm[q]++; break; }
          const h = s / 2, c8 = q * K + oct(o, x0, y0, z0, h); const nn = newQ(); ch[c8] = nn; qp[nn] = o; qm[nn] = 1; qx[nn] = x[o]; qy[nn] = y[o]; qz[nn] = z[o]; }
        const h = s / 2, oc = oct(j, x0, y0, z0, h), c8 = q * K + oc; qm[q]++;
        if (ch[c8] === -1) { const nn = newQ(); ch[c8] = nn; qp[nn] = j; qm[nn] = 1; qx[nn] = x[j]; qy[nn] = y[j]; qz[nn] = z[j]; break; }
        q = ch[c8]; x0 += (oc & 1) * h; y0 += (oc >> 1 & 1) * h; z0 += (oc >> 2 & 1) * h; s = h; depth++; } }
    // centers of mass, bottom-up (children have higher indices than parents)
    for (let q = nq - 1; q >= 0; q--) { if (isLeaf(q)) continue; let m_ = 0, sx = 0, sy = 0, sz_ = 0;
      if (qp[q] !== -1) { m_ += 1; sx += x[qp[q]]; sy += y[qp[q]]; sz_ += z[qp[q]]; }
      for (let c = 0; c < K; c++) { const k = ch[q * K + c]; if (k < 0) continue; m_ += qm[k]; sx += qx[k] * qm[k]; sy += qy[k] * qm[k]; sz_ += qz[k] * qm[k]; } qm[q] = m_; qx[q] = sx / m_; qy[q] = sy / m_; qz[q] = sz_ / m_; } }
  const stack = new Int32Array(cap), sz = new Float64Array(cap);
  function charge() { build(); for (let k = 0; k < na; k++) { const j = act[k]; let sp = 0; stack[sp] = 0; sz[sp++] = S0;
      while (sp) { const q = stack[--sp], s = sz[sp]; if (qm[q] === 0) continue; let dx = qx[q] - x[j], dy = qy[q] - y[j], dz = qz[q] - z[j], l = dx * dx + dy * dy + dz * dz;
        const leaf = isLeaf(q);
        if (leaf || s * s / TH2 < l) { if (leaf && qp[q] === j && qm[q] === 1) continue; if (l === 0) { dx = ((j * 7919) % 1000 / 1000 - .5) * 1e-3; dy = ((j * 104729) % 997 / 997 - .5) * 1e-3; dz = D3 ? ((j * 31) % 89 / 89 - .5) * 1e-3 : 0; l = dx * dx + dy * dy + dz * dz; } if (l < 1) l = Math.sqrt(l);
          const w = STR * alpha * (leaf && qp[q] === j ? qm[q] - 1 : qm[q]) / l; vx[j] += dx * w; vy[j] += dy * w; vz[j] += dz * w; continue; }
        for (let c = 0; c < K; c++) { const kq = ch[q * K + c]; if (kq >= 0) { stack[sp] = kq; sz[sp++] = s / 2; } } } } }
  function links() { for (let e = 0; e < ne; e++) { const s = EA[e], t = EB[e]; let dx = x[t] + vx[t] - x[s] - vx[s] || 1e-6, dy = y[t] + vy[t] - y[s] - vy[s] || 1e-6, dz = D3 ? z[t] + vz[t] - z[s] - vz[s] : 0, l = Math.sqrt(dx * dx + dy * dy + dz * dz);
      l = (l - LD) / l * alpha * str[e]; dx *= l; dy *= l; dz *= l; const b = bias[e]; vx[t] -= dx * b; vy[t] -= dy * b; vz[t] -= dz * b; vx[s] += dx * (1 - b); vy[s] += dy * (1 - b); vz[s] += dz * (1 - b); } }
  function center() { for (let k = 0; k < na; k++) { const j = act[k]; vx[j] -= x[j] * .1 * alpha; vy[j] -= y[j] * .1 * alpha; if (D3) vz[j] -= z[j] * .1 * alpha; } }
  // dragging: a pinned note follows the pointer; the rest stays warm (alphaTarget) until it's let go, then cools again
  const pin = new Uint8Array(m), fxp = new Float64Array(m), fyp = new Float64Array(m); let aT = 0;
  return { step() { alpha += (aT - alpha) * aDecay; links(); charge(); center(); for (let k = 0; k < na; k++) { const j = act[k]; if (pin[j]) { x[j] = fxp[j]; y[j] = fyp[j]; vx[j] = vy[j] = vz[j] = 0; continue; } vx[j] *= vDecay; vy[j] *= vDecay; vz[j] *= vDecay; x[j] += vx[j]; y[j] += vy[j]; if (D3) z[j] += vz[j]; } return alpha > aMin || aT > 0; },
    fix(j, px, py){ pin[j] = 1; fxp[j] = px; fyp[j] = py; x[j] = px; y[j] = py; }, free(j){ pin[j] = 0; }, heat(t){ aT = t; if (alpha < t) alpha = t; }, get alpha() { return alpha; } };
}
// The physics settles live, a few steps a frame, so you watch the graph find its shape (like the core graph): the same
// forces as Obsidian's (d3-force: every note pushes every other away, Barnes–Hut; links pull to 30; a pull to the middle).
// It starts from a spiral with the highest-scoring notes in the middle, so the same vault settles the same way.
function graphSim(ids, key){
  const run = ++GPH.run; GPH.key = key; const m = ids.length, loc = new Int32Array(n).fill(-1); ids.forEach((i, j) => loc[i] = j);
  const ea = [], eb = [], seen = new Set();
  for (const [a, b] of E) { const p = loc[a], q = loc[b]; if (p < 0 || q < 0 || p === q) continue; const kk = p < q ? p * m + q : q * m + p; if (seen.has(kk)) continue; seen.add(kk); ea.push(p); eb.push(q); }
  const deg = new Int32Array(m); for (let e = 0; e < ea.length; e++) { deg[ea[e]]++; deg[eb[e]]++; }
  const x = new Float64Array(m), y = new Float64Array(m), z = IDV() ? new Float64Array(m) : null, lk = []; for (let j = 0; j < m; j++) if (deg[j]) lk.push(j);
  lk.sort((a, b) => N[ids[b]].score - N[ids[a]].score || (N[ids[a]].path < N[ids[b]].path ? -1 : 1));
  // a spiral to start from (a ball in 3D), the highest-scoring notes in the middle
  lk.forEach((j, q) => { if (!z) { const r = 10 * Math.sqrt(.5 + q), a = q * Math.PI * (3 - Math.sqrt(5)); x[j] = r * Math.cos(a); y[j] = r * Math.sin(a); return; }
    const r = 14 * Math.cbrt(.5 + q), u = 1 - 2 * ((q * .618034) % 1), a = q * Math.PI * (3 - Math.sqrt(5)), w = Math.sqrt(1 - u * u); x[j] = r * w * Math.cos(a); y[j] = r * u; z[j] = r * w * Math.sin(a); });
  const F = graphForce(m, Int32Array.from(ea), Int32Array.from(eb), x, y, Int32Array.from(lk), z);
  const lone = []; for (let j = 0; j < m; j++) if (!deg[j]) lone.push(j); lone.sort((a, b) => N[ids[a]].path < N[ids[b]].path ? -1 : 1);
  const place = () => { const rs = lk.map(j => Math.hypot(x[j], y[j], z ? z[j] : 0)).sort((a, b) => a - b); const R = (rs.length ? rs[Math.floor(rs.length * .97)] : 0) + 90;
    const ring = Math.max(120, lone.length * 900 * .5 / (2 * Math.PI * R));
    if (!z) lone.forEach((j, q) => { const a = q * 2.39996, r = R + ring * Math.sqrt((q + .5) / Math.max(1, lone.length)); x[j] = Math.cos(a) * r; y[j] = Math.sin(a) * r; });
    else { const R3 = (rs.length ? Math.sqrt(rs.reduce((t, v) => Math.max(t, v), 0) * rs[Math.floor(rs.length * .97)]) : 0) + 120; GR3F = R3 * 3.2;   // 3D: unlinked notes on a sphere around the rest
      lone.forEach((j, q) => { const u = 1 - 2 * (q + .5) / lone.length, a = q * 2.39996, w = Math.sqrt(1 - u * u), r = R3 * (1 + .08 * hash(N[ids[j]].path, 5)); x[j] = r * w * Math.cos(a); y[j] = r * u; z[j] = r * w * Math.sin(a); }); }
    if (!GPH.x || GPH.x.length !== n) { GPH.x = new Float32Array(n); GPH.y = new Float32Array(n); GPH.z = new Float32Array(n); } for (let j = 0; j < m; j++) { GPH.x[ids[j]] = x[j]; GPH.y[ids[j]] = y[j]; GPH.z[ids[j]] = z ? z[j] : 0; } };
  let more = true; GPH.it = 0; const step = () => { more = F.step(); GPH.it++; GPH.its = more ? Math.max(GPH.it + 1, GPH.its || 0) : GPH.it; };
  // a first stretch right away, so the map opens close to its shape; the rest plays out on screen
  const t0 = performance.now(); while (more && performance.now() - t0 < 250) step(); place();
  let lastF = 0, looping = false;
  // kept for dragging: pin a note to the pointer and wake the physics; let go and it cools and settles again
  GPH.F = F; GPH.loc = loc; GPH.deg = deg; GPH.wake = () => { more = true; if (!looping && run === GPH.run) { looping = true; lastF = 0; RAF(frame); } };
  if (!more) return; looping = true;
  const frame = now => { const gapMs = lastF ? now - lastF : 16; lastF = now; if (run !== GPH.run || dead || !GRV()) { looping = false; if (run === GPH.run && more && !GPH.drag) GPH.key = ""; return; }
    // slow frames get more physics each, so the settle takes about the same time on any machine
    const f0 = performance.now(), bud = Math.min(400, Math.max(14, gapMs * .6)); while (more && performance.now() - f0 < bud) step(); GPH.stepMs = performance.now() - f0; place();
    if (IDV()) { for (let i=0;i<n;i++) if (vis[i]) { G3[3*i] = GPH.x[i]; G3[3*i+1] = GPH.y[i]; G3[3*i+2] = GPH.z[i]; } geoProj(); } else for (let i=0;i<n;i++) if (vis[i]) { EX[i] = GPH.x[i]; EY[i] = GPH.y[i]; }
    const d0 = performance.now(); if (!morphing) { X.set(EX); Y.set(EY); if (!GPH.touched) { layoutGraph(); const t = fitTarget(); k = t.k; tx = t.tx; ty = t.ty; } draw(); } GPH.drawMs = performance.now() - d0; GPH.morph = morphing;
    if (more) RAF(frame); else { looping = false; layoutGraph(); buildGrid(); if (!GPH.touched) fit(true); } };
  // the view follows the settling graph until you zoom or drag it yourself
  GPH.touched = false; if (!GPH.hooked) { GPH.hooked = true; for (const t of ["wheel", "pointerdown"]) cv.addEventListener(t, () => { GPH.touched = true; }, { passive: true }); }
  RAF(frame); }
EXP.graph = {
  layout: layoutGraph,
  // every link, faint, the way the core graph draws them; the picked note's links still light up on top
  // (at most about 7,000 lines a frame: past that, an even sample of the ones on screen, so a big vault stays smooth)
  guides(){ const on = []; for (let e = 0; e < E.length; e++) { const a = E[e][0], b = E[e][1]; if (!VV(a) || !VV(b)) continue; const x1 = sx(X[a]), y1 = sy(Y[a]), x2 = sx(X[b]), y2 = sy(Y[b]);
      if ((x1 < 0 && x2 < 0) || (x1 > W && x2 > W) || (y1 < 0 && y2 < 0) || (y1 > H && y2 > H)) continue; on.push(e); }
    const stp = Math.max(1, Math.ceil(on.length / 7000));
    ctx.strokeStyle = css["edge-faint"]; ctx.globalAlpha = (sel >= 0 || hover >= 0 ? .75 : 1) * Math.min(1, .45 + .55 / stp); ctx.lineWidth = 1; ctx.beginPath();
    for (let q = 0; q < on.length; q += stp) { const [a, b] = E[on[q]]; ctx.moveTo(sx(X[a]), sy(Y[a])); ctx.lineTo(sx(X[b]), sy(Y[b])); }
    ctx.stroke(); ctx.globalAlpha = 1; },
  legend: "Obsidian: every note pulled toward the notes it links to and pushed away from the rest, like Obsidian's graph view, drawn with the emergence symbols so hubs and maps stand out. Unlinked notes ring the outside. Drag a note and its links tug the rest along; let go and it settles. Click a note to light up its links; the Timelapse grows it, and Focus mode and Wander Mode work here too.",
};

EXP.ideaverse = { ...EXP.graph, legend: "Ideaverse: your whole vault as a ball of notes, pulled together by their links and pushed apart by each other, drawn with the emergence symbols. Drag to turn it, scroll to fly in; Orbit in Animations turns it (Earth and Spinning too). Unlinked notes sit on a shell around the rest. Click a note to light up its links." };

// ---------- PKM Planet: the six domains of personal knowledge as a world map on a table ----------
// Each note settles around a landmark in its domain (by folder and title); hubs and maps sit at the heart of each
// settlement, notes spiral out. Clicking a note raises arcs over the map to its links. The art is Nick Milo's PKM Planet.
const PS = 2000, PTILT = 48*Math.PI/180, PF = 3200;
const PD = {   // the six domains: color, and landmarks [name, u, v] as fractions of the map
  ideas: {name: "Ideas & Insights", col: "#ef6a4f", lm: [["Range of Reflection", .50, .12], ["Cabin of Solitude", .52, .15], ["Waterfall of Wonder", .51, .21], ["Camp of Ideation", .59, .26], ["Mysterious Spiral Staircase", .57, .19], ["Sensemaker's Lake", .57, .33], ["Ridge of Shadow Mapping", .35, .25]]},
  expr: {name: "Expressions & Outputs", col: "#c9cf3c", lm: [["Creator Studio", .66, .27], ["Typewriter's Cabin", .83, .29], ["Cafe of the World", .80, .41], ["Arena of Endless Expressions", .67, .45]]},
  prod: {name: "Productivity & Projects", col: "#3fc56a", lm: [["Bridge of Efforts", .76, .49], ["Productivity Pier", .59, .49], ["Financial District", .60, .53], ["Output Station", .64, .53], ["Timetracking Square", .70, .54], ["Central Command Park", .81, .54], ["Goal Getter Center", .70, .58]]},
  skills: {name: "Skills & Habits", col: "#3ab8d0", lm: [["Builder's Bay", .48, .66], ["Falls of Repeated Actions", .44, .69], ["Field of Reps", .53, .73], ["Grand Canyon of Habits", .49, .80], ["Path of Skill Acquisition", .59, .69], ["Bridge of Skill Stacks", .62, .63], ["Intuition Rapids", .38, .75], ["Temple of Virtues", .71, .68], ["Desert of Beliefs", .67, .75], ["Oasis of Permission", .65, .83], ["Mirage of Identity", .61, .87]]},
  rel: {name: "Relationships & Environments", col: "#8a6cf0", lm: [["Roles of Community", .25, .51], ["Roles of Close Friends", .19, .54], ["Roles of Family", .29, .55], ["Roles in Society", .36, .55], ["Plateau of Career Navigation", .15, .60], ["Canals of Life Experiences", .24, .63]]},
  mem: {name: "Memory & Inputs", col: "#ee5fc6", lm: [["Archipelago of Memories", .17, .46], ["Shores of Past Experiences", .24, .34], ["Information City", .27, .40], ["Library of Knowledge", .32, .36], ["Caves of the Ancient Paintings", .24, .22], ["Stones of the Forgotten Past", .22, .29], ["Ridge of Reverse Engineering", .35, .17]]},
  hub: {name: "The heart of the map", col: "#e8c27a", lm: [["Home", .33, .31], ["Town of Available Tools", .45, .56], ["Center of Personal Development", .52, .57]]},
};
const PLM = {}; for (const [dk, d] of Object.entries(PD)) for (const [nm, u, v] of d.lm) PLM[nm] = {dk, u, v};
function planetPlace(i){   // → [domain key, landmark name]
  const d = N[i], p = d.path, t = d.title.toLowerCase(), sub = (d.sub || "").toLowerCase(), c = (d.collections || []).map(x => x.toLowerCase()).join(" ");
  const pickIn = (dk, key) => { const L = PD[dk].lm; return [dk, L[Math.floor(hash(key || p, 71)*L.length)][0]]; };
  if (d.home) return ["hub", "Home"];
  if (d.archive || d.ace === "x") return ["mem", "Stones of the Forgotten Past"];
  if (d.ace === "+") return ["hub", "Town of Available Tools"];
  if (d.ace === "(root)") return ["hub", "Home"];
  if (/\b(habit|habits|practice|routine|workout|exercise|skill|skills|reps|training|meditation)\b/.test(t) || /logs?\b/.test(sub)) return pickIn("skills", sub + t.split(" ")[0]);
  if (/\b(meeting|call with|1:1|family|friend|friends|wedding|birthday|community)\b/.test(t) || /people|person|meetings?/.test(sub) || /people/.test(c)) return pickIn("rel", sub || t);
  if (d.ace === "Efforts") return /works?|writing|publish/.test(sub) || /\b(draft|script|post|video|newsletter|course|workshop|essay|book|chapter)\b/.test(t) ? pickIn("expr", sub) : pickIn("prod", sub);
  if (/\b(draft|script|post|video|newsletter|course|workshop|essay|chapter)\b/.test(t)) return pickIn("expr", sub);
  if (d.ace === "Calendar") { if (/reviews?/.test(sub)) return ["ideas", "Range of Reflection"]; if (/days?|journal|daily/.test(sub) || /^\d{4}-\d{2}-\d{2}/.test(d.title)) return [ "mem", hash(p, 73) < .5 ? "Archipelago of Memories" : "Shores of Past Experiences"]; return pickIn("prod", sub); }
  if (/sources?|clippings?|readwise|books?|articles?|quotes?/.test(sub) || /source|book|article/.test(c)) return ["mem", /quotes?/.test(sub) ? "Caves of the Ancient Paintings" : hash(p, 79) < .5 ? "Library of Knowledge" : "Information City"];
  if (/collections?/.test(sub)) return ["mem", "Information City"];
  if (/maps?/.test(sub) || d.level >= 3) return pickIn("ideas", d.level >= 4 ? "map-big" : sub);
  return pickIn("ideas", sub);
}
const planetProj = (u, v) => { const tl = PMODE === "flat" ? 0 : PTILT, x = (u - .5)*PS, y = (v - .5)*PS, z = -y*Math.sin(tl), sc = PF/(PF + z); return [x*sc, y*Math.cos(tl)*sc, sc]; };
let PLANET = {img: null, src: "", groups: []};
// ---------- The far side: the Creator's Continent ----------
// Only notes whose titles match a place on the continent (exactly or nearly), and notes from creative-work folders,
// cross over, up to a tenth of the map. A vault with none of them leaves the continent quiet.
const CR_COL = "#d2456f";
const CR_LM = [["Shadow Mapping", .316, .325], ["Mapmaking", .393, .341], ["Mapmaking", .598, .342], ["Spark List", .127, .377], ["Prewrite", .304, .392], ["Name it to frame it", .393, .396], ["Collect to Calm", .442, .396], ["Cluster for Clarity", .505, .407], ["Cluster to Create", .560, .415], ["Resolve the Tension", .584, .379], ["Map the Gap", .639, .418], ["Worldview", .233, .433], ["Workflows", .405, .443], ["Styles", .620, .437], ["Move to the Medium", .805, .437], ["The session before the session", .216, .458], ["Techniques", .389, .474], ["Daily Spark Weekly Arc", .478, .452], ["Rewrite", .665, .462], ["Forcing Function", .737, .464], ["Question Hexagon", .323, .487], ["Lower the Bar", .737, .491], ["Time Blocking", .568, .501], ["Translational Ideation", .868, .494], ["Outputs", .792, .503], ["Permission List", .247, .523], ["Hide the Notes", .761, .540], ["Flywheel", .857, .553], ["Freewrite", .412, .554], ["Send to Self", .687, .564], ["Garden Master", .485, .621], ["First Light, Last Light", .547, .761], ["Process", .453, .777]];
const CR_STOP = new Set(["the", "a", "an", "to", "it", "for", "of", "and", "my", "your", "on", "in", "moc", "map"]);
const crToks = t => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(w => w && !CR_STOP.has(w)).map(w => w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
const CR_T = CR_LM.map(([nm], j) => ({j, nm, t: crToks(nm)}));
const CR_WORK = ["Outputs", "Rewrite", "Freewrite", "Prewrite", "Styles", "Workflows", "Techniques", "Process", "Send to Self", "Move to the Medium"];
function creatorMatch(i){   // → [landmark index, by title?] or null
  const d = N[i], tt = new Set(crToks(d.title));
  for (const L of CR_T) { const ok = L.t.length === 1 ? tt.size <= 3 && tt.has(L.t[0]) : L.t.every(w => tt.has(w)) && tt.size <= L.t.length + 4;
    if (ok) { const same = CR_T.filter(x => x.nm === L.nm); return [same[Math.floor(hash(d.path, 83)*same.length)].j, true]; } }
  const sub = (d.sub || "").toLowerCase();
  if (/(^|\/)(works?|writing|drafts?|scripts?|essays?|manuscripts?|books?)(\/|$)/.test(sub) && !/sources?|clippings?|readwise|highlights?/.test(sub)) { const nm = CR_WORK[Math.floor(hash(d.path, 89)*CR_WORK.length)]; return [CR_LM.findIndex(l => l[0] === nm), false]; }
  return null; }
let CREATOR = {img: null, src: "", groups: []};
const PU = new Float32Array(n), PV = new Float32Array(n), PSIDE = new Uint8Array(n);   // where each note sits on its map (0 the PKM side, 1 the Creator side)
const P_RR = .4086;   // the PKM map's circle, as a fraction of its image (the frame around it stays off the globe)
const P_RF = P_RR/.75;
const P_LAB = [   // place names on the PKM map's outer ring [u, v, half-width, half-height], kept clear of the shoreline fade
  [.491, .108, .085, .022], [.332, .152, .08, .024], [.238, .209, .07, .026], [.245, .273, .07, .026], [.238, .329, .07, .026], [.577, .141, .06, .018], [.606, .179, .065, .026],
  [.772, .287, .06, .018], [.794, .411, .05, .026], [.789, .481, .05, .026], [.818, .524, .055, .03], [.775, .654, .1, .05], [.721, .672, .05, .026], [.642, .742, .06, .018],
  [.657, .837, .07, .018], [.606, .869, .065, .018], [.495, .802, .055, .026], [.375, .747, .045, .026], [.274, .675, .1, .05], [.253, .625, .065, .026], [.166, .589, .065, .03],
  [.202, .528, .055, .026], [.195, .43, .1, .05], [.27, .40, .045, .026]];   // the PKM map at three-quarters of its old size on the globe, so more of its side shows at once, with ocean around it
const CR_RR = 1;   // the Creator's Continent at half the PKM map's size: the dessert, not the main course (open sea fills the rest of its side)
function globeAngles(){ for (let i=0;i<n;i++) { const back = PSIDE[i] === 1, rr = back ? CR_RR : P_RF, dx = (PU[i] - .5)/rr, dy = (PV[i] - .5)/rr, rho = Math.min(1, Math.hypot(dx, dy)), th = rho*Math.PI/2, al = Math.atan2(dy, dx), st = Math.sin(th);
    const px = (back ? -1 : 1)*st*Math.cos(al), py = -st*Math.sin(al), pz = (back ? -1 : 1)*Math.cos(th); DTH[i] = Math.atan2(-pz, px); DPH[i] = Math.asin(Math.max(-1, Math.min(1, py))); } }
function planetImg(){ const src = host.planetSrc ? host.planetSrc() : ""; if (!src) return null;
  if (PLANET.src !== src) { PLANET.src = src; const im = new Image(); im.onload = () => { if (!dead) draw(); }; im.src = src; PLANET.img = im; }
  return PLANET.img && PLANET.img.complete && PLANET.img.naturalWidth ? PLANET.img : null; }
function creatorImg(){ const c = host.creatorSrc ? host.creatorSrc() : null; if (!c || !c.src) return null;
  if (CREATOR.src !== c.src) { CREATOR.src = c.src; CREATOR.disc = !!c.disc; const im = new Image(); im.onload = () => { if (!dead) draw(); }; im.src = c.src; CREATOR.img = im; }
  return CREATOR.img && CREATOR.img.complete && CREATOR.img.naturalWidth ? CREATOR.img : null; }
// The globe is painted on the graphics card: each pixel finds where its ray meets the sphere, then which map it falls on.
// The PKM map covers the near half, the Creator's Continent the far half, both laid out from their centers like a polar map.
const GL = {cv: null, gl: null, prog: null, ok: true, tex: [null, null], key: ["", ""], u: {}};
function glReady(){ if (GL.gl || !GL.ok) return GL.gl;
  try { const c = doc.createElement("canvas"), gl = c.getContext("webgl", {premultipliedAlpha: true, alpha: true, antialias: false}); if (!gl) { GL.ok = false; return null; }
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const vs = "attribute vec2 p; varying vec2 vUV; void main(){ vUV = vec2(p.x*.5 + .5, .5 - p.y*.5); gl_Position = vec4(p, 0., 1.); }";
    const fs = `precision highp float; varying vec2 vUV;
      uniform vec2 uOff, uSize; uniform vec3 uCam; uniform vec4 uRot; uniform float uR, uD, uRF, uRB, uPx, uHasB, uHasF, uDim; uniform sampler2D uF, uB; uniform vec4 uLab[24];
      const float HP = 1.5707963, RC = .4086;
      float hs(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7)))*43758.5453); }
      float vn(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3. - 2.*f); return mix(mix(hs(i), hs(i + vec2(1., 0.)), f.x), mix(hs(i + vec2(0., 1.)), hs(i + vec2(1., 1.)), f.x), f.y); }
      float fbm(vec2 q){ float v = 0., a = .5; for (int k = 0; k < 5; k++) { v += a*vn(q); q *= 2.07; a *= .5; } return v; }
      vec3 sea(vec3 p){   // the open ocean all round the globe: soft sea and cloud, drawn from the sea along the Creator map's rim
        vec3 base = uHasB > .5 ? mix(vec3(.6, .71, .72), texture2D(uB, vec2(.5, .975), 6.).rgb, .5) : vec3(.64, .74, .75);
        float cl = (fbm(p.xy*2.6 + 7.) + fbm(p.yz*2.6 + 1.3) + fbm(p.zx*2.6 + 4.2))/3.;   // drifting cloud, the same from every side
        float sw = (fbm(p.xy*9. + 2.) + fbm(p.yz*9. + 5.) + fbm(p.zx*9. + 8.))/3.;   // a little texture in the water
        vec3 c = base*(.94 + .12*sw); return mix(c, vec3(.9, .93, .93), smoothstep(.5, .64, cl)*.75); }
      vec3 front(vec3 p){   // the PKM map, its coastlines ending in an uneven shore a little inside its own edge, then ocean
        vec3 o = sea(p); if (uHasF < .5) return o;
        float rho = acos(clamp(p.z, -1., 1.))/HP, al = atan(-p.y, p.x); vec2 dir = vec2(cos(al), sin(al)); float r = uRF*rho, rn = r/RC;
        if (rn > 1.15) return o;
        float nz = fbm(dir*rho*7. + 3.1) - .5, m = 1. - smoothstep(.84, .97, rn + .11*nz);
        if (rn < 1.) { vec2 uv = vec2(.5) + r*dir; for (int k = 0; k < 24; k++) { vec2 dd = (uv - uLab[k].xy)/uLab[k].zw; m = max(m, 1. - smoothstep(.75, 1., length(dd))); } }   // place names near the edge stay readable
        vec3 c = texture2D(uF, vec2(.5) + min(r, RC*.99)*dir).rgb, mixc = mix(o, c, m);
        float shore = m*(1. - m)*4.; return mix(mixc, vec3(.88, .92, .9), .25*shore); }
      vec3 back(vec3 p){   // the Creator's Continent, an island in the same ocean
        vec3 o = sea(p); if (uHasB < .5) return o;
        float rho = acos(clamp(-p.z, -1., 1.))/HP, al = atan(-p.y, -p.x); float r = uRB*rho; if (r > .48) return o;
        vec3 c = texture2D(uB, vec2(.5) + r*vec2(cos(al), sin(al))).rgb; return mix(c, o, smoothstep(.42, .48, r)); }
      void main(){ vec2 w = (uOff + vUV*uSize - uCam.yz)/uCam.x; vec3 o = vec3(0., 0., uD), d = vec3(w.x, -w.y, -uD);
        float a = dot(d, d), b = 2.*dot(o, d), c = dot(o, o) - uR*uR, disc = b*b - 4.*a*c;
        float rs = uR*uD/sqrt(uD*uD - uR*uR), al = clamp((rs - length(w))/uPx + .5, 0., 1.); if (al <= 0.) { gl_FragColor = vec4(0.); return; }
        float t = (-b - sqrt(max(disc, 0.)))/(2.*a); vec3 q = o + t*d, nrm = normalize(q);
        float y = q.y*uRot.z + q.z*uRot.w, z1 = -q.y*uRot.w + q.z*uRot.z, x = q.x*uRot.x + z1*uRot.y, z = -q.x*uRot.y + z1*uRot.x; vec3 p = vec3(x, y, z)/uR;
        vec3 col = p.z >= 0. ? front(p) : back(p);   // both maps end in the same ocean, so the two halves meet without a seam
        float lt = max(dot(nrm, normalize(vec3(-.42, .5, .76))), 0.); col *= .58 + .5*lt; col *= mix(.78, 1., pow(max(nrm.z, 0.), .4)); col *= 1. - uDim;   // dims while a note is picked, so its links stand out
        gl_FragColor = vec4(col*al, al); }`;
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr); const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const nm of ["uOff", "uSize", "uCam", "uRot", "uR", "uD", "uRF", "uRB", "uPx", "uHasB", "uHasF", "uDim", "uF", "uB"]) GL.u[nm] = gl.getUniformLocation(pr, nm);
    gl.uniform1i(GL.u.uF, 0); gl.uniform1i(GL.u.uB, 1); GL.u.uLab = gl.getUniformLocation(pr, "uLab");
    gl.uniform4fv(GL.u.uLab, new Float32Array(P_LAB.flatMap(([u, v, w, h]) => [u, v, w, h]))); GL.cv = c; GL.gl = gl; GL.prog = pr; return gl; }
  catch { GL.ok = false; return null; } }   // no WebGL: the globe is drawn plain
function glTex(slot, im, key, disc){   // a square, power-of-two copy of the map (so it can be mipmapped); a rectangular Creator image is fitted to a disc
  const gl = GL.gl; if (!im) return false; if (GL.key[slot] === key) return true;
  const S = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), im.naturalWidth > 2600 ? 4096 : 2048), c = doc.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d");
  if (disc) g.drawImage(im, 0, 0, S, S);
  else { const f = im.naturalWidth/2000, sc = .83*S/1400; g.fillStyle = "rgb(186,206,203)"; g.fillRect(0, 0, S, S); g.drawImage(im, S/2 - 955*sc, S/2 - 775*sc, im.naturalWidth/f*sc, im.naturalHeight/f*sc); }
  try { const t = GL.tex[slot] || gl.createTexture(); gl.activeTexture(slot ? gl.TEXTURE1 : gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    GL.tex[slot] = t; GL.key[slot] = key; return true; }
  catch { GL.key[slot] = key; return false; } }   // an image the graphics card may not read: the globe shows plain sea there
function globeDraw(){
  const rs = CS_R*k*CS_D/Math.sqrt(CS_D*CS_D - CS_R*CS_R), cx = sx(0), cy = sy(0);
  const halo = ctx.createRadialGradient(cx, cy, rs*.98, cx, cy, rs*1.07); halo.addColorStop(0, "rgba(170,205,215,.16)"); halo.addColorStop(1, "rgba(170,205,215,0)");   // a thin line of sky
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, rs*1.07, 0, 6.2832); ctx.fill();
  const x0 = Math.max(0, Math.floor(cx - rs - 2)), y0 = Math.max(0, Math.floor(cy - rs - 2)), x1 = Math.min(W, Math.ceil(cx + rs + 2)), y1 = Math.min(H, Math.ceil(cy + rs + 2)); if (x1 <= x0 || y1 <= y0) return;
  const gl = glReady(); if (!gl) { ctx.fillStyle = css.panel; ctx.beginPath(); ctx.arc(cx, cy, rs, 0, 6.2832); ctx.fill(); return; }
  const pf = planetImg(), cr = creatorImg(), hasF = glTex(0, pf, PLANET.src, true), hasB = glTex(1, cr, CREATOR.src, CREATOR.disc);
  // a lighter globe while it turns keeps the motion smooth
  const moving = drifting || apdRaf || sphTurning || (drag && drag.orbit && moved), sc = Math.min(moving ? 1 : dpr, 2600/Math.max(x1 - x0, y1 - y0)), w = Math.max(1, Math.round((x1 - x0)*sc)), h = Math.max(1, Math.round((y1 - y0)*sc));
  if (GL.cv.width !== w || GL.cv.height !== h) { GL.cv.width = w; GL.cv.height = h; } gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  const U = GL.u; gl.uniform2f(U.uOff, x0, y0); gl.uniform2f(U.uSize, x1 - x0, y1 - y0); gl.uniform3f(U.uCam, k, tx, ty);
  gl.uniform4f(U.uRot, Math.cos(csYaw), Math.sin(csYaw), Math.cos(csPitch), Math.sin(csPitch)); gl.uniform1f(U.uR, CS_R); gl.uniform1f(U.uD, CS_D);
  gl.uniform1f(U.uRF, P_RF); gl.uniform1f(U.uDim, sel >= 0 ? .42 : hover >= 0 ? .18 : 0); gl.uniform1f(U.uRB, CR_RR); gl.uniform1f(U.uPx, 1/(k*sc)); gl.uniform1f(U.uHasF, hasF ? 1 : 0); gl.uniform1f(U.uHasB, hasB ? 1 : 0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.tex[0]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, GL.tex[1]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); ctx.drawImage(GL.cv, x0, y0, x1 - x0, y1 - y0); }
dbg.__ivTopVis = () => { let b = -1; for (let i=0;i<n;i++) if (VV(i) && N[i].level >= 3 && (b < 0 || N[i].score > N[b].score)) { const x = sx(X[i]), y = sy(Y[i]); if (x > 450 && x < W - 60 && y > 60 && y < H - 60) b = i; } return b < 0 ? null : [sx(X[b]), sy(Y[b]), N[b].title]; };
dbg.__ivGlobe = () => { let c = 0; for (let i=0;i<n;i++) if (PSIDE[i]) c++; return {gl: !!glReady(), ok: GL.ok, side1: c, groups: CREATOR.groups.length, works: N.filter(d => /works?/i.test(d.sub || '')).length, subs: [...new Set(N.map(d => d.sub))].slice(0, 30)}; };
// A settlement grows like a town, not a target: its maps and hubs make the old town at the heart, each note moves in
// next to a map it links to (small neighborhoods), the rest scatter around them, and each settlement has its own lean and shape.
function settle(ids, cu, cv, step, key){
  ids.sort(byRank); const R = step*Math.sqrt(ids.length + 1), th = hash(key, 103)*Math.PI, asp = .55 + .45*hash(key, 107), ct = Math.cos(th), st = Math.sin(th);
  const put = (i, dx, dy) => { const x = dx, y = dy*asp; PU[i] = cu + x*ct - y*st; PV[i] = cv + (x*st + y*ct)*.9; };
  const gauss = (i, salt) => { const u1 = Math.max(1e-6, hash(N[i].path, salt)), u2 = hash(N[i].path, salt + 1), m = Math.sqrt(-2*Math.log(u1)); return [m*Math.cos(6.2832*u2), m*Math.sin(6.2832*u2)]; };
  const maps = ids.filter(i => N[i].level >= 3), spot = new Map();
  maps.forEach((i, j) => { const a = j*2.39996 + hash(N[i].path, 109)*.8, r = R*.55*Math.sqrt((j + .3)/Math.max(1, maps.length))*(.7 + .5*hash(N[i].path, 113)); spot.set(i, [Math.cos(a)*r, Math.sin(a)*r]); put(i, ...spot.get(i)); });
  for (const i of ids) { if (spot.has(i)) continue;
    let an = -1; for (const j of out[i].concat(inn[i])) if (spot.has(j) && (an < 0 || N[j].score > N[an].score)) an = j;   // the best map it links to, in this settlement
    const [gx, gy] = gauss(i, 117), lone = N[i].level === 1;
    if (an >= 0) { const [ax, ay] = spot.get(an), sg = R*(.12 + .1*hash(N[an].path, 127)); put(i, ax + gx*sg, ay + gy*sg); }
    else { const sg = R*(lone ? .62 : .42); put(i, gx*sg, gy*sg); } }
}
function layoutPlanet(){
  for (let i=0;i<n;i++) RW[i] = RH[i] = 0;
  const groups = new Map(); for (let i=0;i<n;i++) { if (!vis[i]) continue; const [dk, lm] = planetPlace(i); if (!groups.has(lm)) groups.set(lm, {lm, dk, ids: []}); groups.get(lm).ids.push(i); }
  PSIDE.fill(0); const cg = new Map();
  if (PGLOBE) {   // the globe: matching notes cross to the Creator's Continent, up to a tenth of the map
    const cand = []; for (let i=0;i<n;i++) { if (!vis[i] || N[i].home) continue; const m = creatorMatch(i); if (m) cand.push([i, m[0], m[1]]); }
    let nv = 0; for (let i=0;i<n;i++) if (vis[i]) nv++;
    cand.sort((a, b) => (b[2] - a[2]) || byRank(a[0], b[0])); for (const [i, j] of cand.slice(0, Math.max(0, Math.floor(nv*.1)))) {
      const g = groups.get(planetPlace(i)[1]); if (g) g.ids.splice(g.ids.indexOf(i), 1); PSIDE[i] = 1; const nm = CR_LM[j][0] + "#" + j; if (!cg.has(nm)) cg.set(nm, {j, ids: []}); cg.get(nm).ids.push(i); } }
  for (const g of groups.values()) { const L = PLM[g.lm]; settle(g.ids, L.u, L.v + .012, Math.min(.0042, .085/Math.sqrt(g.ids.length)), g.lm);
    for (const i of g.ids) { const [x, y] = planetProj(PU[i], PV[i]); EX[i] = x; EY[i] = y; } }
  for (const g of cg.values()) { const [, lu, lv] = CR_LM[g.j]; settle(g.ids, lu, lv + .008, Math.min(.0055, .1/Math.sqrt(g.ids.length)), "cr" + g.j); }
  PLANET.groups = [...groups.values()]; CREATOR.groups = [...cg.values()];
  if (PGLOBE) { sphCam("globe"); globeAngles(); csProject(); EX.set(DX); EY.set(DY); planetImg(); creatorImg(); const cn = CREATOR.groups.reduce((t, g) => t + g.ids.length, 0); if (cn !== CREATOR.n) { CREATOR.n = cn; if (view === "planet") Promise.resolve().then(() => legend()); } return; }
  const a = planetProj(0, 0), b = planetProj(1, 1); expBox = {x0: b[0]*-1 - 20, y0: a[1] - 20, x1: b[0] + 20, y1: b[1] + 20}; planetImg(); }
EXP.planet = {
  layout: layoutPlanet,
  guides(){ if (globeOn()) { globeDraw(); return; } const im = planetImg(); const NSTR = 220;
    if (!im) { ctx.fillStyle = css.panel; const [x0, y0] = planetProj(0, 0), [x1, y1] = planetProj(1, 1); ctx.fillRect(sx(-x1), sy(y0), (2*x1)*k, (y1 - y0)*k); return; }
    const iw = im.naturalWidth, ih = im.naturalHeight;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 24*Math.min(1, k); ctx.shadowOffsetY = 10*Math.min(1, k);
    for (let s_ = 0; s_ < NSTR; s_++) { const v0 = s_/NSTR, v1 = (s_ + 1)/NSTR, [, Y0] = planetProj(.5, v0), [, Y1, sc] = planetProj(.5, (v0 + v1)/2), [, Y2] = planetProj(.5, v1);
      const w = PS*sc; ctx.drawImage(im, 0, v0*ih, iw, (v1 - v0)*ih + 1, sx(-w/2), sy(Y0), w*k, (Y2 - Y0)*k + 1); if (s_ === 0) ctx.shadowColor = "transparent"; }
    ctx.restore();
    const dm = sel >= 0 ? .42 : hover >= 0 ? .18 : 0;   // the map dims while a note is picked, as the globe does, so its links stand out
    if (dm) { const P = [planetProj(0, 0), planetProj(1, 0), planetProj(1, 1), planetProj(0, 1)]; ctx.fillStyle = `rgba(0,0,0,${dm})`; ctx.beginPath(); P.forEach((q, j) => j ? ctx.lineTo(sx(q[0]), sy(q[1])) : ctx.moveTo(sx(q[0]), sy(q[1]))); ctx.closePath(); ctx.fill(); } },
  notes(lit, dim){ const r0 = Math.max(1.3, 2.1*Math.pow(k, .5));
    if (globeOn()) { for (const [col, list] of [...PLANET.groups.map(g => [PD[g.dk].col, g.ids]), ...CREATOR.groups.map(g => [CR_COL, g.ids])])
      for (const i of list) { if (!VV(i)) continue; const x = sx(X[i]), y = sy(Y[i]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        ctx.globalAlpha = lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .25 : .7) : 1; const lv = N[i].level;
        if (lv >= 3) { const r = rad(i)*.85; ctx.fillStyle = lvFill(i, x, y, r); ctx.beginPath(); shape(lv, x, y, r); ctx.fill(); ctx.strokeStyle = "rgba(40,25,10,.7)"; ctx.lineWidth = 1; ctx.stroke(); continue; }
        ctx.beginPath(); ctx.arc(x, y, lv === 2 ? r0 : r0*.8, 0, 6.2832); if (lv === 2) { ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "rgba(40,25,10,.55)"; ctx.lineWidth = .8; ctx.stroke(); } else { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); } }
      ctx.globalAlpha = 1; return; }
    for (const g of PLANET.groups) { const col = PD[g.dk].col;
      for (const i of g.ids) { if (!VV(i)) continue; const x = sx(EX[i]), y = sy(EY[i]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        ctx.globalAlpha = lit && !lit.has(i) && dim < 1 ? (sel >= 0 ? .25 : .7) : 1; const lv = N[i].level;
        if (lv >= 3) { const r = rad(i); ctx.fillStyle = lvFill(i, x, y, r); ctx.beginPath(); shape(lv, x, y, r); ctx.fill(); ctx.strokeStyle = "rgba(40,25,10,.7)"; ctx.lineWidth = 1; ctx.stroke(); continue; }
        ctx.beginPath(); ctx.arc(x, y, lv === 2 ? r0 : r0*.8, 0, 6.2832);
        if (lv === 2) { ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "rgba(40,25,10,.55)"; ctx.lineWidth = .8; ctx.stroke(); } else { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); } } }
    ctx.globalAlpha = 1; },
  ownLabels: true,
  get legend(){ return globeOn() ? "Planet · Globe: the PKM Planet on the near side, the Creator's Continent on the far side. Drag to turn it; click a note to raise arcs to its links."
    : `Planet · ${PMODE === "flat" ? "Flat" : "Tabletop"}: the six domains of personal knowledge. Click a note to raise arcs to its links.`; },
  get about(){ return [
    "Domains. Each note settles around a landmark in one of the six domains of personal knowledge (Ideas & Insights, Expressions & Outputs, Productivity & Projects, Skills & Habits, Relationships & Environments, Memory & Inputs), by its folder and title. Home and your inbox sit at the heart of the map.",
    "Settlements. Maps and hubs make the old town at the center of each settlement; every other note moves in next to the map it links to most, and the rest scatter around the edges.",
    ...(globeOn() ? [`The far side. A note crosses to the Creator's Continent only when its title matches a place there, or it lives in a creative-work folder, up to a tenth of the map (${CREATOR.groups.reduce((t, g) => t + g.ids.length, 0).toLocaleString()} here). Links that pass behind the globe are dashed.`] : []),
    "Map art: PKM Planet" + (globeOn() ? " and the Creator's Continent" : "") + " by Nick Milo." ]; },
};
let chArc = -1, chPin = -1;   // the arc under the cursor, and the one clicked to hold its ribbons
const chOn = () => chArc >= 0 ? chArc : chPin;
function showArcTip(a){   // the arc tooltip, set beside the ring on the arc's own side, never over the ribbons
  const c = CHCAT[a], rows = chRibbons().filter(r => r.p === a || r.q === a).map(r => [CHCAT[r.p === a ? r.q : r.p].short, r.c]).sort((x,y) => y[1] - x[1]), tot = rows.reduce((t, r) => t + r[1], 0);
      html(tip).v = `<b>${esc(c.short)}</b><span>${c.ids.filter(j => VV(j)).length.toLocaleString()} notes · ${tot.toLocaleString()} links to other kinds</span>` + rows.slice(0, 12).map(([nm, ct]) => `<span class="trow"><i>${esc(nm)}</i><b>${ct.toLocaleString()}</b></span>`).join("") + (rows.length > 12 ? `<span>+ ${rows.length - 12} more kinds</span>` : "");
      tip.hidden = false; tip.classList.add("arc");   // set it beside the ring on the arc's own side, never over the ribbons
      const r = cv.getBoundingClientRect(), cx = r.left + sx(CH_C.x), cy = r.top + sy(CH_C.y), R0 = CH_R*k*1.45, am = (c.a0 + c.a1)/2, tw = tip.offsetWidth, th = tip.offsetHeight;
      let barB = 0; for (const id of ["animdock"]) { const el = $("#" + id); if (el && !el.hidden && el.offsetParent) barB = Math.max(barB, el.getBoundingClientRect().bottom); }
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
  for (const c of CHCAT) { if (c.a1 <= c.a0) continue; ctx.strokeStyle = chHue(c); ctx.globalAlpha = .75; ctx.lineWidth = Math.max(3, R0*.03); ctx.beginPath(); ctx.arc(cx, cy, R0*1.07, c.a0, c.a1); ctx.stroke();
    ctx.globalAlpha = .05; ctx.lineWidth = R0*.12; ctx.beginPath(); ctx.arc(cx, cy, R0*.955, c.a0, c.a1); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // ribbons: one curve per pair of kinds, through the middle, width by how many links join them
  const hl = sel >= 0 ? sel : hover, fade = hl >= 0 ? .25 : 1, RIB = chRibbons(), mx = ribMax();   // width ∝ √(links between the two kinds); fixed scale, so ribbons visibly thicken over the years
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
    // thin disks for galaxies; nebulae and the old elliptical are round clouds: depth thins toward the edge, and clusters near the middle (so no side of them is ever straight)
    if (!b || B3[bi].flat) L3[3*i+2] = !b ? h*80 : h*b.r*(N[i].level >= 3 ? .05 : .12);
    else { const d = Math.hypot(L3[3*i], L3[3*i+1]), room = Math.sqrt(Math.max((.95*b.r)**2 - d*d, (.18*b.r)**2)), g = (hash(N[i].path, 35) + hash(N[i].path, 36) + hash(N[i].path, 37) - 1.5)/1.5; L3[3*i+2] = g*room; } }
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
const DRIFT = {calm: [.018, 70], slow: [.035, 44], lively: [.07, 26], earth: [.05, 0], spin: [.45, 0]};   // spin: Earth, fast (the 3D Obsidian map)
const earthy = () => driftSpeed === "earth" || driftSpeed === "spin";   // earth: every 3D map, a steady spin at a fixed 20° tilt   // [radians of orbit per second, seconds per in-and-out breath]
function driftPick(){ const gals = BODIES.filter(b => b.kind === "gal" && b.members.some(i => VV(i)));
  if (!gals.length) return -1; let tot = 0; for (const b of gals) tot += Math.sqrt(b.members.length);
  let r = Math.random()*tot; for (const b of gals) { r -= Math.sqrt(b.members.length); if (r <= 0 && b.id !== driftGal) return b.id; } return gals[0].id; }
function driftFrame(now){
  if (!drifting) return; driftRaf = RAF(driftFrame);
  if (!(s3dOn() || sphOn() || geo3On())) { const dt = Math.min(.1, (now - driftLast)/1000); driftLast = now; if (!dt || morphing) return;   // flat maps: a slow glide and a gentle in-and-out, faster at Lively
    const sp = DRIFT[earthy() ? "slow" : driftSpeed][0]/.035, t = (now - driftT0)/1000*sp;
    if (domeOn()) { domeYaw += .03*sp*dt; domeProject(); X.set(DX); Y.set(DY); }
    else { const px = 9*sp*Math.sin(t*.23), py = 6*sp*Math.cos(t*.17); tx += px*dt; ty += py*dt; const f = 1 + .012*Math.cos(t*.5)*sp*dt, cx = W/2, cy = H/2; tx = cx - (cx - tx)*f; ty = cy - (cy - ty)*f; k *= f; }
    render(); return; }
  if (geo3On()) { const dt = Math.min(.1, (now - driftLast)/1000); driftLast = now; const [spin, breath] = DRIFT[driftSpeed], t = (now - driftT0)/1000;
    // (the Obsidian map turns faster, still swaying as it goes: Lively as fast as Spinning, Slow what Lively was at 2½×, Calm what Slow was)
    const gSp = GRV() ? { calm: .035, slow: .175, lively: DRIFT.spin[0] }[driftSpeed] : null;
    g3Yaw -= (gSp != null ? gSp : spin)*1.6*dt; g3Pitch = earthy() ? 20*Math.PI/180 : .35 + .3*Math.sin(t*2*Math.PI/((breath || 30)*1.4)); geoProj(); X.set(EX); Y.set(EY); render(); return; }
  if (sphOn()) { const dt = Math.min(.1, (now - driftLast)/1000); driftLast = now; const [spin, breath] = DRIFT[driftSpeed], t = (now - driftT0)/1000;   // the globe turns slowly, tilting as it goes
    csYaw += spin*1.6*dt; csPitch = earthy() ? 20*Math.PI/180 : .3 + .32*Math.sin(t*2*Math.PI/(breath*1.4)); csProject(); X.set(DX); Y.set(DY); if (globeOn()) { EX.set(DX); EY.set(DY); } render(); return; }
  const dt = Math.min(.1, (now - driftLast)/1000); driftLast = now; const [spin, breath] = DRIFT[earthy() ? "slow" : driftSpeed], t = (now - driftT0)/1000;
  if (earthy()) { yaw3 += DRIFT[driftSpeed][0]*dt; pitch3 = 20*Math.PI/180; project3D(); X.set(P3X); Y.set(P3Y); render(); return; }   // Earth: a steady turn at a fixed 20° tilt, no zooming in
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
function driftStart(){ if (drifting) return; drifting = true; driftK0 = fitTarget().k*.95; driftT0 = driftLast = performance.now(); driftCyc = -1;
  $("#dplay").textContent = "❚❚"; $("#dplay").setAttribute("aria-label", "Stop drifting"); driftRaf = RAF(driftFrame); }
function driftStop(){ if (!drifting) return; drifting = false; win.cancelAnimationFrame(driftRaf); const b = $("#dplay"); if (b) { b.textContent = "▶"; b.setAttribute("aria-label", "Drift"); }
  buildGrid(); if (geo3On()) g3Keep(); else if (sphOn()) csKeep(); else if (s3dOn()) save("iv-cam3", [yaw3, pitch3]); draw(); }
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
else if (expOn()) { EHID.fill(0); EXP[view].layout(); X.set(EX); Y.set(EY); }
if (domeOn()) { domeUse(); domeAngles(Float32Array.from(X), Float32Array.from(Y)); domeProject(); X.set(DX); Y.set(DY); }
if (csphOn()) { csAngles(); csProject(); X.set(DX); Y.set(DY); }
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
  if (hd && fb) hd.toggleClass("has-fb", !fb.hidden); syncTB();
  root.querySelectorAll(".ms").forEach(ms => { const x = ms.querySelector(":scope > .qx"); ms.toggleClass("has-x", !!x && !x.hidden); }); }
function resize(){ syncCls(); const r = cv.getBoundingClientRect(); dpr = Math.min(doc.body.classList.contains("is-mobile") ? 1.5 : 2, win.devicePixelRatio||1);   /* phones and tablets draw a little lighter */ const firstSize = !(W > 0) && r.width > 0, cx = W ? (W/2 - tx)/k : null, cy = H ? (H/2 - ty)/k : null; W = r.width; H = r.height; if (cx !== null && !morphing && r.width) { tx = W/2 - cx*k; ty = H/2 - cy*k; } cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); if (firstSize || !isFinite(k) || !isFinite(tx)) { const f = fitTarget(); if (isFinite(f.k) && f.k > 0) { k = f.k; tx = f.tx; ty = f.ty; } } draw(); }   // opened while hidden (a base still laying out): fit once it has a size
function fitTarget(){ const pad = 56;
  if (globeOn()) { const lc = isPhone() ? 0 : 400, vw = W - sideW() - lc; return {k: .44*Math.min(vw, H)/(CS_R*1.08), tx: lc + vw/2, ty: H/2}; }
  if (expOn()) { const lc = isPhone() ? 0 : 400, vw = W - sideW() - lc, b = expBox, bw = b.x1 - b.x0, bh = b.y1 - b.y0, kk = Math.min((vw - pad)/bw, (H - pad)/bh);   // beside the bars' column
    return {k: kk, tx: lc + vw/2 - (b.x0 + bw/2)*kk, ty: H/2 - (b.y0 + bh/2)*kk}; }
  if (csphOn()) { const vw = W - (isPhone() ? 0 : sideW()); return {k: .4*Math.min(vw, H)/(CS_R*1.08), tx: vw/2, ty: H/2}; }
  if (domeOn()) { const vw = W - (isPhone() ? 0 : sideW()); return {k: Math.max(vw, H*1.2)/2/(DF_*Math.tan(52*Math.PI/180)), tx: vw/2, ty: H/2}; }   // about a 104° view
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
let sphTw = 0, sphTurning = false;
function sphFace(i){   // a globe turns the note to face you instead of zooming in on it
  const y1 = DTH[i] + Math.PI/2, p1 = Math.max(-1.3, Math.min(1.3, DPH[i])), y0 = csYaw, p0 = csPitch, dy = Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)), t0 = performance.now(), id = ++sphTw, f = fitTarget();
  const step = now => { if (id !== sphTw || dead) return; const t = Math.min(1, (now - t0)/900), e = t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
    csYaw = y0 + dy*e; csPitch = p0 + (p1 - p0)*e; k = k + (f.k - k)*e*.25; tx = tx + (f.tx - tx)*e*.25; ty = ty + (f.ty - ty)*e*.25;
    csProject(); X.set(DX); Y.set(DY); if (globeOn()) { EX.set(DX); EY.set(DY); } render(); if (t < 1) RAF(step); else { sphTurning = false; buildGrid(); csKeep(); draw(); } };
  sphTurning = true; RAF(step); }
function flyTo(i){
  if (sphOn()) { sphFace(i); return; }
  if (view === "stars" && lastDown) {   // Starfield: a click on a galaxy's name glides into that galaxy and frames it
    const g = LH.find(q => q[5] != null && q[4] === i && lastDown[0] >= q[0] && lastDown[0] <= q[0] + q[2] && lastDown[1] >= q[1] && lastDown[1] <= q[1] + q[3]);
    if (g) { lastDown = null; const b = BODIES[g[5]], [bx_, by_] = bodyPos(b), phone = isPhone(), dw = phone ? 0 : sideW(), lc = phone ? 0 : 400, vw = W - dw - lc, vh = phone ? H*.48 : H;
      const R = b.r*(S3D && B3[b.id] ? B3[b.id].s : 1), kk = Math.min(6, Math.max(.3, Math.min(vw, vh)*.42/Math.max(R, 20)));
      animateTo({k: kk, tx: lc + vw/2 - bx_*kk, ty: vh/2 - by_*kk}); return; } }
  if (domeOn()) { domeYaw = DTH[i]; domePitch = Math.max(domeSphere() ? -1.45 : -.2, Math.min(1.45, DPH[i] - .08)); domeKeep(); const kk = k; morph(true, () => ({k: kk, tx: (W - (isPhone() ? 0 : sideW()))/2, ty: H/2})); return; }   // in a dome: turn to face it
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
  if (domeOn()) return;
  const x = sx(X[i]), y = sy(Y[i]), m = 60; let dx = 0, dy = 0;
  if (x > W - m) dx = (W*0.62) - x; else if (x < m) dx = W*0.38 - x;
  if (y > H - m) dy = H*0.6 - y; else if (y < m) dy = H*0.4 - y;
  if (dx || dy) animateTo({k, tx: tx + dx, ty: ty + dy});
}
function sideW(){ // width covered on the right by the note panel and any open side panel (desktop)
  if (isPhone()) return 0; let w = 0;
  if (!$("#effpanel").hidden || !$("#scorepanel").hidden || !$("#callpanel").hidden) w += 352;
  return Math.min(w, W - 240);
}
function visTarget(xs, ys){   // camera that frames every visible note, given where the notes are (or will be)
  const phone = isPhone(), dw = sideW(), vw = W - dw, vh = phone && sel >= 0 ? H*.48 : H, pad = phone ? 40 : 80;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, c = 0;
  const pa = view === "people" && typeof pplActive === "function" ? pplActive() : null;   // People: frame the note, its people and (two steps) their notes
  if (pa) { for (const i of pa.notes) { c++; x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
    for (const h of pa.hubs) { const p_ = PPL.hubs[h]; if (!p_) continue; c++; x0 = Math.min(x0, p_.x); x1 = Math.max(x1, p_.x); y0 = Math.min(y0, p_.y); y1 = Math.max(y1, p_.y); } }
  else for (let i=0;i<n;i++) if (vis[i] && !(EHID[i] && expOn())) { c++; x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
  if (!c) return null;
  const kk = Math.min(4, Math.max(.1, Math.min((vw - pad*2) / Math.max(x1-x0, 40), (vh - pad*2 - 40) / Math.max(y1-y0, 40))));
  return {k:kk, tx: vw/2 - (x0+x1)/2*kk, ty: (vh + 40)/2 - (y0+y1)/2*kk};
}
function rad(i){ if (view === "stars") return Math.max(.7*BOOST, Math.min(SR[i]*Math.pow(k, .5)*(S3D ? DS3[i] : 1)*BOOST, 16)); return Math.max((view === "lincal" ? 1.8 : 1.1)*BOOST, Math.min(R[i]*Math.pow(k, .55)*(geo3On() ? DS3[i] : view === "lincal" ? 1.5 : 1)*BOOST, 30)); }   // 3D Geometric: nearer notes are bigger

function render(){
  raf = 0;
  if (!(W > 0 && H > 0) || !isFinite(k) || !isFinite(tx) || !isFinite(ty)) return;   // hidden (a background tab or a base still laying out): nothing to draw yet
  if (!popFrozen) popNow = performance.now();
  const swap = view === "stars" ? Object.fromEntries(Object.keys(SPACE).map(kk => [kk, css[kk]])) : null;
  if (swap) Object.assign(css, SPACE);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = css.bg; ctx.fillRect(0,0,W,H);

  if (view === "stars") starsBg();
  else if (domeOn()) domeGuides();
  else if (view === "sense") senseGuides();
  else if (view === "gravity") gravityGuides();
  else if (csphOn()) csGuides();
  else if (expOn()) { if (EXP[view].guides) EXP[view].guides(); }
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

  if ((view === "emergence" && !domeOn()) || view === "arc") levelNames(); else if (view === "spacetime" && !domeOn()) rowNames();
  // links
  if (focus >= 0 && !showAll) {   // in focus: every link among the focused notes, faint
    ctx.strokeStyle = css.muted; ctx.globalAlpha = .28; ctx.lineWidth = 1; ctx.beginPath();
    for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; ctx.moveTo(sx(X[a]), sy(Y[a])); ctx.lineTo(sx(X[b]), sy(Y[b])); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (showAll) {
    ctx.strokeStyle = css["edge-faint"]; ctx.lineWidth = 1; ctx.beginPath();
    if (sphOn()) { for (const [a,b] of E) { if (VV(a) && VV(b)) csStroke(csArc(DTH[a], DPH[a], DTH[b], DPH[b], 10)); } }
    else if (view === "chord") { const cx = sx(CH_C.x), cy = sy(CH_C.y); for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; const x1 = sx(X[a]), y1 = sy(Y[a]), x2 = sx(X[b]), y2 = sy(Y[b]); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx + ((x1+x2)/2 - cx)*.25, cy + ((y1+y2)/2 - cy)*.25, x2, y2); } }
    else for (const [a,b] of E) { if (!VV(a) || !VV(b)) continue; ctx.moveTo(sx(X[a]), sy(Y[a])); ctx.lineTo(sx(X[b]), sy(Y[b])); }
    ctx.stroke();
  }
  const hl = sel >= 0 ? sel : hover;
  let lit = null;
  if (hl >= 0) {
    lit = new Set([hl]);
    const nb = new Set([...out[hl], ...inn[hl]].filter(j => VV(j) || (sphOn() && vis[j] && shownAt(j))));   // Corona: links to the far side of the globe still draw
    const many = Math.min(1, Math.max(.22, Math.sqrt(80 / Math.max(1, nb.size))));   // a hub's hundreds of links each draw fainter, so they don't fuse into solid beams
    // Starfield: a hub's links to the small stars of one galaxy travel as one bundle, ending where those stars sit
    const bundle = view === "stars" && nb.size > 60 ? new Map() : null;
    for (const j of nb) {
      lit.add(j);
      if (bundle && N[j].level < 5 && BOD[j] >= 0) { const g = bundle.get(BOD[j]) || bundle.set(BOD[j], []).get(BOD[j]); g.push(j); continue; }
      const upward = N[j].level > N[hl].level || (N[j].level === N[hl].level && Y[j] < Y[hl]);
      ctx.strokeStyle = edgeColor(hl, j, upward); ctx.globalAlpha = (sel >= 0 ? .75 : .5)*many; ctx.lineWidth = sel >= 0 ? 1.4 : 1;
      const x1 = sx(X[hl]), y1 = sy(Y[hl]), x2 = sx(X[j]), y2 = sy(Y[j]);
      let mx = (x1+x2)/2, my = (y1+y2)/2 - (view === "planet" ? Math.hypot(x2-x1, y2-y1)*.55 : GRV() ? 0 : Math.abs(x2-x1)*.12);   // PKM Planet: links arc up off the table
      if (view === "chord") { const cx = sx(CH_C.x), cy = sy(CH_C.y); mx = cx + ((x1+x2)/2 - cx)*.25; my = cy + ((y1+y2)/2 - cy)*.25; }
      if (sphOn()) { const pts = csArc(DTH[hl], DPH[hl], DTH[j], DPH[j], 26); ctx.beginPath(); csStroke(pts); ctx.stroke();
        if (csOut()) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga*.45; ctx.setLineDash([3, 4]); ctx.beginPath(); let on = false;   // the part behind the globe: dashed, so every link shows
          for (const q of pts) { if (!q[2]) { on = false; continue; } const x = sx(q[0]), y = sy(q[1]); if (on) ctx.lineTo(x, y); else { ctx.moveTo(x, y); on = true; } } ctx.stroke(); ctx.setLineDash([]);
          if (!DFR[j]) { ctx.beginPath(); ctx.arc(sx(DX[j]), sy(DY[j]), 3, 0, 6.2832); ctx.stroke(); }   // and a ring where the far note sits
          ctx.globalAlpha = ga; }
        continue; }
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(mx,my,x2,y2); ctx.stroke();
    }
    if (bundle) { const x1 = sx(X[hl]), y1 = sy(Y[hl]);
      for (const g of bundle.values()) { let cx = 0, cy = 0; for (const j of g) { cx += sx(X[j]); cy += sy(Y[j]); } cx /= g.length; cy /= g.length;
        const up = N[g[0]].level > N[hl].level, mx = (x1+cx)/2, my = (y1+cy)/2 - Math.abs(cx-x1)*.12;
        ctx.strokeStyle = edgeColor(hl, g[0], up); ctx.globalAlpha = sel >= 0 ? .55 : .4; ctx.lineWidth = Math.min(7, 1 + 1.3*Math.log2(g.length));
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, cx, cy); ctx.stroke();
        ctx.globalAlpha = (sel >= 0 ? .3 : .2); ctx.lineWidth = .8; ctx.beginPath();   // and fans out, faintly, to each star
        for (const j of g) { ctx.moveTo(cx, cy); ctx.lineTo(sx(X[j]), sy(Y[j])); } ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }

  if (GROWV() && senseT != null) { const vw = W - (isPhone() ? 0 : sideW()), cen = domeOn() || csphOn() ? null : view === "gravity" ? GC : view === "chord" ? CH_C : null;
    drawWatermark(cen ? sx(cen.x) : vw/2, cen ? sy(cen.y) - Math.min(vw, H)*.06 : H*.5, Math.min(vw, H)*.3, css.ink, .07); }
  // notes: bottom levels first, batched
  const vx0 = -30, vx1 = W+30, vy0 = -30, vy1 = H+30;
  // hovering fades the rest gently; a click (selection) fades it fully, like the link lines
  // the rest fades to a quarter when a note is picked; on the Obsidian map half as much (to about 60%), so the graph stays visible around it
  const dim = lit && !(focus >= 0 && (sel === focus || sel < 0) && hover < 0) ? (sel >= 0 ? (GRV() ? .62 : .25) : (GRV() ? .85 : .7)) : 1;
  if (view === "stars") starsNotes(lit, dim); else if (expOn() && EXP[view].notes) EXP[view].notes(lit, dim); else {
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
// ---- the domes' guides: the horizon, the bands of sky, the years (or folders) around you; drawn as lines that break where they pass behind you
function domePath(pts){ let on = false; for (const [th, ph] of pts) { const p = domeCam(th, ph); if (!p) { on = false; continue; } const x = sx(p[0]), y = sy(p[1]); if (on) ctx.lineTo(x, y); else { ctx.moveTo(x, y); on = true; } } }
const domeCircle = (ph, a0 = -Math.PI, a1 = Math.PI) => { const o = []; for (let t = a0; t <= a1 + 1e-6; t += Math.PI/90) o.push([t, ph]); return o; };
const domeMeridian = (th, p0, p1) => { const o = []; for (let p = p0; p <= p1 + 1e-6; p += Math.PI/90) o.push([th, p]); return o; };
function domeGuides(){
  ctx.lineWidth = 1; ctx.strokeStyle = css.line; ctx.beginPath(); domePath(domeCircle(0)); ctx.stroke();   // the horizon
  if (view === "spacetime" || view === "emergence") {
    const a0 = -Math.PI + STGAP/2, a1 = Math.PI - STGAP/2, P = Math.PI/2 - .01, byTime = view === "spacetime" || mode === "time";
    ctx.beginPath();
    if (view === "spacetime") ROWS.forEach((r, j) => { if (j) domePath(domeCircle(stPhiC(r.c0 - .004), a0, a1)); });
    else LEVELS.forEach((L, j) => { if (j) domePath(domeCircle(stPhiC((bandY[L.lv].y0 - GAP_Y/2)/WH), a0, a1)); });
    ctx.stroke();
    ctx.setLineDash([2, 4]); ctx.beginPath();
    if (byTime) { for (let yr = fromY; yr <= yrEnd(); yr++) { if (yr < fullY && yr % 5 && yr !== fromY) continue; domePath(domeMeridian(stTheta(xTime(Date.UTC(yr, 0, 1))), -P, P)); } }
    else if (mode === "ace") cols.forEach((c, j) => { if (j) domePath(domeMeridian(stTheta(c.x0 - 30), -P, P)); });
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = css.accent; ctx.globalAlpha = .55; ctx.beginPath(); for (const th of [a0, a1]) domePath(domeMeridian(th, -P, P)); ctx.stroke();   // the seam: start | today
    if (senseT != null && byTime) { ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); domePath(domeMeridian(stTheta(xTime(Math.min(senseT, T1))), -P, P)); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; }
    ctx.globalAlpha = 1;
  } else {
    ctx.beginPath(); for (const L of LEVELS) { const a = RING[L.lv][0]; if (a > 0) domePath(domeCircle(grPhi(a - .015))); } domePath(domeCircle(grPhi(1))); ctx.stroke();
    ctx.setLineDash([2, 4]); ctx.beginPath();
    if (mode === "time") { for (let yr = fromY; yr <= yrEnd(); yr++) { if (yr < fullY && yr % 5 && yr !== fromY) continue; domePath(domeMeridian(angOf(xTime(Date.UTC(yr, 0, 1))), grPhi(1), grPhi(.15))); } }
    else for (const c of cols) domePath(domeMeridian(angOf(c.x0), grPhi(1), grPhi(.15)));
    ctx.stroke(); ctx.setLineDash([]);
  }
}
function domeLabels(){   // band names ride along the left of your view; years (or folders) sit just above the horizon
  const vw = W - (isPhone() ? 0 : sideW()), half = Math.atan((vw/2)/(k*DF_)), thL = domeYaw - half*.8;
  ctx.textBaseline = "middle"; ctx.lineWidth = 5; ctx.strokeStyle = css.bg;
  const put = (txt, th, ph, font, color, align) => { const p = domeCam(th, ph); if (!p) return; const x = sx(p[0]), y = sy(p[1]);
    if (x < -80 || x > W + 80 || y < -20 || y > H + 20) return; ctx.font = font; ctx.textAlign = align || "center"; ctx.fillStyle = color; ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y); };
  const big = `${css.dw} 16px ${css.display}`, small = `500 11px ${css.mono}`, DG = Math.PI/180;
  if (view === "spacetime" || view === "emergence") {
    if (view === "spacetime") for (const r of ROWS) put(rowName(r.key), thL, Math.min(88*DG, stPhiC(r.c0) - 2*DG), big, css.ink, "left");
    else for (const L of LEVELS) put(`${L.lv} · ${L.name.toUpperCase()}`, thL, Math.min(86*DG, stPhiC(bandY[L.lv].y0/WH) - 3*DG), small, css.accent, "left");
    const ph = Math.abs(domePitch) > 1.15 ? Math.sign(domePitch)*68*DG : domePitch - 6*DG;   // year names run across the middle of your view; at a pole they ring it like a clock
    if (view === "spacetime" || mode === "time") for (let yr = fromY; yr <= yrEnd(); yr++) { const comp = yr < fullY; if (comp && yr % 5 && yr !== fromY) continue;
      put(String(yr), stTheta(xTime(Date.UTC(yr, comp ? 0 : 6, 1))), ph, comp ? small : `${css.dw} 15px ${css.display}`, css.muted); }
    else if (mode === "ace") for (const c of cols) put(rowName(c.ace), stTheta((c.x0 + c.x1)/2), ph, `${css.dw} 16px ${css.display}`, css.muted);
    put("start", -Math.PI + STGAP/2 + 2*DG, ph + 4*DG, small, css.accent, "left"); put("today", Math.PI - STGAP/2 - 2*DG, ph + 4*DG, small, css.accent, "right");
  } else {
    for (const L of LEVELS) { const [a, b] = RING[L.lv]; put(`${L.lv} · ${L.name.toUpperCase()}`, thL, grPhi((a + b)/2), small, css.accent, "left"); }
    if (mode === "time") { for (let yr = fromY; yr <= yrEnd(); yr++) { const comp = yr < fullY; if (comp && yr % 5 && yr !== fromY) continue; put(String(yr), angOf(xTime(Date.UTC(yr, comp ? 0 : 6, 1))), 4*DG, comp ? small : big, comp ? css.muted : css.ink); } }
    else for (const c of cols) put(rowName(c.ace), angOf((c.x0 + c.x1)/2), 4*DG, big, css.ink);
  }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}
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
  if (mode === "time") { spoke(ND[1] + 30); if (ER) spoke(ER[1] + 20); if (AR) spoke(AR[0] - 15); for (let yr = fromY; yr <= yrEnd(); yr++) { if (yr < fullY && yr % 5 && yr !== fromY) continue; spoke(xTime(Date.UTC(yr,0,1))); } }
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
    if (AR) at(`After ${YR1}`, (AR[0] + AR[1])/2, `500 11px ${css.mono}`, css.muted, 1.06);
    const fw = k * dayFull() * 365 * GR / WW * aS();   // rough on-screen arc length of a full year
    for (let yr = fromY; yr <= yrEnd(); yr++) { const comp = yr < fullY; if (comp && yr % 5 && yr !== fromY) continue;
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
  if (AR) { ctx.moveTo(v(AR[0]-15), top); ctx.lineTo(v(AR[0]-15), bot); }
  const cw = k * dayFull() * 365 * COMP;            // on-screen width of one compressed year
  for (let yr = fromY; yr <= yrEnd(); yr++) {
    if (yr < fullY && cw < 14 && yr % 5 && yr !== fromY) continue;
    const x = v(xTime(Date.UTC(yr,0,1))); ctx.moveTo(x, top); ctx.lineTo(x, bot);
  }
  ctx.stroke(); ctx.setLineDash([]);
  if (k * dayFull() * 30 > 34) { // month lines in full-scale years when zoomed in
    ctx.strokeStyle = css["edge-faint"]; ctx.beginPath();
    for (let yr = fullY; yr <= yrEnd(); yr++) for (let m = 1; m < 12; m++) { const x = v(xTime(Date.UTC(yr,m,1))); if (x < 0 || x > W) continue; ctx.moveTo(x, sy(0)); ctx.lineTo(x, bot); }
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
  const nv = NVIS;
  // in focus, or with a filter that leaves few notes, name the low levels too
  let minLv = ((focus >= 0 || NARROW) && nv <= 400) ? 1 : k >= 9 ? 1 : k >= 5 ? 2 : k >= 2.2 ? 3 : k >= 1.25 ? 4 : 5; if (NARROW && nv <= 2000) minLv = Math.min(minLv, 2);
  const taken = []; const fits = (x,y,w,h) => { for (const t of taken) if (x < t[0]+t[2] && x+w > t[0] && y < t[1]+t[3] && y+h > t[1]) return false; return true; };
  ctx.textBaseline = "middle";
  const must = [];
  if (sel >= 0) must.push(sel); if (hover >= 0) must.push(hover);
  if (expOn() && EXP[view].mustLabel) for (const j of EXP[view].mustLabel()) must.push(j);
  const hl = sel >= 0 ? sel : hover;
  if (lit) [...lit].filter(j => j !== hl).sort((a,b) => (N[b].level-N[a].level) || (N[b].score-N[a].score)).forEach(j => must.push(j));
  const seen = new Set(), list = [...must, ...order];
  let count = 0;
  for (const i of list) {
    if (seen.has(i) || !VV(i)) continue; seen.add(i);
    const isMust = must.includes(i);
    if (!isMust && N[i].level < minLv) continue;
    if (!isMust && expOn() && EXP[view].ownLabels) continue;   // these maps name things their own way; titles show for the note you're on and its links
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
  if (expOn()) { if (EXP[view].labels) EXP[view].labels(); if (GRV()) drawPops(); return; }   // the Obsidian map's Timelapse: comets, rain or swirls, as on Starfield
  if (domeOn()) { domeLabels(); return; }
  if (view === "stars") { starLabels(); drawPops(); return; }
  if (view === "sense") { senseLabels(); return; }
  if (view === "gravity") { gravityLabels(); return; }
  if (csphOn()) { csLabels(); return; }
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
    if (AR && sx(AR[0]) < W - 30) strip(`After ${YR1}`, sx(AR[0]) + 4);
    const fw = k * dayFull() * 365, cw = fw * COMP;   // on-screen widths of a full and a compressed year
    const yearLbl = (yr, w) => w > 50 ? [String(yr), big] : w > 24 ? ["'" + String(yr).slice(2), small] : null;
    for (let yr = fromY; yr <= yrEnd(); yr++) {
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
    if (k * dayFull() * 30 > 34) for (let yr = fullY; yr <= yrEnd(); yr++) for (let m = 1; m < 12; m++) { const x = sx(xTime(Date.UTC(yr,m,1))); if (x < 0 || x > W) continue; ctx.font = small; ctx.fillStyle = css.muted; ctx.fillText(MON[m], x + 3, yTop + 16); }
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
  if (expOn() && EXP[view].pick && !(morphing && senseT == null)) { if (EXP[view].spinePick) return EXP[view].pick(wx(px), wy(py));   // Bookshelf: names never block the books, so a finger can glide along the shelf either way
    for (let q = LH.length - 1; q >= 0; q--) { const [lx, ly, lw, lh, i] = LH[q]; if (px >= lx && px <= lx + lw && py >= ly && py <= ly + lh && vis[i]) return i; } return EXP[view].pick(wx(px), wy(py)); }
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
cv.addEventListener("pointerdown", e => { lastDown = [e.offsetX, e.offsetY]; GPH.drag = null;
  if (GRV() && !IDV() && e.button === 0 && !e.shiftKey && GPH.F) { const i = pick(e.offsetX, e.offsetY), j = i >= 0 ? GPH.loc[i] : -1; if (j >= 0 && GPH.deg[j] > 0) GPH.drag = { i, j }; } driftStop(); cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.offsetX, y:e.offsetY}); drag = {x:e.offsetX, y:e.offsetY, tx, ty, btn:e.button, yaw: yaw3, pitch: pitch3, dyaw: domeYaw, dpitch: domePitch, cyaw: csYaw, cpitch: csPitch, gyaw: g3Yaw, gpitch: g3Pitch, orbit: (s3dOn() || domeOn() || sphOn() || geo3On()) && e.button === 0 && !e.shiftKey}; moved = false; if (e.button === 2) cv.classList.add("drag"); });
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
      if (GPH.drag) { if (moved) { GPH.F.fix(GPH.drag.j, wx(e.offsetX), wy(e.offsetY)); GPH.F.heat(.3); GPH.wake(); tip.hidden = true; } return; }   // Graph: the note follows your pointer, its links tug the rest along
      if (drag.orbit && sphOn()) { if (!moved) return; csYaw = drag.cyaw - dx*.006; csPitch = Math.max(-1.5, Math.min(1.5, drag.cpitch + dy*.006));   // turn the globe in your hand: every globe follows your hand left and right
        csProject(); X.set(DX); Y.set(DY); if (globeOn()) { EX.set(DX); EY.set(DY); } tip.hidden = true; draw(); return; }
      if (drag.orbit && domeOn()) { if (!moved) return; const u = 1/(k*DF_); domeYaw = drag.dyaw - dx*u; domePitch = Math.max(domeSphere() ? -1.53 : -.35, Math.min(1.53, drag.dpitch + dy*u));   // drag the sky
        domeProject(); X.set(DX); Y.set(DY); tip.hidden = true; draw(); return; }
      if (drag.orbit && geo3On()) { if (!moved) return; g3Yaw = drag.gyaw - dx*.006; g3Pitch = Math.max(-1.5, Math.min(1.5, drag.gpitch + dy*.006)); geoProj(); X.set(EX); Y.set(EY); tip.hidden = true; draw(); return; }
      if (drag.orbit) { if (!moved) return; yaw3 = drag.yaw + dx*.006; pitch3 = Math.max(-1.45, Math.min(1.45, drag.pitch + dy*.006)); project3D(); X.set(P3X); Y.set(P3Y); tip.hidden = true; draw(); return; }
      tx = drag.tx + dx; ty = drag.ty + dy; tip.hidden = true; draw(); return; }
  }
  const i = pick(e.offsetX, e.offsetY);
  if (i !== hover) { hover = i; cv.classList.toggle("hot", i >= 0); draw(); }
  if (view === "people" && i < 0) cv.classList.toggle("hot", pplHubAt(e.offsetX, e.offsetY) >= 0);
  if (i < 0 && view === "chord" && !csphOn()) { const a = chordArcAt(e.offsetX, e.offsetY);   // hovering an arc: its ribbons light up, with the counts
    if (a !== chArc) { chArc = a; draw(); }
    if (a >= 0) { showArcTip(a); return; }
    if (chPin >= 0 && (CHCAT[chPin])) { showArcTip(chPin); return; } }   // a held arc keeps its details showing
  else if (chArc >= 0) { chArc = -1; draw(); }
  if (view === "shelf") { const t = i < 0 ? tapeAt(e.offsetX, e.offsetY) : -1; if (t !== shTape) { shTape = t; draw(); }   // hovering a subfolder's tape outlines the whole group
    if (t >= 0) { tip.classList.remove("arc"); html(tip).v = tapeTip(t); tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = Math.min(e.clientX + 14, win.innerWidth - tw - 8) + "px"; tip.style.top = (e.clientY + 14) + "px"; return; } }
  tip.classList.remove("arc");
  if (i >= 0) { const d = N[i]; const av = axisValue(d); const named = LH.some(b => b[4] === i), lvShown = view === "emergence" || view === "gravity";   // the map already shows its name (and, here, its level)
    html(tip).v = `${named ? "" : `<b>${esc(d.title)}</b>`}${av ? `<em class="tav">${esc(av)}</em>` : ""}<span>${d.archive ? "archive" : esc(d.sub)} · ${d.date ? esc(d.date) : "no date"} · ${lvShown ? "" : `(Level ${d.level})`}(${d.body_in} in)(${d.body_out} out)${RANK[i] ? ` (#${RANK[i].toLocaleString()} in ${d.archive ? "the archive" : "the ideaverse"})` : ""}</span>${view === "sense" ? `<em class="tav">${esc(senseTip(i))}</em>` : ""}${view === "stars" && BOD[i] >= 0 ? `<em class="tav">✦ ${esc(bodyLabel(i))}</em>` : ""}`; tip.hidden = false;
    const tw = tip.offsetWidth; tip.style.left = Math.min(e.clientX + 14, win.innerWidth - tw - 8) + "px"; tip.style.top = (e.clientY + 14) + "px"; }
  else tip.hidden = true;
});
const end = e => { pts.delete(e.pointerId);
  if (GPH.drag) { const g = GPH.drag; GPH.drag = null; if (moved) { GPH.F.free(g.j); GPH.F.heat(0); GPH.wake(); cv.classList.remove("drag"); drag = null; return; } }
  if (pts.size === 0 && drag && !moved && drag.btn !== 2 && view === "chord" && !csphOn() && pick(e.offsetX, e.offsetY) < 0) {   // click an arc to hold its ribbons; click it again or empty space to let go
    const a = chordArcAt(e.offsetX, e.offsetY); chPin = a >= 0 && a !== chPin ? a : -1; draw(); if (chPin >= 0) showArcTip(chPin); else { tip.hidden = true; tip.classList.remove("arc"); } if (a >= 0) { cv.classList.remove("drag"); drag = null; return; } }
  if (pts.size === 0) { cv.classList.remove("drag"); if (drag && drag.orbit && moved) { buildGrid(); if (geo3On()) g3Keep(); else if (sphOn()) csKeep(); else if (domeOn()) domeKeep(); else save("iv-cam3", [yaw3, pitch3]); } if (drag && !moved && drag.btn !== 2) { const i = pick(e.offsetX, e.offsetY); if (view === "people" && pplClick(i, e.offsetX, e.offsetY)) { drag = null; return; }
  if (i >= 0 && (focus >= 0 || focusArmed)) navTo(i); else { select(i); if (i >= 0 && (isPhone() || (view === "stars" && LH.some(q => q[5] != null && q[4] === i && e.offsetX >= q[0] && e.offsetX <= q[0] + q[2] && e.offsetY >= q[1] && e.offsetY <= q[1] + q[3])))) flyTo(i); } toEditor(i); } drag = null; } };   // Starfield: a galaxy's name flies you into it
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
cv.addEventListener("pointerleave", () => { if (hover >= 0 || shTape >= 0) { hover = -1; shTape = -1; draw(); } tip.hidden = true; });
function zoomAt(px, py, f){ if (domeOn() || sphOn()) { px = tx; py = ty; }   // a dome zooms about where you're looking
  // big maps (a long Spiral or Lifeline) can always zoom out past their whole picture
  const lo = view === "stars" ? .04 : domeOn() ? .3 : .15, nk = Math.min(40, Math.max(expOn() ? Math.min(lo, fitTarget().k*.6) : lo, k*f)); f = nk/k; tx = px - (px - tx)*f; ty = py - (py - ty)*f; k = nk; draw(); }
cv.addEventListener("wheel", e => { e.preventDefault(); driftStop();
  if (view === "lincal" && LCALL && !e.ctrlKey && !e.metaKey && !e.shiftKey && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) { ty -= e.deltaY*(e.deltaMode === 1 ? 16 : 1); tip.hidden = true; draw(); return; }   // all years: the wheel scrolls through them (⌘ or ctrl + wheel, or a pinch, zooms)
  if (!e.ctrlKey && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) {   // shift + wheel (or a sideways swipe) pans left and right
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (domeOn()) { domeYaw += dx*(e.deltaMode === 1 ? 16 : 1)/(k*DF_); domeProject(); X.set(DX); Y.set(DY); buildGrid(); domeKeep(); tip.hidden = true; draw(); return; }   // in a dome a sideways swipe turns you
    tx -= dx * (e.deltaMode === 1 ? 16 : 1); tip.hidden = true; draw(); return; }
  const f = Math.min(1.35, Math.max(.74, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)))); zoomAt(e.offsetX, e.offsetY, f); }, {passive:false});
cv.addEventListener("dblclick", e => zoomAt(e.offsetX, e.offsetY, 2));
$("#zin").onclick = () => zoomAt(W/2, H/2, 1.6); $("#zout").onclick = () => zoomAt(W/2, H/2, 1/1.6); $("#zfit").onclick = () => { if (globeOn()) { csYaw = 0; csPitch = 0; csKeep(); }   // the globe faces the Sea of Knowledge again
  if (sphOn()) { morph(true, () => fitTarget()); return; } if (domeOn()) { [domeYaw, domePitch] = view === "gravity" ? [0, .95] : [0, 0]; domeKeep(); morph(true, () => fitTarget()); return; } fit(true); };   // in a dome: face forward again
root.querySelectorAll("#xseg button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.x === mode)); b.onclick = () => setMode(b.dataset.x); });
$("#xmore").onchange = e => setMode(e.target.value || "time");
for (const key of Object.keys(AXES)) if (key.startsWith("n:") && !root.querySelector(`#xmore option[value="${CSS.escape(key)}"]`)) $("#xmore").createEl("option", { value: key, text: AXES[key].name });   // your own number properties
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
// phones: the keyboard leaves little room, so while Find a note has focus the header shrinks to the search box alone
// and the space kept for Obsidian's toolbar (hidden behind the keyboard) goes to the map. Leaving waits a beat so a tapped result still lands.
let kbT = 0; const kbHost = () => root.closest(".ivm-host") || root.parentElement;
q.addEventListener("focus", () => { if (!doc.body.classList.contains("is-phone")) return; clearTimeout(kbT); root.classList.add("kb"); kbHost() && kbHost().classList.add("kb"); });
q.addEventListener("blur", () => { clearTimeout(kbT); kbT = setTimeout(() => { root.classList.remove("kb"); kbHost() && kbHost().classList.remove("kb"); }, 250); });
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
function syncYr(){ const yc = $("#yrctl"); if (!yc) return; const [a, b] = yc.querySelectorAll("input"); if (document.activeElement !== a && document.activeElement !== b) { a.value = YR0; b.value = YR1; }
  const f = y => (y - SLMIN) / Math.max(1, NOW_Y - SLMIN), fill = yc.querySelector(".fill"); fill.style.left = `calc(9px + (100% - 18px)*${f(YR0)})`; fill.style.width = `calc((100% - 18px)*${f(YR1) - f(YR0)})`;
  yc.querySelector(".yrv").setText(!yrNarrow() ? `All (${SLMIN}–${NOW_Y})` : YR0 === YR1 ? `${YR0} only` : `${YR0}–${YR1}`); }
function syncRange(){
  fromIn.value = fromY; $("#fromv").textContent = fromY;
  $("#archtog").checked = showArch; $("#archrow").hidden = $("#specialt").hidden = !hasArch;
  $("#subctl").hidden = mode !== "ace";
  const sv = view === "sense", shv = view === "shelf", tmv = view === "treemap", chv = view === "chord", lcv = view === "lincal", lrv = view === "spiral" || view === "lifeline", pgv = view === "planet", csv = csphOn(), ptv = view === "posters", msv = view === "mosaic", ppv = view === "people", lay = sv || shv || tmv || chv || lcv || lrv || pgv || csv || ptv || msv || ppv || (!expOn() && (mode === "time" || mode === "ace" || YRV.has(view)));   // the Layout section shows only where there are layout settings
  root.querySelectorAll("#laygrp > *").forEach(el => el.hidden = !lay); if (!lay) for (const id of ["#shelfsort", "#chordby", "#tmsubs"]) $(id).hidden = true; { const pc = $("#postctl"); if (pc) { pc.hidden = !ptv; if (ptv) postersOptsUI(); } const mz = $("#mosseg"); if (mz) mz.hidden = !msv;  const pp = $("#pplctl"); if (pp) { pp.hidden = !ppv; if (ppv) pplOptsUI(); } }
  if (lay) { $("#startms").hidden = true; $("#sensems").hidden = true; $("#subctl").hidden = ppv || msv || ptv || sv || shv || tmv || pgv || csv || chv || lcv || lrv || expOn() || mode !== "ace"; $("#planetseg").hidden = !pgv; $("#lcctl").hidden = !lcv; $("#chordby").hidden = !chv; $("#lrctl").hidden = !lrv; if (lrv) syncLR(); $("#csbands").hidden = !csv; $("#sensems").hidden = true; $("#shelfsort").hidden = !shv; $("#callbtn").hidden = !shv; $("#tmsubs").hidden = !tmv; if (!shv && !$("#callpanel").hidden) closeCall(); } syncTB();
  $("#sensebtn").textContent = syFull() ? "All years" : SY0 === SY1 ? `${SY0} only` : SY0 <= SLMIN ? `Through ${SY1}` : `${SY0}–${SY1}`;
  $("#sy0").value = SY0; $("#sy1").value = SY1; $("#syv").textContent = syFull() ? `All years (${SLMIN}–${NOW_Y})` : SY0 === SY1 ? `${SY0} only` : `${SY0 <= SLMIN ? `up to ${SY1}` : `${SY0} – ${SY1}`}`;
  { const f = y => (y - SLMIN)/Math.max(1, NOW_Y - SLMIN), el = $("#syfill"); el.style.left = `calc(9px + (100% - 18px)*${f(SY0)})`; el.style.width = `calc((100% - 18px)*${f(SY1) - f(SY0)})`; }
  $("#startbtn").textContent = `Starts ${fromY}`;
  if (senseT == null && typeof senseSteps === "function" && GROWV()) { SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1; }
  $("#xmore").value = AXES[mode] && mode !== "rank" ? mode : ""; $("#xmore").classList.toggle("on", !!(AXES[mode] && mode !== "rank"));
  root.querySelectorAll("#subseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.o === subOrder)));
  root.querySelectorAll("#vseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === tabOf())));
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
function closePops(except){ const ex = except && $(except); for (const [b,p] of POPS) if (p !== except && !$(p).hidden && !(ex && ($(p).contains(ex) || ex.contains($(p))))) { $(p).hidden = true; $(b).setAttribute("aria-expanded", "false"); } }
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
$("#collbtn").onclick = e => { e.stopPropagation(); { const anc = $("#collms").parentElement.closest(".mspop"); closePops(anc && anc.id ? "#" + anc.id : undefined); } const p = $("#collpop"); p.hidden = !p.hidden; $("#collbtn").setAttribute("aria-expanded", String(!p.hidden)); if (!p.hidden) { renderCollList(true); $("#collq").focus(); } };
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
// experimental maps, tucked under ⋯ → Experimental for now: Space-Time (flat), and the two domes
function goMap(v, dome){ closePops(); DOME[v] = dome; save("iv-dome", DOME); if (view !== v) setView(v); else { morph(true, () => fitTarget()); syncDome(); } }
function syncDome(){ root.dataset.dome = domeOn() ? "1" : ""; legend(); placePlaybar(); }
function goEmDome(m){ closePops(); DOME.emergence = true; save("iv-dome", DOME); if (view !== "emergence") setView("emergence"); if (mode !== m) setMode(m); syncDome(); morph(true, () => fitTarget()); }
// Emergence ▾: Main, Space-Time or Planetarium (stand inside, Level 5 overhead)
POPS.push(['#vseg button[data-v="emergence"]', "#emerpop", "#vsegms"]);
const syncEmd = () => root.querySelectorAll('input[name="emd"]').forEach(r => r.checked = view === "spacetime" ? r.value === "spacetime" : r.value === (DOME.emergence ? "dome" : "flat"));
root.querySelectorAll('input[name="emd"]').forEach(r => r.onchange = () => { if (!r.checked) return; if (r.value === "spacetime") { goMap("spacetime", false); syncEmd(); return; } if (view === "spacetime") { closePops(); DOME.emergence = r.value === "dome"; save("iv-dome", DOME); setView("emergence"); if (DOME.emergence && mode !== "time") setMode("time"); syncDome(); syncEmd(); return; } closePops(); DOME.emergence = r.value === "dome"; save("iv-dome", DOME); if (DOME.emergence && mode !== "time") setMode("time"); syncDome(); morph(true, () => fitTarget()); syncEmd(); });
syncEmd();
function goChord(m){ closePops(); driftStop(); CSPH = m; save("iv-csph", m); if (view !== "chord") setView("chord"); else morph(true, () => fitTarget()); root.dataset.dome = csphOn() ? "1" : ""; legend(); placePlaybar(); syncRange(); }
$("#gochord").onclick = () => goChord("");
function syncCB(){ root.querySelectorAll("#chordby button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cb === chordBy))); }
root.querySelectorAll("#chordby button").forEach(b => b.onclick = () => { if (b.dataset.cb === chordBy) return; chordBy = b.dataset.cb; save("iv-chordby", chordBy); syncCB(); chSetCats(); chPin = -1; chArc = -1; if (view === "chord") { morph(true, () => fitTarget()); legend(); } });
syncCB();
function syncLR(){ const [a, b] = datedYears(), [y0, y1] = yearRange(), opts = sel_ => Array.from({length: b - a + 1}, (_, j) => a + j).map(y => `<option value="${y}"${y === sel_ ? " selected" : ""}>${y}</option>`).join("");
  html($("#lr0")).v = opts(y0); html($("#lr1")).v = opts(y1); }
for (const id of ["#lr0", "#lr1"]) $(id).onchange = () => { let y0 = +$("#lr0").value, y1 = +$("#lr1").value; if (id === "#lr0" && y1 < y0) y1 = y0; if (id === "#lr1" && y0 > y1) y0 = y1;
  const [a, b] = datedYears(); if (view === "spiral") { LRS = [y0, y1]; save("iv-srange", LRS); } else { LR = [y0, y1]; save("iv-llrange", LR); } syncLR(); if (view === "spiral" || view === "lifeline") morph(true, () => fitTarget()); };
function syncLC(){ root.querySelectorAll("#lcseg button").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.ly === "all") === LCALL))); $("#lcyear").textContent = LCALL ? "All years" : String(LCY || NOW_Y); $("#lcprev").disabled = $("#lcnext").disabled = LCALL; }
root.querySelectorAll("#lcseg button").forEach(b => b.onclick = () => { LCALL = b.dataset.ly === "all"; save("iv-lcall", LCALL); syncLC(); if (view === "lincal") morph(true, () => fitTarget()); });
for (const [id, d] of [["#lcprev", -1], ["#lcnext", 1]]) $(id).onclick = () => { const [a, b] = datedYears(); LCY = Math.max(a, Math.min(b, (LCY || NOW_Y) + d)); save("iv-lcyear", LCY); syncLC(); if (view === "lincal") morph(true, () => fitTarget()); };
syncLC();
function syncPG(){ root.querySelectorAll("#planetseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pg === PMODE))); }
function setPMode(m){ if (!["flat", "table", "globe"].includes(m)) return; driftStop(); PMODE = m; PGLOBE = m === "globe"; save("iv-planetmode", m); syncPG();
  if (view !== "planet") { setView("planet"); return; } root.dataset.dome = sphOn() ? "1" : ""; morph(true, () => fitTarget()); legend(); placePlaybar(); }
for (const m of ["flat", "table", "globe"]) { const b = root.querySelector("#gopl" + m); if (b) b.onclick = () => { closePops(); setPMode(m); }; }
syncPG();
root.querySelectorAll("#planetseg button").forEach(b => b.onclick = () => { if (b.dataset.pg !== PMODE) setPMode(b.dataset.pg); });
$("#csbands").setAttribute("aria-pressed", String(csBands));
$("#csbands").onclick = () => { csBands = !csBands; save("iv-csbands", csBands); $("#csbands").setAttribute("aria-pressed", String(csBands)); draw(); };
$("#tmsubs").setAttribute("aria-pressed", String(tmSubs));
$("#tmsubs").onclick = () => { tmSubs = !tmSubs; save("iv-tmsubs", tmSubs); $("#tmsubs").setAttribute("aria-pressed", String(tmSubs)); draw(); };
const syncSS = () => root.querySelectorAll("#shelfsort button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ss === shelfSort)));
root.querySelectorAll("#shelfsort button").forEach(b => b.onclick = () => { shelfSort = b.dataset.ss; save("iv-ssort", shelfSort); syncSS(); if (view === "shelf") morph(true, () => fitTarget()); });
syncSS();
for (const g of ["square", "hex", "mandala", "octa", "shells"]) { const b = root.querySelector("#gogeo" + g); if (b) b.onclick = () => { closePops(); driftStop(); GEO = g; save("iv-geo", g); if (view === "quincunx") { morph(true, () => fitTarget()); legend(); } else setView("quincunx"); root.dataset.dome = domeOn() || sphOn() || geo3On() ? "1" : ""; placePlaybar(); }; }
for (const v of ["quincunx", "shelf", "tree", "treemap", "skyline", "planet", "lincal", "spiral", "lifeline"]) { const b = root.querySelector("#go" + v); if (b) b.onclick = () => { closePops(); driftStop(); setView(v); }; }
$("#gocso").onclick = () => goChord("out");
$("#gocsi").onclick = () => goChord("in");

root.querySelectorAll("#vseg button[data-v]").forEach(b => b.onclick = e => {
  if (b.dataset.v === view || (b.dataset.v === "emergence" && view === "spacetime")) { e.stopPropagation(); toggleMapOpts(b); return; }   // the current map's tab opens its own menu: variants and options
  closePops(); setView(b.dataset.v); });   // switching maps closes any open menu (More, a map's own menu)

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
$("#scorebtn").onclick = e => { $("#effpanel").hidden = true; $("#callpanel").hidden = true; sp.hidden = !sp.hidden; e.currentTarget.setAttribute("aria-expanded", String(!sp.hidden)); if (!sp.hidden) syncScore(); };
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
    const hiOn = i => view === "shelf" && shelfHi.includes(N[i].path), hiDot = i => hiOn(i) ? `<i class="hidot" style="background:${HI_COL[shelfHi.indexOf(N[i].path) % HI_COL.length]}"></i>` : "";
    return `<h6><span>${esc(name)}</span><span>${m.length}</span></h6><ul>${m.map(i => `<li><button data-ef="${i}" class="${(view === "shelf" ? hiOn(i) : i === focus) ? "on" : ""}">${hiDot(i)}${lvDot(i).replace('class="lv', 'class="lv')}<span class="t">${esc(N[i].title)}</span><span class="m">${linkCount(i)}</span></button></li>`).join("")}</ul>`;
  }).join("") || `<p class="pn">No match.</p>`;
  $("#efflist").querySelectorAll("[data-ef]").forEach(b => b.onclick = () => {
    if (view === "shelf") { const p = N[+b.dataset.ef].path; shelfHi = shelfHi.includes(p) ? shelfHi.filter(x => x !== p) : [...shelfHi, p]; save("iv-shelfhi", shelfHi); hiCache = null; renderEffList(); legend(); draw(); return; }   // Bookshelf: light up, don't filter
    setFocus(+b.dataset.ef); if (isPhone()) closeEff(); });
  const pn = $("#effpanel").querySelector(".pn"); if (pn) pn.textContent = view === "shelf" ? "Bookshelf: pick areas and projects to light up their notes on the shelves, each in its own color. Pick again to turn one off." : "Pick an area or project to see only the notes it's linked to.";
}
function closeEff(){ $("#effpanel").hidden = true; $("#effbtn").setAttribute("aria-expanded", "false"); }
$("#effbtn").onclick = e => { const p = $("#effpanel"); p.hidden = !p.hidden; e.currentTarget.setAttribute("aria-expanded", String(!p.hidden)); if (!p.hidden) { $("#scorepanel").hidden = true; $("#callpanel").hidden = true; renderEffList(); } };
$("#efx").onclick = closeEff; $("#effbtn").hidden = !EFF.length;
// Bookshelf: an index of every call number (hub.map), with a button to copy it as a Markdown list
const wl = i => { const b = N[i].path.split("/").pop().replace(/\.md$/i, ""); return b === N[i].title ? `[[${b}]]` : `[[${b}|${N[i].title}]]`; };
function callGroups(){ const out_ = []; let sec = null, hub = null;
  for (const r of SHELF.index || []) { if (!sec || sec.name !== r.sec) { sec = {name: r.sec, hubs: []}; out_.push(sec); hub = null; }
    if (!hub || hub.n !== r.hubN) { hub = {n: r.hubN, i: r.hub, maps: []}; sec.hubs.push(hub); } hub.maps.push(r); }
  return out_; }
function renderCallIndex(){
  const s_ = ($("#callq").value || "").trim().toLowerCase(), G = callGroups(), match = r => !s_ || N[r.m].title.toLowerCase().includes(s_) || r.call.startsWith(s_);
  $("#callcopy").hidden = $("#callq").hidden = $("#callsum").hidden = $("#callwhy").hidden = shelfSort !== "call";
  if (shelfSort !== "call") { html($("#calllist")).v = `<p class="pn">Call numbers are given when Shelve by is set to Call no.</p><button class="chip" id="callgo">Shelve by Call no.</button>`; $("#callgo").onclick = () => root.querySelector('#shelfsort button[data-ss="call"]').click(); return; }
  { const idx = SHELF.index || [], maps = new Set(idx.map(r => r.m)), hubs = new Set(idx.filter(r => r.hub >= 0).map(r => r.hub));
    html($("#callsum")).v = `<b>${idx.length.toLocaleString()}</b> call numbers · <b>${maps.size.toLocaleString()}</b> maps · <b>${hubs.size}</b> hubs · <b>${G.length}</b> section${G.length === 1 ? "" : "s"}`;
    html($("#callwhy")).v = `<summary>Why they're grouped this way</summary>`
      + `<p><b>Hubs</b> are your Level 5 notes: your Home note plus your highest-scoring notes (how many is set in Scoring). A note earns that score from its links: being linked to counts most, then links both ways, then linking out, then being linked up to. Hubs take the first number, highest score first.</p>`
      + `<p><b>Maps</b> are notes at Level 3 and up. Each map belongs to the hub it reaches in the fewest links, and takes the second number, again by score. So 2.7 is the 7th map under the 2nd hub.</p>`
      + `<p><b>Runs.</b> Every other note joins the map it reaches in the fewest links. The count beside each map is how many books its run holds.</p>`
      + `<p><b>Sections.</b> Numbering starts over in each top folder, so 1.1 in Atlas and 1.1 in another folder are different runs. A map whose notes live in several folders gets a call number in each, which is why there are more call numbers than maps. Maps no hub reaches are listed under No hub.</p>`; }
  html($("#calllist")).v = G.map(sec => { const hubs = sec.hubs.map(h => { const ms = h.maps.filter(match); if (!ms.length) return "";
      return `<h6><span>${h.n} · ${h.i >= 0 ? esc(N[h.i].title) : "No hub"}</span><span>${ms.length}</span></h6><ul>${ms.map(r => `<li><button data-cm="${r.m}"><span class="cn">${r.call}</span>${lvDot(r.m)}<span class="t">${esc(N[r.m].title)}</span><span class="m">${r.n}</span></button></li>`).join("")}</ul>`; }).join("");
    return hubs ? `<h5>${esc(sec.name)}</h5>${hubs}` : ""; }).join("") || `<p class="pn">No match.</p>`;
  $("#calllist").querySelectorAll("[data-cm]").forEach(b => b.onclick = () => { const i = +b.dataset.cm; select(i); flyTo(i); });
}
function callMarkdown(){ const lines = [];
  for (const sec of callGroups()) { lines.push(`- ${sec.name}`);
    for (const h of sec.hubs) { lines.push(`\t- ${h.n} ${h.i >= 0 ? wl(h.i) : "No hub"}`); for (const r of h.maps) lines.push(`\t\t- ${r.call} ${wl(r.m)}`); } }
  return lines.join("\n"); }
function closeCall(){ $("#callpanel").hidden = true; $("#callbtn").setAttribute("aria-expanded", "false"); }
$("#callbtn").onclick = e => { const p_ = $("#callpanel"); p_.hidden = !p_.hidden; e.currentTarget.setAttribute("aria-expanded", String(!p_.hidden)); if (!p_.hidden) { $("#scorepanel").hidden = true; closeEff(); renderCallIndex(); } draw(); };
$("#cpx").onclick = () => { closeCall(); draw(); };
$("#callq").oninput = () => renderCallIndex();
$("#callcopy").onclick = async () => { const b = $("#callcopy"); try { await navigator.clipboard.writeText(callMarkdown()); b.textContent = "Copied"; } catch (e_) { b.textContent = "Couldn't copy"; } setTimeout(() => { b.textContent = "Copy as Markdown list"; }, 1600); };
dbg.__ivCallMd = () => callMarkdown();
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
  let c = 0; const pa = view === "people" ? pplActive() : null;
  if (pa) c = pa.notes.size - (pa.notes.has(focus) ? 1 : 0) + pa.hubs.size; else for (let i=0;i<n;i++) if (vis[i] && i !== focus && !(EHID[i] && expOn())) c++;
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

dbg.__ivCam = () => ({k, tx, ty, morphing, dome: domeOn(), yaw: domeYaw, pitch: domePitch, sel, selXY: sel >= 0 ? [sx(X[sel]), sy(Y[sel]), DTH[sel], DPH[sel], DFR[sel]] : null});   // read-only hook for automated checks
// ---------- autoplay: Random (any note) or Thread (note to linked note) ----------
let playMode = ["random", "map"].includes(pref("iv-pmode", "thread")) ? pref("iv-pmode", "thread") : "thread", playSec = Math.max(2, Math.min(30, +pref("iv-psec", 6))), playing = false, pTimer = 0;
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
// Autoplay can also hop between maps, the hidden experimental ones included: every few steps it moves the note you're on to another map
let playTrail = pref("iv-ptrail", false) === true, trTimer = 0;   // Map mode: two-thirds into each step, follow a link to the next note
function trailStep(){ if (!playing || playMode !== "map" || !playTrail || dead) return; const j = pickThread(); if (j < 0 || j === sel) return;
  if (sel >= 0) { runSeen.add(sel); runStack.push(sel); } runSeen.add(j); navTo(j); toEditor(j); }
let playMaps = pref("iv-pmaps", false) === true, hopIn = 0, hopLast = [];
const hopTab = v => { if (view !== v) setView(v); };
const hopRadio = (name, v) => { const r = root.querySelector(`input[name="${name}"][value="${v}"]`); if (!r) return; r.checked = true; r.dispatchEvent(new Event("change")); };
const hopBtn = id => { const b = root.querySelector(id); if (b) b.click(); };
const HOPS = [
  ["emergence", () => { if (view !== "emergence" && view !== "spacetime") hopTab("emergence"); hopRadio("emd", "flat"); }], ["spacetime", () => hopRadio("emd", "spacetime")],
  ["planetarium", () => { if (view !== "emergence" && view !== "spacetime") hopTab("emergence"); hopRadio("emd", "dome"); }],
  ["gravity", () => hopTab("gravity")], ["stars2d", () => { hopTab("stars"); hopRadio("s3d", "2d"); }], ["stars3d", () => { hopTab("stars"); hopRadio("s3d", "3d"); }], ["sense", () => hopTab("sense")],
  ["chord", () => hopBtn("#gochord")], ["corona", () => hopBtn("#gocso")], ["tesla", () => hopBtn("#gocsi")], ["treemap", () => hopBtn("#gotreemap")], ["shelf", () => hopBtn("#goshelf")],
  ["geo-square", () => hopBtn("#gogeosquare")], ["geo-hex", () => hopBtn("#gogeohex")], ["geo-mandala", () => hopBtn("#gogeomandala")], ["geo-octa", () => hopBtn("#gogeoocta")], ["geo-shells", () => hopBtn("#gogeoshells")],
  ["planet-flat", () => hopBtn("#goplflat")], ["planet-table", () => hopBtn("#gopltable")], ["planet-globe", () => hopBtn("#goplglobe")], ["tree", () => hopBtn("#gotree")], ["lincal", () => hopBtn("#golincal")], ["spiral", () => hopBtn("#gospiral")], ["lifeline", () => hopBtn("#golifeline")], ["skyline", () => hopBtn("#goskyline")]];
function hopNow(){ return view === "emergence" ? (DOME.emergence ? "planetarium" : "emergence") : view === "stars" ? (S3D ? "stars3d" : "stars2d") : view === "chord" ? (CSPH === "out" ? "corona" : CSPH === "in" ? "tesla" : "chord")
  : view === "quincunx" ? "geo-" + GEO : view === "planet" ? "planet-" + PMODE : view; }
function hopMap(){ const cur = hopNow(), opts = HOPS.filter(([id]) => id !== cur && !hopLast.includes(id)), pick = opts[Math.floor(Math.random()*opts.length)]; if (!pick) return;
  hopLast = [cur, ...hopLast].slice(0, 5); const keep = sel; hopSlow = true; pick[1](); hopSlow = false; if (keep >= 0) { if (sel !== keep) select(keep); win.setTimeout(() => { if (sel === keep && !dead) flyTo(keep); }, 2000); } }
function playStep(){
  if (!tourRun && playMode === "map") { if (sel < 0) { const top = []; for (let i=0;i<n;i++) if (baseOK(i) && N[i].level >= 3) top.push(i); const j = top.length ? top[Math.floor(Math.random()*top.length)] : pickRandom(); if (j >= 0) navTo(j); } else hopMap(); schedule(); if (playTrail) { win.clearTimeout(trTimer); trTimer = win.setTimeout(trailStep, playSec*1000*2/3); } return; }   // Map: the same note, a new map each step (the trail timer starts once the new map is laid out)
  if (!tourRun && playMaps && ++hopIn >= 3) { hopIn = 0; hopMap(); schedule(); return; }   // every third step: a new map, same note
  if (tourRun) { if (tourRun.idx >= tourRun.ids.length - 1) { setPlaying(false); syncTour(); return; } tourGo(tourRun.idx + 1); schedule(); return; }
  const j = playMode === "random" ? pickRandom() : pickThread();
  if (j >= 0) { if (sel >= 0) { runSeen.add(sel); if (playMode === "thread") runStack.push(sel); } runSeen.add(j); navTo(j); toEditor(j); }
  schedule();
}
function schedule(){
  win.clearTimeout(pTimer); if (!playing) { win.clearTimeout(trTimer); return; }
  const pr = $("#pprog"); pr.removeClass("run"); pr.setCssProps({"--pdur": playSec + "s"});
  RAF(() => pr.addClass("run"));
  pTimer = win.setTimeout(playStep, playSec * 1000);
}
// Autoplay can also drift a little: globes and 3D maps turn slowly (like Lively drift), flat maps glide and breathe
let playDrift = false,   // "drift a little" moved to Orbit, which runs on every map
    apdRaf = 0, apdLast = 0, apdT = 0;
function apdFrame(now){
  if (!playing || !playDrift || dead) { apdRaf = 0; return; } apdRaf = RAF(apdFrame);
  const dt = Math.min(.1, (now - (apdLast || now))/1000); apdLast = now; apdT += dt; if (!dt) return;
  if (drifting) return;   // the Drift bar's own drift is already running
  if (geo3On()) { g3Yaw -= .07*1.6*dt; geoProj(); X.set(EX); Y.set(EY); }
  else if (sphOn()) { csYaw += .07*1.6*dt*(globeOn() ? -1 : 1); csProject(); X.set(DX); Y.set(DY); if (globeOn()) { EX.set(DX); EY.set(DY); } }
  else if (s3dOn()) { yaw3 += .07*dt; project3D(); X.set(P3X); Y.set(P3Y); }
  else if (domeOn()) { domeYaw += .03*dt; domeProject(); X.set(DX); Y.set(DY); }
  else if (!morphing) { const px = 9*Math.sin(apdT*.23), py = 6*Math.cos(apdT*.17);   // a slow glide, a few pixels a second, and a gentle in-and-out
    tx += px*dt; ty += py*dt; const f = 1 + .012*Math.cos(apdT*.5)*dt; const cx = W/2, cy = H/2; tx = cx - (cx - tx)*f; ty = cy - (cy - ty)*f; k *= f; }
  render(); }
function apdSync(){ if (playing && playDrift && !apdRaf) { apdLast = 0; apdRaf = RAF(apdFrame); } if ((!playing || !playDrift) && apdRaf) { win.cancelAnimationFrame(apdRaf); apdRaf = 0; buildGrid(); if (sphOn()) csKeep(); draw(); } }
function setPlaying(on){
  playing = on; win.setTimeout(apdSync, 0); $("#playbar").classList.toggle("on", on);
  $("#pplay").textContent = on ? "■" : "▶"; $("#pplay").setAttribute("aria-label", on ? "Stop" : "Play");
  if (on) { runSeen = new Set(); runStack = []; if (tourRun) { if (tourRun.idx >= tourRun.ids.length - 1) tourGo(0); schedule(); } else if (sel < 0) playStep(); else schedule(); }
  else { win.clearTimeout(pTimer); win.clearTimeout(trTimer); const pr = $("#pprog"); pr.removeClass("run"); }
}
function syncPlay(){
  root.querySelectorAll("#playseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === playMode)));
  const hm = root.querySelector("#pmaps"); if (hm) { const mm = playMode === "map"; hm.checked = mm || playMaps; hm.disabled = mm; hm.closest("label").classList.toggle("locked", mm); hm.closest("label").hidden = mm; hm.closest("label").title = mm ? "Maps always hops between maps" : ""; }   // Map mode always hops, so the toggle shows on
  const ht = root.querySelector("#ptrail"); if (ht) ht.closest("label").hidden = playMode !== "map";
  $("#pint").value = playSec; $("#pintv").textContent = playSec + "s";
}
root.querySelectorAll("#playseg button").forEach(b => b.onclick = () => { playMode = b.dataset.p; save("iv-pmode", playMode); syncPlay(); if (playing) { runSeen = new Set(); runStack = []; schedule(); } });   // picking a mode never starts Wander Mode; ▶ does
$("#pint").addEventListener("input", e => { playSec = +e.target.value; save("iv-psec", playSec); syncPlay(); if (playing) schedule(); });
$("#pplay").onclick = () => setPlaying(!playing);
$("#ptrail").checked = playTrail; $("#ptrail").onchange = () => { playTrail = $("#ptrail").checked; save("iv-ptrail", playTrail); if (!playTrail) win.clearTimeout(trTimer); };
$("#pmaps").checked = playMaps; $("#pmaps").onchange = () => { playMaps = $("#pmaps").checked; save("iv-pmaps", playMaps); hopIn = 0; };
onKey(e => { if (e.key === "Escape" && playing) setPlaying(false); });
root.querySelectorAll("#playseg button").forEach(b => b.addEventListener("click", () => { if (tourRun) { tourRun = null; syncTour(); } }));   // picking Random/Thread leaves the tour
syncPlay();
// Animations: Timelapse (the years), Wander Mode (autoplay) and Orbit (drift) share one dock at the bottom left.
// All three show together, each under its name (so a running one never hides behind another); Orbit only on 3D maps.
{ const dock = cv.parentElement.createDiv({ cls: "animdock", attr: { id: "animdock", role: "group", "aria-label": "Animations" } });
  const head = dock.createDiv({ cls: "anihead" }); head.createSpan({ cls: "pl", text: "Animations" });
  const body = dock.createDiv({ cls: "anibody" });
  const SECS = [["time", "Timelapse", $("#timebar"), $("#tlplay")], ["wander", "Wander Mode", $("#playbar"), $("#pplay")], ["orbit", "Orbit", $("#driftbar"), $("#dplay")]];
  for (const s_ of SECS) { const w = body.createDiv({ cls: "aniwrap", attr: { "data-a": s_[0] } }); w.createDiv({ cls: "anilbl", text: s_[1] }); w.appendChild(s_[2]); s_[2].classList.add("anisec"); s_.push(w); }
  const col = head.createEl("button", { cls: "acol" });
  // tucked: a vertical tab like the legend's, just above it (or above the open legend)
  const atab = cv.parentElement.createEl("button", { cls: "legtab anitab", text: "Animations", attr: { id: "anitab", "aria-label": "Show animations", "aria-expanded": "false" } });
  atab.onclick = () => setC(false);
  placeAnitab = () => { const lt = $("#legtab"), lg = $("#legend"), m = cv.parentElement.getBoundingClientRect(); let b = 14;
    if (lt && !lt.hidden && lt.offsetParent) b = m.bottom - lt.getBoundingClientRect().top + 8;
    else if (lg && !lg.classList.contains("collapsed") && lg.offsetParent) b = m.bottom - lg.getBoundingClientRect().top + 8;
    atab.style.bottom = Math.round(b) + "px"; };
  const avail = s_ => !s_[2].hidden, running = s_ => /❚❚|■/.test(s_[3].textContent);
  const sync = () => { for (const s_ of SECS) { const w = s_[4], h = !avail(s_), r = running(s_); if (w.hidden !== h) w.hidden = h; if (w.classList.contains("run") !== r) w.classList.toggle("run", r); }
    const r = SECS.some(running); if (dock.classList.contains("running") !== r) { dock.classList.toggle("running", r); atab.classList.toggle("running", r); } };
  const mo = new MutationObserver(sync); for (const s_ of SECS) { mo.observe(s_[3], { childList: true, characterData: true, subtree: true }); mo.observe(s_[2], { attributes: true, attributeFilter: ["hidden", "class"] }); }
  const setC = c => { dock.classList.toggle("collapsed", c); dock.hidden = c; atab.hidden = !c; if (c) placeAnitab(); col.setText(c ? "›" : "‹"); const t = c ? "Show animations" : "Tuck animations away"; col.setAttribute("aria-label", t); col.title = t; save("iv-acol", c); };
  col.onclick = () => setC(!dock.classList.contains("collapsed"));
  // like the legend: a click on the dock's empty space tucks it away
  dock.addEventListener("click", e => { if (!e.target.closest("button, input, select, label, a, .seg, #tourctl, #tldate")) setC(true); });
  setC(pref("iv-acol", doc.body.classList.contains("is-mobile")) === true); sync(); }   // tucked away by default on phones and tablets

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
let legendOpen = pref("iv-legend", win.innerWidth > 760 && !doc.body.classList.contains("is-mobile")) !== false;   // phones and tablets start with the tab
function setLegend(open){
  legendOpen = open; save("iv-legend", open);
  $("#legend").classList.toggle("collapsed", !open); $("#legend").setAttribute("aria-hidden", String(!open));
  $("#legtab").hidden = open; $("#legtab").setAttribute("aria-expanded", String(open));
  placeAnitab(); win.setTimeout(placeAnitab, 300);
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
  }).join("") + (showArch && hasArch ? `<div><i style="background:none;border:1.5px solid ${css.muted}"></i>Archive (rings)</div>` : "") + `<div style="margin-top:4px"><i class="ln" style="border-color:${css.up}"></i>links above</div><div><i class="ln" style="border-color:${css.down}"></i>links below</div>` + (`<div><i class="ln" style="border-color:${css.upp}"></i>up property</div><div><i class="ln" style="border-color:${css.rel}"></i>related property</div><div><i class="ln" style="border-color:${css.prop}"></i>other properties (actors, director, by, next…)</div>`) + (focus >= 0 ? `<div><i class="ln" style="border-color:${css.muted};opacity:.5;border-top-width:1px"></i>links between the other notes in focus</div>` : "");
  if (view === "spacetime" && !domeOn()) $("#legend").createDiv({ text: "Time is on the x-axis. \u201cSpace,\u201d as represented by folder structure, is on the y-axis. In each row, higher levels sit higher.", attr: { style: "margin-top:4px;opacity:.85;max-width:300px;white-space:normal" } });
  if (view === "tree") { const k_ = $("#legend").createDiv({ cls: "lgtree" });   // Tree's own key: leaves by age, the lit way home
    for (const [c, t] of [["hsl(110,55%,52%)", "leaf: new this year"], ["hsl(55,55%,50%)", "leaf: 2–4 years old"], ["hsl(18,35%,42%)", "leaf: older"], ["hsl(28,30%,38%)", "fallen: Home never reaches it"]]) { const r = k_.createDiv(); const sw = r.createEl("i"); sw.setCssStyles({ background: c, borderRadius: "50% 0" }); r.appendText(t); }
    { const r = k_.createDiv(); const ln = r.createEl("i", { cls: "ln" }); ln.setCssStyles({ borderColor: css.accent, borderTopWidth: "3px" }); r.appendText("a picked note's way home"); } }
  if (expOn() && EXP[view].legend) $("#legend").createDiv({ text: EXP[view].legend, attr: { style: "margin-top:4px;opacity:.85;max-width:300px;white-space:normal" } });
  if (view === "shelf" && shelfHi.length) { const box = $("#legend").createDiv({ cls: "lghi" }); box.createDiv({ text: "Lit up (Efforts panel)", attr: { style: "color:var(--ink)" } });
    shelfHi.forEach((p, j) => { const i = N.findIndex(d => d.path === p); if (i < 0) return; const row = box.createDiv(); row.createEl("i", { attr: { style: `background:${HI_COL[j % HI_COL.length]}` } }); row.appendText(N[i].title); }); }
  if (view === "planet") { const box = $("#legend").createDiv({ cls: "lghi" }); box.createDiv({ text: "Colors: the domain each note settles in", attr: { style: "color:var(--ink)" } });   // what the planet's colors mean
    const cnt = {}; for (const g of PLANET.groups) cnt[g.dk] = (cnt[g.dk] || 0) + g.ids.filter(i => vis[i]).length;
    const rows = Object.entries(PD).map(([dk, d]) => [d.col, d.name, cnt[dk] || 0]); if (globeOn()) rows.push([CR_COL, "The Creator's Continent", CREATOR.groups.reduce((t, g) => t + g.ids.length, 0)]);
    for (const [col, name, c] of rows) { if (!c) continue; const row = box.createDiv(); row.createEl("i", { attr: { style: `background:${col}` } }); row.appendText(`${name} · ${c.toLocaleString()}`); }
    box.createDiv({ text: "Filled dots are linked notes, rings are unlinked; maps and hubs keep their level shapes.", attr: { style: "white-space:normal;opacity:.85" } }); }
  if (expOn() && EXP[view].about) { const det = $("#legend").createEl("details", { cls: "lgabout" }); det.createEl("summary", { text: "How this map works" });   // the long explanation, folded away
    for (const para of EXP[view].about) det.createEl("p", { text: para }); det.addEventListener("click", e => e.stopPropagation()); }
  if (csphOn()) $("#legend").createDiv({ text: CSPH === "out" ? "Corona: every kind is a wedge of the globe (Level 5 toward the North Pole); the links between kinds arc out over the surface. Drag to turn it, scroll to zoom." : "Tesla: every kind is a wedge of a glass globe (Level 5 toward the North Pole); the links between kinds cross through the inside. Drag to turn it, scroll to zoom.", attr: { style: "margin-top:4px;opacity:.85;max-width:300px;white-space:normal" } });
  if (view === "chord") $("#legend").createDiv({ text: chordBy === "time" ? "Arcs by year, clockwise from 12 o'clock (Layout → Folders for one arc per folder)." : "Arcs by folder (Layout → Time for one arc per year).", attr: { style: "margin-top:4px;opacity:.85;max-width:300px;white-space:normal" } });
  if (domeOn()) $("#legend").createDiv({ text: view === "emergence" ? "Planetarium: you stand at the center. Level 5 is the North Pole, Level 1 the South Pole; " + (mode === "ace" ? "your folders" : "time") + " runs around you. Drag to look around, scroll to zoom, ⤢ to face forward." : view === "gravity" ? "Dome: you stand at the center. Home and the hubs are overhead; the levels drop toward the horizon. Drag to look around, scroll to zoom, ⤢ to face forward." : "Dome: you stand at the center. Time runs around you; folders run from the North Pole (+) to the South Pole (x), with the equator halfway through your notes. Drag to look around, scroll to zoom, ⤢ to face forward.", attr: { style: "margin-top:4px;opacity:.85;max-width:300px;white-space:normal" } });
}
$("#legend").addEventListener("click", () => setLegend(false));   // a click anywhere on the legend tucks it away
const autoTheme = () => doc.body.classList.contains("theme-dark") ? "dark" : "paper";   // until a theme is picked, follow Obsidian's
function setTheme(t, keep){ root.setAttribute("data-theme", t); if (keep) save("iv-theme", t); tip.setAttribute("data-theme", t);
  root.querySelectorAll("#themeseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.th === t))); readCss(); legend(); draw(); }
root.querySelectorAll("#themeseg button").forEach(b => b.onclick = () => setTheme(b.dataset.th, true));
setLegend(legendOpen);
updateCounts();
{ const t = pref("iv-theme", null); if (t === "sepia") save("iv-theme", "softpaper"); if (t === "cybertron") save("iv-theme", "lyt"); }   // Sepia became Soft Paper (0.1.2); Cybertron was retired for LYT Mode (0.1.49)   // Sepia became Soft Paper (0.1.2)
setTheme(pref("iv-theme", autoTheme()));


// ---------- saved views: the whole state of the map (view, axis, filters, focus, note, camera) under a name ----------
// Kept in this browser; "Export file" writes ideaverse-views.js, which the page also reads from its folder (file over app).
const PIDX = new Map(N.map((d,i) => [d.path, i]));
const VIEW_NAME = {planet:"Planet", quincunx:"Geometric", shelf:"Bookshelf", tree:"Tree", treemap:"Treemap", skyline:"Skyline", lincal:"Linear Calendar", spiral:"Spiral", lifeline:"Lifeline", emergence:"Emergence", spacetime:"Space-Time", gravity:"Gravity", stars:"Starfield", sense:"Sensemaking", arc:"ARC", chord:"Chord"};
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
  return {name, view, mode, folders:[...folders], subsOff:[...subOff], arch:showArch, from:fromY, full:fullY, yr:[YR0, YR1], colls:[...colls], collMode, lanes, subOrder, links:showAll,
    focus: focus >= 0 ? N[focus].path : null, fDir, fDepth, sel: sel >= 0 ? N[sel].path : null,
    tl: senseT != null ? {t: senseStepStart, step: senseStep} : null,   // where the time-lapse stands (null = all time)
    dome: domeOn() ? {yaw: +domeYaw.toFixed(3), pitch: +domePitch.toFixed(3)} : null,
    csph: csphOn() ? {mode: CSPH, yaw: +csYaw.toFixed(3), pitch: +csPitch.toFixed(3)} : null,
    pg: view === "planet" ? PMODE : null, gcam: globeOn() ? {yaw: +csYaw.toFixed(3), pitch: +csPitch.toFixed(3)} : null,
    geo: view === "quincunx" ? GEO : null,
    s3d: view === "stars" ? {on: S3D, yaw: +yaw3.toFixed(3), pitch: +pitch3.toFixed(3)} : null,   // Starfield: 2D or 3D, and the 3D angle
    cam: {cx: +((W/2 - tx)/k).toFixed(1), cy: +((H/2 - ty)/k).toFixed(1), k: +k.toFixed(4)}, saved: new Date().toISOString().slice(0,10)};
}
function applySaved(v){
  if (typeof playing !== "undefined" && playing) setPlaying(false);
  closePops(); curView = v.name;
  if (["square", "hex", "mandala", "octa", "shells"].includes(v.geo)) { GEO = v.geo; save("iv-geo", GEO); }
  { const nv = VIEWS_ON.includes(v.view) ? v.view : "emergence";
    if (senseT != null) { senseStop(); unfreeze(false); senseT = null; POP.fill(0); popEnd = 0; $("#tldate").textContent = "All time"; }
    ungrow();   // back to today's levels; a saved time-lapse point re-grows them below
    view = nv; save("iv-view", view); SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1;
    root.querySelectorAll("#vseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === tabOf())));
    root.dataset.view = view; syncTimebar(); }   // the map's buttons and layout follow the view
  modeKeep = null; mode = (v.mode === "time" || v.mode === "ace" || AXES[v.mode]) ? v.mode : "time"; if (view === "spacetime") mode = "time"; else save("iv-x", mode);
  folders = (v.folders || FOLD).filter(f => FOLD.includes(f)); if (!folders.length) folders = [...FOLD]; save("iv-folders", folders); subOff = Array.isArray(v.subsOff) ? new Set(v.subsOff) : defSubs(); save("iv-subsoff", [...subOff]); subCompute();
  showArch = v.arch !== false; save("iv-arch", showArch);
  { const f = +v.from || fromY, u = +v.full || 0; fromY = Math.max(SLMIN, Math.min(NOW_Y, u > f && u <= NOW_Y ? u : f)); fullY = fromY; save("iv-from", fromY); }
  // the years shown (views saved before 0.4.14 show every year)
  { const yr = Array.isArray(v.yr) ? v.yr : [SLMIN, NOW_Y]; YR0 = Math.max(SLMIN, Math.min(NOW_Y, +yr[0] || SLMIN)); YR1 = Math.max(YR0, Math.min(NOW_Y, +yr[1] || NOW_Y)); fromY = fullY = YR0; save("iv-yr0", YR0); save("iv-yr1", YR1); }   // older views: their full-scale year becomes the start
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
  if (view === "spacetime" || view === "gravity" || view === "emergence") { DOME[view] = !!v.dome; save("iv-dome", DOME); if (v.dome) { DOMECAM[view] = [+v.dome.yaw || 0, +v.dome.pitch || .5]; save("iv-domecam", DOMECAM); } root.dataset.dome = domeOn() ? "1" : ""; }
  if (view === "chord") { CSPH = v.csph && ["out", "in"].includes(v.csph.mode) ? v.csph.mode : ""; save("iv-csph", CSPH); if (v.csph) { camOwner = "chord"; csYaw = +v.csph.yaw || 0; csPitch = +v.csph.pitch || 0; csKeep(); } root.dataset.dome = csphOn() ? "1" : ""; }
  if (view === "planet" && v.pg != null) { PMODE = v.pg === true ? "globe" : v.pg === false ? "table" : ["flat", "table", "globe"].includes(v.pg) ? v.pg : PMODE; PGLOBE = PMODE === "globe"; save("iv-planetmode", PMODE); syncPG(); if (v.gcam) { camOwner = "globe"; csYaw = +v.gcam.yaw || 0; csPitch = +v.gcam.pitch || 0; csKeep(); } root.dataset.dome = sphOn() ? "1" : ""; }
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
$("#tlrange").addEventListener("input", e => { senseStop(); if (+e.target.value >= SSTEPS.length - 1) senseClear(); else senseSet(+e.target.value, true); });   // all the way right is All time: every note
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
$("#sensebtn").onclick = e => { e.stopPropagation(); const el = $("#sensepop2"), open = el.hidden; closePops("#sensepop2"); el.hidden = !open; $("#sensebtn").setAttribute("aria-expanded", String(open)); };
// Sensemaking: placed by the AI pass or by the rules (click the tab again to choose)
const sBtn = $('#vseg button[data-v="sense"]');
POPS.push(['#vseg button[data-v="sense"]', "#sensepop", "#vsegms"]);
POPS.push(['#vseg button[data-v="stars"]', "#starpop", "#vsegms"]);
driftSpeed = DRIFT[pref("iv-drift", "slow")] ? pref("iv-drift", "slow") : "slow";
{ const eb = root.querySelector('#driftseg button[data-d="earth"]'); if (eb && !root.querySelector('#driftseg button[data-d="spin"]')) { const sb = doc.createElement("button"); sb.dataset.d = "spin"; sb.className = "dearth dspin"; sb.textContent = "Spinning"; sb.setAttribute("aria-label", "Earth, fast: a quick spin at a 20° tilt"); eb.after(sb); } }
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
root.dataset.view = view; syncTimebar(); root.dataset.dome = domeOn() || sphOn() || geo3On() ? "1" : "";
win.setTimeout(() => { const b = root.querySelector(`#vseg button[data-v="${view}"]`); if (b && isPhone()) b.scrollIntoView({inline:"nearest", block:"nearest"}); }, 50);
dbg.__ivArc = nm => { const c = CHCAT.find(c => c.short === nm); if (!c) return null; const a = (c.a0 + c.a1)/2, r = $("#cv").getBoundingClientRect(); return [r.left + sx(CH_C.x) + Math.cos(a)*CH_R*k*1.07, r.top + sy(CH_C.y) + Math.sin(a)*CH_R*k*1.07]; };
dbg.__ivYaw = () => [view, csYaw, sphOn()];
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
const ro = new ResizeObserver(() => { if (dead) return; const first = W === 0; resize(); if (first && W) fit(false); placePlaybar(); placeAnitab(); fitFocus(); }); ro.observe(cv);
if (doc.fonts) doc.fonts.ready.then(() => { if (!dead) { readCss(); draw(); } });

// the whole top bar (title, maps, filters, options) can tuck away; a small tab brings it back
{ const hd = root.querySelector("header"), hb = hd.querySelector("h1").createEl("button", { cls: "hcol", text: "︿", attr: { "aria-label": "Hide the top bar", title: "Hide the top bar" } });
  const tab = $("#main").createEl("button", { cls: "htab", text: "﹀", attr: { "aria-label": "Show the top bar", title: "Show the top bar" } });
  const set = c => { hd.hidden = c; tab.hidden = !c; save("iv-hcol", c); };
  const flip = c => { set(c); win.setTimeout(() => { resize(); if (sel >= 0) flyTo(sel); else fit(true); }, 30); };   // reframe for the new height
  // centered chevrons (Obsidian's own icons) in place of the wide ︿ ﹀ characters
  for (const [b, ic] of [[hb, "chevron-up"], [tab, "chevron-down"]]) { b.empty(); setIcon(b, ic); const sv = b.querySelector("svg"); if (sv) { sv.setAttribute("width", "16"); sv.setAttribute("height", "16"); } }
  hb.onclick = () => flip(true); tab.onclick = () => flip(false);
  set(pref("iv-hcol", false) === true); }

// watermarks on the map: Linking Your Thinking at the bottom center, and (desktop) the plugin's name at the top left. Neither takes clicks.
{ const m = cv.parentElement;
  const lyt = m.createDiv({ cls: "wm wm-lyt", attr: { "aria-hidden": "true" } }); lyt.appendChild(root.querySelector(".brand .duo").cloneNode(true)); lyt.createSpan({ text: "Linking Your Thinking" });
  const nm = m.createDiv({ cls: "wm wm-name", attr: { "aria-hidden": "true" } }); nm.appendText("Maps of the "); nm.createEl("em", { text: "Ideaverse" }); }

// Starfield twinkle: now and then (every few seconds) one star, rarely two, glints and fades. It draws on its own
// thin canvas over the map, so the map never redraws for it.
let twOn = pref("iv-twinkle", true) !== false, twWake = () => {};
{ const tw = doc.createElement("canvas"); tw.className = "twinkle"; cv.after(tw); const tx_ = tw.getContext("2d"); let list = [], next = 0, raf = 0, tmo = 0;
  const active = () => twOn && view === "stars" && !dead && !doc.hidden && W > 0 && senseT == null;
  const pickStar = () => { for (let t = 0; t < 40; t++) { const i = Math.floor(Math.random()*n); if (!VV(i) || N[i].level < 2 || i === sel) continue; const x = sx(X[i]), y = sy(Y[i]); if (x > 20 && x < W - 20 && y > 20 && y < H - 20) return i; } return -1; };
  const frame = now => { raf = 0; if (!active()) { list = []; tx_.clearRect(0, 0, tw.width, tw.height); return; }
    const d = Math.min(2, win.devicePixelRatio || 1); if (tw.width !== Math.round(W*d) || tw.height !== Math.round(H*d)) { tw.width = Math.round(W*d); tw.height = Math.round(H*d); }
    tw.style.left = cv.offsetLeft + "px"; tw.style.top = cv.offsetTop + "px"; tw.style.width = W + "px"; tw.style.height = H + "px";
    if (now >= next) { const c = Math.random() < .2 ? 2 : 1; for (let q = 0; q < c; q++) { const i = pickStar(); if (i >= 0) list.push({ i, t0: now, dur: 1100 + Math.random()*700 }); } next = now + 3500 + Math.random()*4500; }
    tx_.setTransform(d, 0, 0, d, 0, 0); tx_.clearRect(0, 0, W, H); tx_.globalCompositeOperation = "lighter";
    list = list.filter(o => now - o.t0 < o.dur);
    for (const o of list) { const e = (now - o.t0)/o.dur, a = Math.sin(e*Math.PI), x = sx(X[o.i]), y = sy(Y[o.i]), L = 4 + 3*N[o.i].level*a;
      tx_.globalAlpha = .55*a; tx_.strokeStyle = "#ffffff"; tx_.lineWidth = .8; tx_.beginPath(); tx_.moveTo(x - L, y); tx_.lineTo(x + L, y); tx_.moveTo(x, y - L*.8); tx_.lineTo(x, y + L*.8); tx_.stroke();
      tx_.globalAlpha = .35*a; tx_.drawImage(sprite(SPAL[SC[o.i]]), x - L, y - L, L*2, L*2); }
    if (list.length) raf = RAF(frame); else { win.clearTimeout(tmo); tmo = win.setTimeout(() => { if (!raf) raf = RAF(frame); }, Math.max(200, next - performance.now())); } };
  twWake = () => { if (!active()) { if (raf) { win.cancelAnimationFrame(raf); raf = 0; } win.clearTimeout(tmo); list = []; tx_.clearRect(0, 0, tw.width, tw.height); return; } if (!raf) { if (!next) next = performance.now() + 2500; raf = RAF(frame); } }; }

// hover hints: Obsidian's own quick tooltip, not the browser's slow one. Every title becomes an aria-label (which Obsidian shows
// as its tooltip), now and whenever one is set later.
{ const quick = el => { if (el.getAttribute && el.getAttribute("aria-label") && el.getAttribute("data-tooltip-delay") !== "333") el.setAttribute("data-tooltip-delay", "333"); };   // a third of a second
  const move = el => { quick(el); const t = el.getAttribute("title"); if (t == null) return; el.removeAttribute("title"); if (t && !el.getAttribute("aria-label")) el.setAttribute("aria-label", t); else if (t && el.getAttribute("aria-label") !== t && el.dataset.tipFromTitle) el.setAttribute("aria-label", t); el.dataset.tipFromTitle = "1"; quick(el); };
  root.querySelectorAll("[title], [aria-label]").forEach(move);
  new MutationObserver(ms => { for (const m of ms) if (m.type === "attributes") move(m.target); else for (const nd of m.addedNodes) if (nd.nodeType === 1) { move(nd); nd.querySelectorAll && nd.querySelectorAll("[title], [aria-label]").forEach(move); } })
    .observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["title", "aria-label"] }); }

// ---------- the toolbar: one row, the way Bases lays out its own ----------
// Left: the two dots, the maps (the current map's tab opens its variants and options), and the counts.
// Right: Arrange, Group (maps that group), Filter (with a count when on), Display, Find, Follow note, Saved.
// The controls are the same elements as before, moved into place, so everything they did still works.
{ const hd = root.querySelector("header"); hd.classList.add("tb2");
  const SVGNS = "http://www.w3.org/2000/svg";
  const icon = parts => { const s_ = doc.createElementNS(SVGNS, "svg"); s_.setAttribute("width", "15"); s_.setAttribute("height", "15"); s_.setAttribute("viewBox", "0 0 16 16"); s_.setAttribute("aria-hidden", "true");
    for (const [tag, at] of parts) { const e = doc.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); e.setAttribute("stroke", "currentColor"); if (!at.fill) e.setAttribute("fill", "none"); e.setAttribute("stroke-width", "1.4"); e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-linejoin", "round"); s_.appendChild(e); }
    return s_; };
  const I = {
    arrange: [["path", { d: "M2 4h9M2 8h6M2 12h3M13 3v10M10.5 10.5L13 13l2.5-2.5" }]],
    group: [["rect", { x: "2", y: "2.5", width: "12", height: "4", rx: "1" }], ["rect", { x: "2", y: "9.5", width: "12", height: "4", rx: "1" }]],
    filter: [["path", { d: "M2 3h12l-4.5 5.5V13l-3-1.5v-3z" }]],
    display: [["path", { d: "M2 4h12M2 8h12M2 12h12" }], ["circle", { cx: "5", cy: "4", r: "1.6", fill: "var(--bg)" }], ["circle", { cx: "11", cy: "8", r: "1.6", fill: "var(--bg)" }], ["circle", { cx: "7", cy: "12", r: "1.6", fill: "var(--bg)" }]],
    focus: [["circle", { cx: "8", cy: "8", r: "5.5" }], ["circle", { cx: "8", cy: "8", r: "1.8", fill: "currentColor" }], ["path", { d: "M8 1v2M8 13v2M1 8h2M13 8h2" }]],
    sync: [["path", { d: "M13.2 6.2A5.5 5.5 0 0 0 3.1 4.9" }], ["path", { d: "M2.6 2.4v2.9h2.9" }], ["path", { d: "M2.8 9.8a5.5 5.5 0 0 0 10.1 1.3" }], ["path", { d: "M13.4 13.6v-2.9h-2.9" }]],
    star: [["path", { d: "M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" }]],
  };
  const left = hd.createDiv({ cls: "tbl" }), right = hd.createDiv({ cls: "tbr" });
  left.appendChild(root.querySelector(".brand .duo")); left.appendChild($("#vsegms")); { const fbar = $("#focusbar"); fbar.classList.add("mapfb"); cv.parentElement.appendChild(fbar); }   // the focus bar floats at the top of the map
  // the note and link counts sit at the map's top left (the plugin's name sits at the top right, clear of the note panel)
  { const st = $("#stats"); st.classList.add("mapstats"); cv.parentElement.appendChild(st); }
  // the main tabs: Emergence, Ideaverse, Starfield, Tesla. Gravity and Sensemaking move to the top of More
  { const vs = $("#vseg"), em = vs.querySelector('button[data-v="emergence"]'), st = vs.querySelector('button[data-v="stars"]');
    const mk = (v, label, tip, go) => { const b = doc.createElement("button"); b.dataset.v = v; b.textContent = label; b.setAttribute("aria-label", tip); b.onclick = e => { if ((v === "ideaverse" && view === v) || (v === "tesla" && view === "chord" && CSPH === "in")) { e.stopPropagation(); toggleMapOpts(b); return; } closePops(); go(); root.querySelectorAll("#vseg button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === tabOf()))); if (typeof syncTB === "function") syncTB(); }; return b; };
    em.after(mk("ideaverse", "Ideaverse", "Your whole vault as a ball of notes in 3D: drag to turn it, scroll to fly in", () => setView("ideaverse")));
    st.after(mk("tesla", "Tesla", "Every note on a glass globe, grouped by kind; links cross through the inside", () => goChord("in")));
    for (const v of ["gravity", "sense"]) { const b = vs.querySelector(`button[data-v="${v}"]`); if (b) { b.hidden = true; b.classList.add("vburied"); } } }
  // it sits outside the scrolling tabs, beside More, so it never scrolls out of sight
  // every main tab gets the ▾ when its map has a menu (Gravity and Sensemaking have Years shown)
  for (const v_ of ["sense"]) { const b_ = root.querySelector(`#vseg button[data-v="${v_}"]`); if (b_ && !b_.querySelector(".vcar")) { b_.createSpan({ cls: "vcar", text: " ▾" }); b_.setAttribute("aria-haspopup", "true"); } }
  // the more-maps grid: the next eight map names in small type, two rows of four, between the tabs and More (Display → Show more map names)
  const vgrid = $("#vsegms").createDiv({ cls: "vgrid", attr: { role: "group", "aria-label": "More maps" } });
  for (const [v, t, go] of [["gravity", "Gravity", () => setView("gravity")], ["sense", "Sensemaking", () => setView("sense")], ["graph", "Obsidian", () => setView("graph")], ["chord", "Chord", () => goChord("")], ["corona", "Corona", () => goChord("out")], ["treemap", "Treemap", () => setView("treemap")], ["mosaic", "Mosaic", () => setView("mosaic")], ["shelf", "Bookshelf", () => setView("shelf")]]) {
    const b = vgrid.createEl("button", { text: t, cls: "vg", attr: { type: "button" } }); b.dataset.vg = v; b.onclick = e => { e.stopPropagation(); closePops(); driftStop(); go(); if (typeof syncTB === "function") syncTB(); }; }
  const vcurSeg = $("#vsegms").createDiv({ cls: "seg vcurseg" }), vcur = vcurSeg.createEl("button", { cls: "vcur", attr: { id: "vcur", type: "button", "aria-haspopup": "true", "aria-expanded": "false" } });
  $("#vmore").setText("More ▾"); $("#vmore").setAttribute("aria-label", "More maps");
  $("#vsegms").insertBefore($("#vmore"), $("#vseg").nextSibling);   // More sits outside the tabs, so it never scrolls out of sight
  // More: Chord, Corona, Tesla, Treemap and Bookshelf straight away; Geometric, Linear, Planet and Unfinished under Experimental
  { const pop = $("#vmorepop"), ex = $("#mexp"), sk = ex.querySelector(":scope > details"); for (const b of [...ex.querySelectorAll(":scope > button")]) pop.insertBefore(b, ex);
    if (sk) { sk.classList.remove("mexp2"); sk.querySelector(":scope > summary").setText("Experimental"); pop.insertBefore(sk, ex); } ex.remove();
    // Posters: a targeted dataset by its own properties, right after Bookshelf
    const gp = doc.createElement("button"); gp.className = "chip"; gp.id = "goposters"; gp.textContent = "Posters"; gp.setAttribute("aria-label", "Your notes as cards, laid out by their own properties (a year, a genre, a rating), with their pictures");
    $("#goshelf").after(gp); gp.onclick = () => { closePops(); driftStop(); setView("posters"); };
    // Graph: our take on the core graph view, first in the list
    const gg = doc.createElement("button"); gg.className = "chip"; gg.id = "gograph"; gg.textContent = "Obsidian"; gg.setAttribute("aria-label", "Like Obsidian's graph view: notes pulled together by their links, drawn with the emergence symbols");
    for (const [id, v, label, tip] of [["gogravity", "gravity", "Gravity", "The five levels as rings: hubs at the center, unlinked notes on the rim"], ["gosense", "sense", "Sensemaking", "Four ways of working with notes, as a 2×2"]]) {
      const b = doc.createElement("button"); b.className = "chip"; b.id = id; b.textContent = label; b.setAttribute("aria-label", tip); $("#gochord").before(b); b.onclick = () => { closePops(); driftStop(); setView(v); }; }
    { const co = $("#gocso"); if (co) co.textContent = "Corona"; const te = $("#gocsi"); if (te) { te.textContent = "Tesla"; te.hidden = true; te.classList.add("gone"); } }
    $("#gochord").before(gg); gg.onclick = () => { closePops(); driftStop(); setView("graph"); };
    // Mosaic: every note a tile, after Treemap
    const gm = doc.createElement("button"); gm.className = "chip"; gm.id = "gomosaic"; gm.textContent = "Mosaic"; gm.setAttribute("aria-label", "Every note a tile, set like stones: Level 5 at the heart, each level a frame around it");
    $("#gotreemap").after(gm); gm.onclick = () => { closePops(); driftStop(); setView("mosaic"); };
    // People: a constellation of the people your notes name, after Posters
    const gpp = doc.createElement("button"); gpp.className = "chip"; gpp.id = "gopeople"; gpp.textContent = "People"; gpp.setAttribute("aria-label", "The people your notes name (director, actors, author, guests) as stars, joined by the notes they share");
    gpp.onclick = () => { closePops(); driftStop(); setView("people"); };
    // Posters and People are for targeted sets (a base of films, a collection of books): Experimental → Specialized
    { const exp_ = pop.querySelector(":scope > details"), sp = doc.createElement("details"); sp.className = "mexp mexp2"; sp.id = "mspec"; const su = doc.createElement("summary"); su.textContent = "Specialized"; sp.appendChild(su);
      sp.appendChild(gp); sp.appendChild(gpp); if (exp_) exp_.appendChild(sp); else pop.appendChild(sp); } }
  { const pc = $("#laygrp").createDiv({ cls: "postctl", attr: { id: "pplctl" } }); pc.hidden = true;
    pc.createDiv({ cls: "phint", text: "People from these properties:" }); pc.createDiv({ cls: "plchips pplchips" });
    const row = pc.createEl("label", { cls: "prow" }); row.createSpan({ text: "Show" }); const r = row.createEl("input", { type: "range" }); r.min = "5"; r.max = "150"; r.step = "1"; r.value = String(PPL.max);
    pc.createDiv({ cls: "phint pplv" }); let t_ = 0;
    r.oninput = () => { PPL.max = +r.value; win.clearTimeout(t_); t_ = win.setTimeout(() => { save("iv-pplmax", PPL.max); morph(true, () => fitTarget()); }, 180); }; }
  // Mosaic's own option: Emergence or Scattered
  { const ms_ = $("#laygrp").createDiv({ cls: "seg", attr: { id: "mosseg", role: "group", "aria-label": "Mosaic" } }); ms_.hidden = true;
    for (const [v, t, tip] of [["emergence", "Emergence", "Level 5 at the heart, each level a frame around it"], ["scatter", "Scattered", "The same tiles, in no order"]]) {
      const b = ms_.createEl("button", { text: t, attr: { type: "button", "data-ms": v, "aria-label": tip, "aria-pressed": String(MOS === v) } });
      b.onclick = e => { e.stopPropagation(); MOS = v; save("iv-mos", v); ms_.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.ms === v))); morph(true, () => fitTarget()); legend(); }; } }
  // Years shown: two handles from the first note's year to this year
  { const yc = $("#laygrp").createDiv({ cls: "postctl yrctl", attr: { id: "yrctl" } }); yc.hidden = true;
    const hd = yc.createDiv({ cls: "prow" }); hd.createSpan({ text: "Years shown" }); hd.createEl("b", { cls: "yrv" });
    const box = yc.createDiv({ cls: "prng" }), d = box.createDiv({ cls: "dual" }); d.createSpan({ cls: "trk" }); d.createSpan({ cls: "fill" });
    const a = d.createEl("input", { type: "range", attr: { "aria-label": "First year shown" } }), b = d.createEl("input", { type: "range", attr: { "aria-label": "Last year shown" } });
    for (const x of [a, b]) { x.min = SLMIN; x.max = NOW_Y; x.step = 1; } const lb = box.createDiv({ cls: "srange" }); lb.createSpan({ text: String(SLMIN) }); lb.createSpan({ text: String(NOW_Y) });
    yc.createDiv({ cls: "phint", text: "Drag either end. With the switch on, notes from other years and notes with no date wait in strips at the edges; off, they leave the map." });
    // the same thin switch as Wander Mode's
    const tg = yc.createEl("label", { cls: "pmaps yrall", attr: { "aria-label": "Show notes with no date, and notes from before or after the years shown, in strips at the edges" } });
    const cb = tg.createEl("input", { type: "checkbox", attr: { id: "yrall" } }); cb.checked = YRALL; tg.createEl("i", { cls: "sw" }); tg.createSpan({ text: "Show notes outside the date range" });
    cb.onchange = () => { YRALL = cb.checked; save("iv-yrall", YRALL); relayout(true, false, () => fitTarget()); };
    let t_ = 0; const upd = commit => { let p = +a.value, q = +b.value; if (p > q) [p, q] = [q, p]; YR0 = p; YR1 = q; fromY = fullY = YR0; SY0 = YR0; SY1 = YR1; syncYr();
      if (view === "sense" && typeof senseSteps === "function") { senseStop(); senseT = null; senseTrail = []; SSTEPS = senseSteps(); $("#tlrange").max = SSTEPS.length - 1; $("#tlrange").value = SSTEPS.length - 1; $("#tldate").textContent = "All time"; }
      win.clearTimeout(t_); if (commit) { save("iv-yr0", YR0); save("iv-yr1", YR1); } t_ = win.setTimeout(() => { relayout(false); if (typeof syncTB === "function") syncTB(); }, commit ? 0 : 90); };
    a.oninput = b.oninput = () => upd(false); a.onchange = b.onchange = () => upd(true); }
  // Posters' own options, in its map menu: Across, Lanes, Size
  { const pc = $("#laygrp").createDiv({ cls: "postctl", attr: { id: "postctl" } }); pc.hidden = true;
    // Rows (a category per row) or Scatter (a second number bottom to top)
    const pm = pc.createDiv({ cls: "pmode" }); pm.createSpan({ text: "Layout" }); const pseg = pm.createDiv({ cls: "seg", attr: { id: "pmode", role: "group", "aria-label": "Posters layout" } });
    for (const [m, t, tip] of [["rows", "Rows", "One row per value of a category (genre, status, director)"], ["scatter", "Scatter", "Two numbers: one left to right, one bottom to top (your rating against the crowd's)"], ["mosaic", "Mosaic", "Every card as a tile, no gaps: a block per category, each tile sized by Card size"]]) {
      const b = pseg.createEl("button", { text: t, attr: { type: "button", "data-pm": m, "aria-label": tip } });
      b.onclick = e => { e.stopPropagation(); let h = ""; PST.mosaic = m === "mosaic"; save("iv-pmosaic", PST.mosaic);
        if (m === "mosaic") { morph(true, () => fitTarget()); legend(); return; }
        if (m === "scatter") { const o = postersDetect(), cu = PST.cur || {}, c = o.across.filter(a => a.id !== cu.acrossId && a.id !== "@created");
          const pick = c.find(a => a.id === PST.lastHeight) || c.find(a => /^(rank|rating|stars|score|my.?rating)$/i.test(a.id)) || c[0]; if (!pick) return; h = pick.id; }
        PST.height = h; save("iv-pheight", h); morph(true, () => fitTarget()); legend(); }; }
    const HINT = { across: "A date or number. Places each card left to right.", height: "A second number. Places each card bottom to top.", lanes: "A category. Each value gets its own row.", size: "A number. The bigger it is, the bigger the card." };
    for (const [id, lab_, pk, key] of [["pacross", "Left to right", "iv-pacross", "across"], ["pheight", "Bottom to top", "iv-pheight", "height"], ["planes", "Rows by", "iv-planes", "lanes"], ["psize", "Card size", "iv-psize", "size"]]) {
      const row = pc.createEl("label", { cls: "prow", attr: { "data-k": key } }); row.createSpan({ text: lab_ }); const sel_ = row.createEl("select", { attr: { id } });
      pc.createDiv({ cls: "phint", text: HINT[key], attr: { "data-k": key } });
      sel_.onchange = () => { PST[key] = sel_.value; if (key === "height" && sel_.value) PST.lastHeight = sel_.value; save(pk, sel_.value); morph(true, () => fitTarget()); legend(); };
      const rg = pc.createDiv({ cls: key === "lanes" ? "plchips" : "prng", attr: { id: "rng-" + key } }); rg.hidden = true; }
    pc.createDiv({ cls: "pn", attr: { id: "pimg" } }); }
  const VN = () => ({ emergence: "Emergence", spacetime: "Space-Time", gravity: "Gravity", stars: "Starfield", sense: "Sensemaking", arc: "Arc",
    chord: CSPH === "out" ? "Corona" : CSPH === "in" ? "Tesla" : "Chord", quincunx: ({ square: "Square", hex: "Hexagon", mandala: "Mandala", octa: "Octahedron", shells: "Shells" })[GEO] || "Geometric",
    shelf: "Bookshelf", posters: "Posters", graph: "Obsidian", ideaverse: "Ideaverse", mosaic: "Mosaic", people: "People", tree: "Tree", treemap: "Treemap", skyline: "Skyline", planet: "Planet · " + ({ flat: "Flat", table: "Tabletop", globe: "Globe" })[PMODE], lincal: "Linear Calendar", spiral: "Spiral", lifeline: "Lifeline" })[view] || view;
  const CORE = new Set(["emergence", "spacetime", "ideaverse", "stars"]);
  // the current map's menu: its variants (Emergence, Starfield) and the options that belong to it alone
  const mo = $("#vsegms").createDiv({ cls: "mspop mapopts", attr: { id: "mapopts", role: "dialog", "aria-label": "This map" } }); mo.hidden = true;
  const moT = mo.createDiv({ cls: "pt" });
  for (const id of ["#emerpop", "#starpop", "#sensepop"]) { const el = $(id); el.classList.remove("mspop"); el.classList.add("mosec"); el.hidden = true; mo.appendChild(el); }
  { const g = $("#starpop").createDiv({ cls: "sglow" }); g.createSpan({ cls: "sgl", text: "Galaxy glow" }); const seg = g.createDiv({ cls: "seg", attr: { role: "group", "aria-label": "Galaxy glow" } });
    for (const [v, t] of [["soft", "Soft"], ["normal", "Normal"], ["bright", "Bright"]]) { const b = seg.createEl("button", { text: t, attr: { type: "button", "data-g": v, "aria-pressed": String(v === sGlow) } });
      b.onclick = e => { e.stopPropagation(); sGlow = v; save("iv-sglow", v); seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.g === v))); draw(); }; }
    const tog = (label, get, set) => { const r = $("#starpop").createDiv({ cls: "sglow" }); r.createSpan({ cls: "sgl", text: label }); const sg = r.createDiv({ cls: "seg", attr: { role: "group", "aria-label": label } });
      for (const [v, t] of [[false, "Off"], [true, "On"]]) { const b = sg.createEl("button", { text: t, attr: { type: "button", "aria-pressed": String(get() === v) } });
        b.onclick = e => { e.stopPropagation(); set(v); sg.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String((j === 1) === v))); }; } };
    tog("Twinkle", () => twOn, v => { twOn = v; save("iv-twinkle", v); twWake(); });
    tog("Turning galaxies", () => sTurn, v => { sTurn = v; save("iv-sturn", v); turnSync(); if (!v && view === "stars") { glowKey = ""; morph(true); } }); }
  const moL = mo.createDiv({ cls: "pt mol", text: "This map" }); mo.appendChild($("#laygrp")); const moNone = mo.createDiv({ cls: "pn", text: "Nothing to set on this map." });
  const hasLay = () => [...$("#laygrp").children].some(el => !el.hidden && !el.classList.contains("glbl"));
  const variants = () => view === "emergence" || view === "spacetime" ? "#emerpop" : view === "stars" ? "#starpop" : view === "sense" && SAI ? "#sensepop" : null;
  toggleMapOpts = b => { const open = mo.hidden; closePops("#mapopts"); if (typeof closeColl === "function") closeColl(); if (!open) { mo.hidden = true; b.setAttribute("aria-expanded", "false"); return; }
    const v_ = variants(); for (const id of ["#emerpop", "#starpop", "#sensepop"]) $(id).hidden = id !== v_; if (v_ === "#emerpop" && typeof syncEmd === "function") syncEmd();
    syncRange(); moT.setText(VN()); const l = hasLay(); moL.hidden = !l || !v_; moNone.hidden = l || !!v_;
    mo.style.left = Math.max(0, b.offsetLeft - 4) + "px"; mo.hidden = false; b.setAttribute("aria-expanded", "true"); };
  POPS.push(["#vcur", "#mapopts", "#vsegms"]);
  vcur.onclick = e => { e.stopPropagation(); toggleMapOpts(vcur); };
  // a button and its popover, closed by a click outside or Escape like the others
  const popBtn = (id, label, ic, cls) => { const w = right.createDiv({ cls: "ms tbms", attr: { id: id + "ms" } }), b = w.createEl("button", { cls: "tbb" + (cls ? " " + cls : ""), attr: { id: id + "btn", type: "button", "aria-haspopup": "true", "aria-expanded": "false" } });
    b.appendChild(icon(I[ic])); b.createSpan({ cls: "tbl2", text: label }); const val = b.createEl("b"); const p = w.createDiv({ cls: "mspop tbpop", attr: { id: id + "pop", role: "dialog", "aria-label": label } }); p.hidden = true;
    POPS.push(["#" + id + "btn", "#" + id + "pop", "#" + id + "ms"]); return { w, b, p, val }; };
  const opener = (P, onOpen) => P.b.onclick = e => { e.stopPropagation(); const open = P.p.hidden; closePops("#" + P.p.id); if (typeof closeColl === "function") closeColl(); P.p.hidden = !open; P.b.setAttribute("aria-expanded", String(open)); if (open && onOpen) onOpen(); };
  // Arrange: what left-to-right means (Time, ACE, a number, one of your properties)
  const AR = popBtn("arr", "Arrange", "arrange");
  const axisName = m => m === "time" ? "Time" : m === "ace" ? ($('#xseg button[data-x="ace"]').textContent || "ACE") : m === "rank" ? "Rank" : (AXES[m] && AXES[m].name) || (($(`#xmore option[value="${CSS.escape(m)}"]`) || {}).textContent) || m;
  // what Arrange does depends on the map: left to right, around the circle, around you, or the stars' color
  const arrWhat = () => view === "gravity" ? "Arrange notes around the circle by" : view === "stars" ? "Color the stars by" : view === "emergence" ? "Arrange notes left to right by" : "Arrange notes by";
  const fillArr = () => { AR.p.empty(); AR.p.createDiv({ cls: "pt", text: arrWhat() });
    const row = (m, txt) => { const r = AR.p.createEl("button", { cls: "orow" + (m === mode ? " on" : ""), attr: { type: "button", role: "menuitemradio", "aria-checked": String(m === mode) } }); r.createSpan({ cls: "rd" }); r.createSpan({ text: txt }); r.onclick = () => { closePops(); setMode(m); }; };
    row("time", "Time"); row("ace", axisName("ace")); { const rb = $('#xseg button[data-x="rank"]'); if (rb && !rb.hidden) row("rank", rb.textContent); }
    const opts = [...root.querySelectorAll("#xmore option")].filter(o => o.value);
    const nums = opts.filter(o => !o.value.startsWith("n:")), props_ = opts.filter(o => o.value.startsWith("n:"));
    if (nums.length) { AR.p.createDiv({ cls: "pt", text: "Numbers" }); for (const o of nums) row(o.value, o.textContent); }
    if (props_.length) { AR.p.createDiv({ cls: "pt", text: "Your properties" }); for (const o of props_) row(o.value, o.textContent); }
    AR.p.createDiv({ cls: "pn", text: "Add number properties in Settings → Properties to plot." }); };
  opener(AR, fillArr);
  // Group: only on maps that group (Bookshelf, Chord, Treemap)
  const GR = popBtn("grp", "Group", "group");
  const gsec = (title, id) => { const w = GR.p.createDiv({ cls: "gsec" }); w.createDiv({ cls: "pt", text: title }); w.appendChild($(id)); return [w, $(id)]; };
  const GS = [gsec("Shelve books by", "#shelfsort"), gsec("Arcs by", "#chordby"), gsec("Subfolders", "#tmsubs")];
  opener(GR);
  // Filter: folders, collections, Efforts
  const FI = popBtn("filt", "Filter", "filter"); const badge = FI.b.createSpan({ cls: "tbadge" });
  const fsec = (title, el) => { const w = FI.p.createDiv({ cls: "fsec" }); w.createDiv({ cls: "pt", text: title }); w.appendChild(el); };
  // Years shown: one setting for every map of the whole vault, so it lives here rather than in each map's menu
  const yrSec = FI.p.createDiv({ cls: "fsec yrsec" }); yrSec.appendChild($("#yrctl"));
  // Folders and Collections, open side by side: every choice in view, no pill to open first
  const fcols = FI.p.createDiv({ cls: "fcols" });
  { const fc = fcols.createDiv({ cls: "fcol" }), hd = fc.createDiv({ cls: "fhd" }); hd.createSpan({ cls: "pt", text: "Folders" }); const ac = hd.createSpan({ cls: "facts" }); ac.appendChild($("#foldall")); ac.appendChild($("#foldnone"));
    fc.appendChild($("#foldlist")); const sp = $("#specialt"); if (sp) { const sbox = sp.nextElementSibling; fc.appendChild(sp); if (sbox) fc.appendChild(sbox); } }
  { const cc = fcols.createDiv({ cls: "fcol" }), hd = cc.createDiv({ cls: "fhd" }); hd.createSpan({ cls: "pt", text: "Collections" }); const ac = hd.createSpan({ cls: "facts" }); ac.appendChild($("#collcount")); ac.appendChild($("#collclear"));
    cc.appendChild($("#collq").parentElement); cc.appendChild($("#colllist")); if (!COLL.length) cc.createEl("p", { cls: "pn", text: "No collections yet (a collection shows here once 10 notes name it)." }); }
  $("#foldms").hidden = true; $("#collms").hidden = true; $("#foldms").classList.add("gone"); $("#collms").classList.add("gone"); fsec("Efforts", $("#effbtn")); $("#effbtn").setText("Light up areas and projects");
  opener(FI, () => { renderFoldList(); renderCollList(true); syncColl(); });
  // Display: links, theme, how scoring works
  const DI = popBtn("disp", "Display", "display");
  const dsec = (title, el) => { const w = DI.p.createDiv({ cls: "fsec" }); w.createDiv({ cls: "pt", text: title }); w.appendChild(el); };
  // Display: a short list, no headings: a switch for every link, then how scoring works
  DI.p.classList.add("dlist"); const hold = DI.p.createDiv({ cls: "dhold" }); hold.hidden = true; hold.appendChild($("#alllinks"));
  // Show more map names: the grid beside the tabs (wide windows), with the themes moved in here
  const vgSw = DI.p.createEl("label", { cls: "pmaps drow", attr: { "aria-label": "Show eight more map names in small type beside the tabs, on wide windows; the theme buttons move into Display" } }); const vgCb = vgSw.createEl("input", { type: "checkbox" }); vgSw.createEl("i", { cls: "sw" }); vgSw.createSpan({ text: "Show more map names" });
  vgCb.checked = VGRID; vgCb.onchange = () => { VGRID = vgCb.checked; save("iv-vgrid", VGRID); syncTB(); };
  const alSw = DI.p.createEl("label", { cls: "pmaps drow", attr: { "aria-label": "Draw every link on the map, faintly" } }); const alCb = alSw.createEl("input", { type: "checkbox" }); alSw.createEl("i", { cls: "sw" }); alSw.createSpan({ text: "Show all links" });
  alCb.onchange = () => { if (alCb.checked !== showAll) $("#alllinks").click(); };
  const thSec = DI.p.createDiv({ cls: "fsec thsec" }); thSec.createDiv({ cls: "pt", text: "Theme" });
  DI.p.appendChild($("#scorebtn")); $("#scorebtn").className = "drow dlink"; $("#scorebtn").setText("How notes are scored ›");
  $("#scorebtn").addEventListener("click", () => closePops());
  opener(DI, () => { alCb.checked = showAll; });
  // Find, Follow note (an icon), Saved, and the ︿ that tucks the bar away
  right.appendChild(root.querySelector("header .search"));
  // Focus on active note (the note and its neighbors), then Sync active note with the Obsidian editor
  const fo = $("#focusmode"); fo.empty(); fo.appendChild(icon(I.focus)); fo.classList.add("tbb", "tbi"); fo.setAttribute("aria-label", "Focus on active note"); fo.title = "Focus on active note"; right.appendChild(fo);
  // Sync uses Obsidian's own link icon
  const fb = $("#follownote"); fb.empty(); setIcon(fb, "link"); { const sv = fb.querySelector("svg"); if (sv) { sv.setAttribute("width", "15"); sv.setAttribute("height", "15"); } } fb.classList.add("tbb", "tbi"); fb.setAttribute("aria-label", "Sync active note with Obsidian editor"); fb.title = "Sync active note with Obsidian editor"; right.appendChild(fb);
  right.appendChild($("#viewms")); { const vb = $("#viewbtn"); const t = vb.textContent.replace(/^★\s*/, ""); vb.empty(); vb.appendChild(icon(I.star)); vb.createSpan({ text: t || "Saved" }); vb.classList.add("tbb"); }
  // the themes sit at the far right of the bar, one click away (on a phone they move into Display)
  // notes changed (5 or more): a rescan icon lights up, with how many
  { const st = root.querySelector(".ivm-stale"); if (st) { const c = +st.dataset.count || 0; st.empty(); st.className = "tbb tbi ivm-stale"; setIcon(st, "refresh-cw"); const sv = st.querySelector("svg"); if (sv) { sv.setAttribute("width", "15"); sv.setAttribute("height", "15"); }
    st.createSpan({ cls: "tbadge", text: c ? String(c) : "" }); const t = `${c || "Some"} notes changed · rescan`; st.setAttribute("aria-label", t); st.title = t; right.appendChild(st); } }
  const thSlot = right.createDiv({ cls: "thslot" }); thSlot.appendChild($("#themeseg"));
  const hc = root.querySelector("header .hcol"); if (hc) right.appendChild(hc);
  const ARR_OFF = new Set(["ideaverse", "people", "mosaic", "graph", "posters", "spacetime", "sense", "arc", "chord", "quincunx", "shelf", "tree", "treemap", "skyline", "lincal", "spiral", "lifeline", "planet"]);
  syncTB = () => {
    const core = CORE.has(view) || (view === "chord" && CSPH === "in"); vcur.hidden = core; vcurSeg.hidden = core; vcur.setAttribute("aria-pressed", String(!core)); vcur.textContent = VN() + " "; vcur.createSpan({ cls: "vcar", text: "▾" });
    $("#vmore").classList.toggle("on", false);
    root.dataset.mo = variants() || hasLay() ? "1" : "";
    AR.w.hidden = ARR_OFF.has(view); AR.val.setText(axisName(mode));
    let g = false; for (const [w, el] of GS) { w.hidden = el.hidden; g = g || !el.hidden; } GR.w.hidden = !g;
    GR.val.setText(view === "shelf" ? (($("#shelfsort button[aria-pressed=true]") || {}).textContent || "") : view === "chord" ? (chOneFolder ? "Time · one folder" : (($("#chordby button[aria-pressed=true]") || {}).textContent || "")) : view === "treemap" ? ($("#tmsubs").getAttribute("aria-pressed") === "true" ? "Subfolders" : "Folders") : "");
    turnSync(); twWake();
    // themes sit at the far right, or in Display on phones and when the map-name grid is on (it needs the room)
    { const inD = isPhone() || VGRID, th = $("#themeseg"), want = inD ? thSec : thSlot; if (th.parentElement !== want) want.appendChild(th); thSec.hidden = !inD; thSlot.hidden = inD; }
    root.dataset.vgrid = VGRID ? "1" : ""; vgrid.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.vg === (view === "chord" ? (CSPH === "out" ? "corona" : CSPH === "in" ? "tesla" : "chord") : view))));
    { const m = cv.parentElement.getBoundingClientRect(), c = cv.getBoundingClientRect(), off = Math.max(0, m.right - c.right) + sideW(); const wn = root.querySelector(".wm-name"); if (wn) wn.style.right = (off + 16) + "px";
      const fbar = $("#focusbar"); if (fbar) fbar.style.left = ((c.left - m.left) + (c.width - sideW())/2) + "px"; }
    yrSec.hidden = !YRV.has(view); $("#yrctl").hidden = !YRV.has(view); syncYr();
    const nf = (!$("#foldx").hidden ? 1 : 0) + (!$("#collx").hidden ? 1 : 0) + (YRV.has(view) && yrNarrow() ? 1 : 0); badge.setText(nf ? String(nf) : ""); badge.hidden = !nf; FI.b.classList.toggle("lit", nf > 0);
  };
  const mo2 = new MutationObserver(() => syncTB());
  for (const id of ["#foldx", "#collx"]) mo2.observe($(id), { attributes: true, attributeFilter: ["hidden"] });
  for (const id of ["#shelfsort", "#chordby"]) mo2.observe($(id), { attributes: true, subtree: true, attributeFilter: ["aria-pressed", "hidden"] });
  mo2.observe($("#tmsubs"), { attributes: true, attributeFilter: ["aria-pressed", "hidden"] });
  syncTB(); }

let scopeSig = null, baseSig = null, baseDirty = false;
if (following) win.setTimeout(() => followPath(host.activePath && host.activePath(), true), 400);   // opened while following: start on the active note

return {
  destroy(){ dead = true; ro.disconnect(); popObs.disconnect(); for (const id of frames) win.cancelAnimationFrame(id); frames.clear();
    win.clearTimeout(senseTimer); win.clearTimeout(pTimer); driftStop(); tip.remove(); },
  openNote(path){ const i = PIDX.get(path); if (i != null) navTo(i); },
  follow(path){ followPath(path); },
  // a base re-sends its notes whenever anything in the vault changes; only a different set of notes refits the view,
  // so zooming in isn't undone a second later
  setScope(paths){ const sig = paths == null ? "*" : paths.length + ":" + paths.join("\n"); if (dead) return;
    if (sig === scopeSig) { if (baseDirty) { baseDirty = false; relayout(!!W, false, () => ({ k, tx, ty })); } return; }
    scopeSig = sig; baseDirty = false; if (paths == null) SCOPE = null; else { SCOPE = new Uint8Array(n); for (const p of paths) { const i = PIDX.get(p); if (i != null) SCOPE[i] = 1; } } relayout(!!W, false, () => fitTarget()); },
  _posters(){ return { pimg: [...PIMG].filter(([, e]) => e.ok).length, cur: PST.cur, across: PST.opts && PST.opts.across.map(a => a.id + ":" + a.kind), lanes: PST.opts && PST.opts.lanes.map(a => a.id), img: PST.img, ticks: PST.ticks.length, fm: (() => { for (let i=0;i<n;i++) if (vis[i]) return [N[i].path, JSON.stringify(fmOf(i))]; })() }; },
  _graph(){ return { st: GPH.stepMs, dr: GPH.drawMs, mo: GPH.morph, it: GPH.it, its: GPH.its, key: GPH.key }; },
  setBaseInfo(info){ const sig = info ? JSON.stringify([info.sort, info.order, info.groups ? [...info.groups].join() : ""]) : ""; if (sig === baseSig) return;
    baseSig = sig; BASEINFO = info || null; FMC.clear(); PST.key = null; baseDirty = true; },
  toggleFollow(){ setFollowing(!following); return following; },
  themeChanged(){ const t = pref("iv-theme", null); if (t == null) setTheme(autoTheme()); else if (t === "obsidian") setTheme("obsidian"); },   // Obsidian's theme or mode changed
};
}
