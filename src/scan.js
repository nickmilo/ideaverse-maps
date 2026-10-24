/* Maps of the Ideaverse: the scan. Reads every note, measures its links, and gives it an Idea Emergence level (1-5).
   A port of the standalone map's scanner.py: same rules, same numbers. It never writes to notes.

   The vault comes in through a small adapter, so the same code runs inside Obsidian and in tests:
     files:   [{path, ctime, read: () => Promise<string>}]   every .md file (and .txt files inside the archive folder)
     resolve: (linkText, sourcePath) => path | null   where a [[link]] points */

const LINK = /\[\[([^\]|#^]+)/g;
const FENCE = /```[\s\S]*?```/g;
const WORD = /[\p{L}\p{N}_]+/gu;
const KEYS = /^([A-Za-z_][\w-]*):/gm;

/** Everything the scan needs from one note's text, so a note's text is read only when it changes (see adapter.cache). */
export const EXTRACT_VERSION = 4;
function extractNote(t){
  const [fm, body0] = splitFm(t), body = body0.replace(FENCE, ""), lines = nonEmptyLines(body);
  const keys = []; KEYS.lastIndex = 0; let km; while ((km = KEYS.exec(fm))) if (!keys.includes(km[1])) keys.push(km[1]);
  const P = []; for (const key of keys) { if (key === "up" || key === "related" || key === "collections") continue; for (const l of links(fmField(fm, key))) P.push(l); }
  const props = {};
  for (const [key, short] of [["year", "y"], ["yearXP", "yx"], ["imdbRating", "im"], ["open_rate", "or"]]) {
    const v = fmScalar(fm, key).replace(/%+$/, ""); const f = v === "" ? NaN : Number(v); if (isFinite(f)) props[short] = Math.round(f * 100) / 100; }
  { const m = /^\s*(-?\d{1,4})\b/.exec(fmScalar(fm, "lifespan")); if (m) props.born = parseInt(m[1], 10); }
  props.w = words(body); props.kb = kb(t); props.sf = senseFeatures(fm, body0, lines);
  const num = {}; for (const key of keys) { const v = fmScalar(fm, key).replace(/%+$/, ""); if (v !== "" && /^-?[\d.,]+$/.test(v)) { const f = Number(v.replace(/,/g, "")); if (isFinite(f)) num[key] = Math.round(f*100)/100; } }   // every number-valued property, for the By → More… axes
  const dates = dateFields(fm);
  return { num, dates, B: links(body), U: links(fmField(fm, "up")), R: links(fmField(fm, "related")), P, C: links(fmField(fm, "collections")),
    rank: fmScalar(fm, "rank"), lines: lines.length, linkLines: lines.filter(l => l.includes("[[")).length, props }; }
function extractArchive(t, isMd){
  const [fm, b0] = isMd ? splitFm(t) : ["", t], b = b0.replace(FENCE, ""), ls = nonEmptyLines(b);
  return { B: links(b), dates: dateFields(fm), w: words(b), kb: kb(t), sf: senseFeatures(fm, b0, ls), density: ls.length ? r3(ls.filter(l => l.includes("[[")).length / ls.length) : 0 }; }

export const DEFAULTS = {
  exclude: [],            // folders left off the map entirely
  archive: "",            // an archive folder: on the map as its own layer; its links never lift notes outside it
  packs: "",              // a folder on the map but off by default, never scored against the rest (Nick's learning packs)
  privateFolders: [],     // only big maps (Level 3+) from these folders appear
  homeNotes: [],          // always Level 5
  axisProps: ["year"],
  dateProps: ["created", "createdAt", "created_at", "created on", "date created", "dateCreated", "creation date", "creation_date"],  // the property that says when a note was made; the first one a note has wins (any capitalization)    // number properties offered under By → More… (as well as the built-in axes)
  mapFolders: [],         // every note in these folders counts as a map
  mapCollections: ["Maps", "Views"],   // notes listed in these collections count as maps
  fileDates: true,        // a note with no created date and no date in its name is dated by when its file was made
  l5Top: 0,               // the N highest-scoring notes become Level 5; 0 = scale with the vault
  l4MapLinks: 3, l3MinOut: 10, l3Density: 0.5, promoteL4: 6.5, promoteL3: 5.5, navJaccard: 0.7,
  weights: { body_in: 1.0, body_out: 0.6, up_in: 0.3, both: 0.8, coll_in: 0.0 },
};

const under = (rel, prefixes) => prefixes.some(p => p && (rel === p || rel.startsWith(p + "/")));
const base = p => p.slice(p.lastIndexOf("/") + 1);
const stem = p => { const b = base(p), d = b.lastIndexOf("."); return d > 0 ? b.slice(0, d) : b; };
const dirname = p => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function splitFm(text) {
  if (text.startsWith("---")) { const e = text.indexOf("\n---", 3); if (e > 0) return [text.slice(3, e), text.slice(e + 4)]; }
  return ["", text];
}
function fmField(fm, key) {
  const m = new RegExp("^" + esc(key) + ":([\\s\\S]*?)(?=^[A-Za-z_][\\w-]*:|(?![\\s\\S]))", "m").exec(fm);
  return m ? m[1] : "";
}
/** Every property whose value looks like it holds a date (a four-digit year), keyed in lower case, so the date property can be chosen in Settings without reading notes again. */
function dateFields(fm) { const d = {}, re = /^([^\s:#-][^:\n]*?)\s*:[ \t]*(\S.*)$/gm; let m; while ((m = re.exec(fm))) { const k = m[1].trim().replace(/^["']|["']$/g, "").toLowerCase(), v = m[2].trim().replace(/^["']+|["']+$/g, ""); if (!(k in d) && v.length < 64 && /\d{4}/.test(v)) d[k] = v; } return d; }
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** A date as YYYY-MM-DD from the shapes people write: 2024-05-01, 2024/5/1, [[2024-05-01]], 2024-05-01T09:30, 20240501…, May 1, 2024, 1 May 2024, 5/1/2024 (day first when the first number is over 12). */
export function parseDay(v) {
  if (v == null) return ""; let t = String(v).trim().replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").replace(/^["']+|["']+$/g, "").trim();
  const ok = (y, m, d) => { y = +y; m = +m; d = +d; if (!(y >= 1000 && y <= 2999 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return ""; return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t); if (m) return ok(m[1], m[2], m[3]);
  if (/^1\d{9}(\d{3})?$/.test(t)) { const d = new Date(+t * (t.length === 10 ? 1000 : 1)); return ok(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }   // seconds or milliseconds since 1970 (some exports)
  m = /^(\d{4})(\d{2})(\d{2})(?:\d{2,6})?$/.exec(t); if (m) return ok(m[1], m[2], m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(t); if (m) return +m[1] > 12 ? ok(m[3], m[2], m[1]) : ok(m[3], m[1], m[2]);
  m = /^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/.exec(t); if (m) { const i = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); if (i >= 0) return ok(m[3], i + 1, m[2]); }
  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/.exec(t); if (m) { const i = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); if (i >= 0) return ok(m[3], i + 1, m[1]); }
  return ""; }
/** The note's created date: the first of the date properties (Settings) it has, any capitalization. */
// a setting left at the old default (just "created") gets today's wider default, so createdAt and the like work without touching Settings
const dateKeys = C => !C.dateProps || !C.dateProps.length || (C.dateProps.length === 1 && String(C.dateProps[0]).toLowerCase() === "created") ? DEFAULTS.dateProps : C.dateProps;
const createdOf = (e, C) => { const d = e.dates || {}; for (const k of dateKeys(C)) { const v = parseDay(d[String(k).toLowerCase()]); if (v) return v; } return e.created ? parseDay(e.created) : ""; };
function fmScalar(fm, key) {
  const m = new RegExp("^" + esc(key) + ":[ \\t]*(.*)$", "m").exec(fm);
  return m ? m[1].trim().replace(/^["']+|["']+$/g, "") : "";
}
const links = s => { const out = []; LINK.lastIndex = 0; let m; while ((m = LINK.exec(s))) out.push(m[1]); return out; };
const nonEmptyLines = s => s.split(/\r\n|\r|\n/).filter(l => l.trim());
const FIRST_PERSON = /\b(I|I'm|I've|I'd|I'll|me|my|mine|myself)\b/g;
const QUERY = /```(dataview|dataviewjs|base|query)|!\[\[[^\]]+\.base/i;
/** Structure clues for the Sensemaking map: [headings, list lines, checkboxes, first-person words, questions, flags].
    flags: 1 = has a status property, 2 = has a due/deadline property, 4 = runs a query (Dataview/Bases). */
function senseFeatures(fm, rawBody, lines) {
  const h = lines.filter(l => { const t = l.trimStart(); return t.startsWith("#") && !t.startsWith("#["); }).length;
  const li = lines.filter(l => /^\s*([-*+]|\d+[.)])\s/.test(l)).length;
  const cb = lines.filter(l => /^\s*[-*+]\s\[.\]/.test(l)).length;
  const text = lines.join(" ");
  const fp = (text.match(FIRST_PERSON) || []).length, q = (text.match(/\?/g) || []).length;
  const flags = (fmScalar(fm, "status") ? 1 : 0) | (fmScalar(fm, "due") || fmScalar(fm, "deadline") ? 2 : 0) | (QUERY.test(rawBody) ? 4 : 0);
  return [h, li, cb, fp, q, flags];
}
const words = s => { const m = s.match(WORD); return m ? m.length : 0; };
const kb = s => Math.round(new TextEncoder().encode(s).length / 1024 * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;

export async function scanVault(adapter, settings, onProgress) {
  const C = Object.assign({}, DEFAULTS, settings || {});
  const W = Object.assign({}, DEFAULTS.weights, C.weights || {});
  { // folder settings match the vault's folders whatever their capitals ("x/packs" finds "x/Packs")
    const real = new Map();
    for (const f of adapter.files) { let d = f.path; for (let i = d.lastIndexOf("/"); i > 0; i = d.lastIndexOf("/")) { d = d.slice(0, i); if (real.has(d.toLowerCase())) break; real.set(d.toLowerCase(), d); } }
    const canon = v => v ? real.get(String(v).toLowerCase()) || v : v;
    for (const k of ["exclude", "privateFolders", "mapFolders"]) C[k] = (C[k] || []).map(canon);
    C.packs = canon(C.packs); C.archive = canon(C.archive);
  }
  const PACKS = C.packs || "", ARCHIVE = C.archive || "";
  const isPack = p => !!PACKS && (p === PACKS || p.startsWith(PACKS + "/"));
  const skip = [...C.exclude, ARCHIVE].filter(Boolean);

  const all = adapter.files.slice().sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const notes = all.filter(f => f.path.endsWith(".md") && !under(f.path, skip));
  notes.sort((a, b) => isPack(a.path) - isPack(b.path));   // vault notes win name lookups over pack notes with the same name
  const paths = notes.map(f => f.path), pathSet = new Set(paths);
  const byName = new Map(); for (const p of paths) { const k = stem(p).toLowerCase(); if (!byName.has(k)) byName.set(k, p); }

  // read what changed (in batches, so a big vault doesn't stall the app); unchanged notes come from the cache
  const ex = new Map(); const archFiles = ARCHIVE ? all.filter(f => (f.path.endsWith(".md") || f.path.endsWith(".txt")) && under(f.path, [ARCHIVE]) && !base(f.path).startsWith(".")) : [];
  const archSet = new Set(archFiles.map(f => f.path)), cache = adapter.cache || null;
  const extract = (f, t) => archSet.has(f.path) ? extractArchive(t, f.path.endsWith(".md")) : extractNote(t);
  const toRead = []; for (const f of [...notes, ...archFiles]) { const c = cache && cache.get(f.path, f.mtime, f.size); if (c) ex.set(f.path, c); else toRead.push(f); }
  let done = 0, total = toRead.length;
  for (let i = 0; i < toRead.length; i += 200) {
    const batch = toRead.slice(i, i + 200);
    const got = await Promise.all(batch.map(f => f.read().catch(() => null)));
    batch.forEach((f, j) => { if (got[j] == null) return; const e = extract(f, got[j]); ex.set(f.path, e); if (cache) cache.set(f.path, f.mtime, f.size, e); });
    done += batch.length; if (onProgress) onProgress(done, total);
  }
  if (cache && cache.prune) cache.prune(new Set([...notes, ...archFiles].map(f => f.path)));

  const ctime = new Map(notes.map(f => [f.path, f.ctime || 0]));
  const mtime = new Map(notes.map(f => [f.path, f.mtime || 0]));
  const resolve = (target, from) => { const q = adapter.resolve(target.trim(), from); return q && pathSet.has(q) ? q : null; };
  const S = () => new Map(); const add = (m, k, v) => { let s = m.get(k); if (!s) m.set(k, s = new Set()); s.add(v); };
  const get = (m, k) => m.get(k) || new Set();
  const bodyOut = S(), bodyIn = S(), upOut = S(), upIn = S(), collIn = S(), relOut = S(), upkOut = S(), cross = S(), propOut = S(), propIn = S(), collOut = S();
  const info = new Map(); let unresolved = 0;

  for (const p of paths) {
    const e = ex.get(p); if (!e) continue;
    const colls = e.C.map(x => base(x.trim()));
    const title = stem(p);
    for (const l of e.B) {
      const q = resolve(l, p);
      if (q && q !== p) { if (isPack(p) !== isPack(q)) { add(cross, p, q + "\u0000" + 0); continue; } add(bodyOut, p, q); add(bodyIn, q, p); }
      else if (!q) unresolved++;
    }
    for (const key of ["up", "related"]) for (const l of (key === "up" ? e.U : e.R)) {
      const q = resolve(l, p);
      if (q && q !== p) { if (isPack(p) !== isPack(q)) { add(cross, p, q + "\u0000" + (key === "related" ? 4 : 1)); continue; }
        add(upOut, p, q); add(upIn, q, p); add(key === "related" ? relOut : upkOut, p, q); }
    }
    for (const l of e.P) { const q = resolve(l, p); if (q && q !== p) { add(propOut, p, q); add(propIn, q, p); } }   // any property's links (topics, source, people…) make both notes linked
    for (const l of e.C) { const q = resolve(l, p); if (q && q !== p && (!isPack(p) || isPack(q))) { add(collIn, q, p); add(collOut, p, q); } }
    const props = Object.assign({}, e.props); { const nm = {}; for (const k of C.axisProps || []) if (e.num && e.num[k] != null) nm[k] = e.num[k]; if (Object.keys(nm).length) props.n = nm; }
    const lines = { length: e.lines }, linkLines = e.linkLines;
    let rank = e.rank; rank = rank === "" || !isFinite(Number(rank)) ? null : Number(rank);
    const created = createdOf(e, C);
    let date = created;
    if (!date) { const m = /(\d{4}-\d{2}-\d{2})/.exec(title); date = m ? m[1] : ""; }
    if (!date && C.fileDates && ctime.get(p)) date = new Date(ctime.get(p)).toISOString().slice(0, 10);   // no date in the note: when the file was made
    info.set(p, { title, created, date, rank, collections: colls, lines: lines.length, props,
      density: lines.length ? r3(linkLines / lines.length) : 0,
      named_map: under(p, C.mapFolders) || /\bMOC\b/.test(title) || colls.some(x => C.mapCollections.some(m => m.toLowerCase() === x.toLowerCase())) });
  }

  // series with a shared nav block: links between siblings still draw, but don't count toward the score
  const nav = new Set(), NK = (a, b) => a + "\u0000" + b;
  for (const [p, outs] of bodyOut) { const sp = new Set([...outs, p]);
    for (const q of outs) { if (!(p < q) || !get(bodyOut, q).has(p) || dirname(p) !== dirname(q)) continue;
      const sq = new Set([...get(bodyOut, q), q]); let inter = 0; for (const x of sp) if (sq.has(x)) inter++;
      if (inter / (sp.size + sq.size - inter) >= C.navJaccard) { nav.add(NK(p, q)); nav.add(NK(q, p)); } } }
  const effIn = new Map(), effOut = new Map(), series = new Map();
  for (const p of paths) { effIn.set(p, [...get(bodyIn, p)].filter(q => !nav.has(NK(q, p))).length); effOut.set(p, [...get(bodyOut, p)].filter(q => !nav.has(NK(p, q))).length); }
  for (const k of nav) { const a = k.split("\u0000")[0]; series.set(a, (series.get(a) || 0) + 1); }

  // links in any property make a note linked; only up and related lift its score
  const anyLink = p => get(bodyIn, p).size || get(bodyOut, p).size || get(upIn, p).size || get(upOut, p).size || get(propIn, p).size || get(propOut, p).size || get(collIn, p).size || get(collOut, p).size;
  const score = p => { const bi = Math.log1p(effIn.get(p)), bo = Math.log1p(effOut.get(p));
    return W.body_in * bi + W.body_out * bo + W.up_in * Math.log1p(get(upIn, p).size) + W.both * Math.sqrt(bi * bo) + W.coll_in * Math.log1p(get(collIn, p).size); };
  for (const [p, i] of info) i.score = r3(score(p));

  const isMap = p => { const i = info.get(p); return i.named_map || (get(bodyOut, p).size >= C.l3MinOut && i.density >= C.l3Density); };
  const homes = new Set(C.homeNotes.map(h => byName.get(String(h).trim().toLowerCase())).filter(Boolean));
  const vaultCount = [...info.keys()].filter(p => !isPack(p)).length;
  const L5 = C.l5Top > 0 ? C.l5Top : Math.max(3, Math.min(25, Math.round(Math.sqrt(vaultCount) / 4)));
  const ranked = [...info.keys()].sort((a, b) => info.get(b).score - info.get(a).score);
  const top = new Set(ranked.filter(q => !isPack(q)).slice(0, L5));
  for (const [p, i] of info) {
    let ml = 0; for (const q of get(bodyOut, p)) if (info.has(q) && isMap(q)) ml++;
    i.is_map = isMap(p); i.maps_linked = ml;
    const linked = anyLink(p);
    const lvl = homes.has(p) || top.has(p) ? 5 : i.is_map && ml >= C.l4MapLinks ? 4 : i.score >= C.promoteL4 ? 4 : i.is_map || i.score >= C.promoteL3 ? 3 : linked ? 2 : 1;
    i.level = lvl;
    i.why = homes.has(p) ? "home note" : top.has(p) ? "top score" : lvl === 4 ? (i.is_map && ml >= C.l4MapLinks ? "map linking maps" : "highly linked")
      : lvl === 3 ? (i.is_map ? "higher-order note" : "highly linked") : lvl === 2 ? "linked" : "no links";
  }
  const dropped = [...info.keys()].filter(p => under(p, C.privateFolders) && info.get(p).level < 3);
  for (const p of dropped) info.delete(p);

  const keep = [...info.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const idx = new Map(keep.map((p, j) => [p, j])), keepSet = new Set(keep);
  const sorted = s => [...s].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const edges = [];
  for (const p of keep) {
    const bo = get(bodyOut, p), uo = get(upOut, p);
    for (const q of sorted(bo)) if (idx.has(q)) edges.push([idx.get(p), idx.get(q), get(upkOut, p).has(q) ? 1 : get(relOut, p).has(q) ? 4 : nav.has(NK(p, q)) ? 2 : 0]);
    for (const q of sorted(uo)) if (!bo.has(q) && idx.has(q)) edges.push([idx.get(p), idx.get(q), get(upkOut, p).has(q) ? 1 : 4]);
    for (const qk of sorted(get(cross, p))) { const [q, kk] = qk.split("\u0000"); if (idx.has(q)) edges.push([idx.get(p), idx.get(q), +kk]); }
    for (const q of sorted(get(propOut, p))) if (!bo.has(q) && !uo.has(q) && idx.has(q)) edges.push([idx.get(p), idx.get(q), 5]);
  }
  const cnt = s => { let c = 0; for (const x of s) if (keepSet.has(x)) c++; return c; };
  const nodes = keep.map(p => { const i = info.get(p), parts = p.split("/");
    return { id: idx.get(p), path: p, mt: mtime.get(p) || 0, title: i.title, ace: p.includes("/") ? parts[0] : "(root)", sub: parts.length > 2 ? parts.slice(0, 2).join("/") : parts[0],
      created: i.created, date: i.date, rank: i.rank, collections: i.collections, p: i.props,
      body_in: cnt(get(bodyIn, p)), body_out: cnt(get(bodyOut, p)), up_in: cnt(get(upIn, p)), coll_in: cnt(get(collIn, p)),
      series: series.get(p) || 0, density: i.density, is_map: i.is_map, maps_linked: i.maps_linked, score: i.score, level: i.level, why: i.why,
      s: [effIn.get(p), effOut.get(p), get(upIn, p).size, get(collIn, p).size], home: homes.has(p),
      lk: !!anyLink(p) }; });

  // the archive: its own layer, scored on its own links
  if (archFiles.length) {
    const arch = archFiles.map(f => f.path).filter(p => ex.has(p));
    const aName = new Map(); for (const p of arch) { const k = stem(p).toLowerCase(); if (!aName.has(k)) aName.set(k, p); }
    const aSet = new Set(arch);
    const aResolve = target => { let t = base(target.trim()).toLowerCase(); if (t.endsWith(".md")) t = t.slice(0, -3); const v = byName.get(t); return aName.get(t) || (v && idx.has(v) ? v : null); };
    const aDate = (name, fm) => {
      let m = /((?:19|20)\d{2})-(\d{2})-(\d{2})/.exec(name); if (m) return m[0];
      m = /^((?:19|20)\d{2})(\d{2})(\d{2})\d{4}/.exec(name); if (m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) return `${m[1]}-${m[2]}-${m[3]}`;
      const c = fm; if (/^\d{4}-\d{2}-\d{2}$/.test(c) && c < "2021") return c;
      m = /((?:19|20)\d{2})-(\d{2})\b/.exec(name); if (m && +m[2] >= 1 && +m[2] <= 12) return m[0] + "-15";
      m = /^((?:19|20)\d{2})\b/.exec(name); return m ? m[1] + "-07-01" : ""; };
    const aOut = S(), aIn = S(), aInfo = new Map();
    for (const p of arch) { const e = ex.get(p), name = stem(p);
      for (const l of e.B) { const q = aResolve(l); if (q && q !== p) { add(aOut, p, q); if (aSet.has(q)) add(aIn, q, p); } }
      aInfo.set(p, { title: name, date: aDate(name, createdOf(e, C)), w: e.w, kb: e.kb, sf: e.sf, density: e.density, named_map: /\bMOC\b|\bIndex\b/.test(name) }); }
    const aIdx = new Map(); arch.forEach((p, j) => aIdx.set(p, nodes.length + j));
    const aIsMap = p => { const i = aInfo.get(p); return i.named_map || (get(aOut, p).size >= C.l3MinOut && i.density >= C.l3Density); };
    for (const p of arch) { const i = aInfo.get(p), j = aIdx.get(p), bi = Math.log1p(get(aIn, p).size), bo = Math.log1p(get(aOut, p).size);
      const sc = r3(W.body_in * bi + W.body_out * bo + W.both * Math.sqrt(bi * bo)), mp = aIsMap(p);
      let ml = 0; for (const q of get(aOut, p)) if (aInfo.has(q) && aIsMap(q)) ml++;
      const lvl = (mp && ml >= C.l4MapLinks) || sc >= C.promoteL4 ? 4 : mp || sc >= C.promoteL3 ? 3 : get(aIn, p).size || get(aOut, p).size ? 2 : 1;
      const why = lvl === 4 ? (mp && ml >= C.l4MapLinks ? "map linking maps" : "highly linked") : lvl === 3 ? (mp ? "higher-order note" : "highly linked") : lvl === 2 ? "linked" : "no links";
      nodes.push({ id: j, path: p, title: i.title, ace: ARCHIVE.split("/")[0], sub: ARCHIVE, created: "", date: i.date, rank: null, collections: [], p: { w: i.w, kb: i.kb, sf: i.sf },
        body_in: get(aIn, p).size, body_out: get(aOut, p).size, up_in: 0, coll_in: 0, series: 0, density: i.density, is_map: mp, maps_linked: ml,
        score: sc, level: lvl, why, archive: true, s: [get(aIn, p).size, get(aOut, p).size, 0, 0], home: false, lk: !!(get(aIn, p).size || get(aOut, p).size) });
      for (const q of sorted(get(aOut, p))) { const k = aIdx.has(q) ? aIdx.get(q) : idx.get(q); if (k != null) edges.push([j, k, 3]); } }
  }

  return { generated: new Date().toISOString().slice(0, 19), vault: adapter.vaultName || "Vault",
    settings: { axis_props: C.axisProps || [], date_props: C.dateProps || ["created"], exclude: C.exclude, moc_only: C.privateFolders, home_notes: C.homeNotes, l5_top: L5, l4_map_links: C.l4MapLinks, l3_min_out: C.l3MinOut,
      l3_density: C.l3Density, promote_l4: C.promoteL4, promote_l3: C.promoteL3, nav_jaccard: C.navJaccard, weights: W, map_folders: C.mapFolders,
      map_collections: C.mapCollections, packs: PACKS, archive: ARCHIVE },
    nodes, edges, unresolved, dropped: dropped.length };
}
