/* Maps of the Ideaverse: read Obsidian bases (.base files) and work out which notes each view holds, so the map can filter by them.
   Obsidian doesn't let a plugin run a base's query without opening it, so this reads the base's filters and applies them itself.
   It covers the filter language most bases use (file.*, properties, link(), list and text methods, if(), formulas, this.file);
   anything it can't read marks that view as unreadable rather than guessing. */

import { TFile, parseYaml, getAllTags } from "obsidian";

class Unsupported extends Error { constructor(what){ super(what); this.what = what; } }
class NeedThis extends Error { constructor(){ super("this"); } }

// ---------- parsing ----------
const OPS = ["==", "!=", "<=", ">=", "&&", "||", "<", ">", "+", "-", "*", "/", "%", "!", "(", ")", "[", "]", ",", ".", "?", ":"];
function tokenize(src){
  const t = []; let i = 0;
  while (i < src.length) { const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") { let j = i + 1, s = ""; while (j < src.length && src[j] !== c) { if (src[j] === "\\" && j + 1 < src.length) { s += src[j + 1]; j += 2; } else s += src[j++]; } if (j >= src.length) throw new Unsupported("an unclosed quote"); t.push({ k: "str", v: s }); i = j + 1; continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; t.push({ k: "num", v: parseFloat(src.slice(i, j)) }); i = j; continue; }
    const op = OPS.find(o => src.startsWith(o, i)); if (op) { t.push({ k: "op", v: op }); i += op.length; continue; }
    // a name: letters, digits, _, and anything else that isn't an operator or a space (formula names can be emoji)
    let j = i; while (j < src.length && !/\s/.test(src[j]) && !OPS.some(o => src.startsWith(o, j)) && src[j] !== '"' && src[j] !== "'") j++;
    if (j === i) throw new Unsupported(`"${c}"`); t.push({ k: "id", v: src.slice(i, j) }); i = j; }
  return t; }
function parse(src){
  const t = tokenize(String(src)); let p = 0;
  const peek = v => t[p] && t[p].k === "op" && t[p].v === v, eat = v => { if (!peek(v)) throw new Unsupported(`expected "${v}"`); p++; };
  const bin = (next, ops) => () => { let l = next(); while (t[p] && t[p].k === "op" && ops.includes(t[p].v)) { const o = t[p++].v; l = { k: "bin", o, l, r: next() }; } return l; };
  const primary = () => { const x = t[p++]; if (!x) throw new Unsupported("an empty filter");
    if (x.k === "num" || x.k === "str") return { k: "lit", v: x.v };
    if (x.k === "id") { if (x.v === "true" || x.v === "false") return { k: "lit", v: x.v === "true" }; if (x.v === "null") return { k: "lit", v: null };
      if (peek("(")) { p++; const a = args(")"); return { k: "call", f: x.v, a }; } return { k: "id", v: x.v }; }
    if (x.v === "(") { const e = expr(); eat(")"); return e; }
    if (x.v === "[") { const a = args("]"); return { k: "arr", a }; }
    if (x.v === "!") return { k: "not", e: unary() };
    if (x.v === "-") return { k: "neg", e: unary() };
    throw new Unsupported(`"${x.v}"`); };
  const args = close => { const a = []; if (peek(close)) { p++; return a; } for (;;) { a.push(expr()); if (peek(",")) { p++; continue; } eat(close); return a; } };
  const postfix = () => { let e = primary();
    for (;;) { if (peek(".")) { p++; const nm = t[p++]; if (!nm || nm.k !== "id") throw new Unsupported("a name after ."); if (peek("(")) { p++; e = { k: "meth", o: e, m: nm.v, a: args(")") }; } else e = { k: "get", o: e, n: nm.v }; continue; }
      if (peek("[")) { p++; const ix = expr(); eat("]"); e = { k: "idx", o: e, i: ix }; continue; }
      return e; } };
  const unary = () => peek("!") ? (p++, { k: "not", e: unary() }) : peek("-") ? (p++, { k: "neg", e: unary() }) : postfix();
  const mul = bin(unary, ["*", "/", "%"]), add = bin(mul, ["+", "-"]), cmp = bin(add, ["<", ">", "<=", ">="]), eq = bin(cmp, ["==", "!="]), and = bin(eq, ["&&"]), or = bin(and, ["||"]);
  const tern = () => { const c = or(); if (peek("?")) { p++; const a = expr(); eat(":"); return { k: "if", c, a, b: expr() }; } return c; };
  const expr = tern;
  const e = expr(); if (p < t.length) throw new Unsupported(`"${t[p].v}"`); return e; }

// ---------- values ----------
const isF = v => v && v.kind === "file", isL = v => v && v.kind === "link", isD = v => v && v.kind === "date", isThis = v => v && v.kind === "this";
const truthy = v => Array.isArray(v) ? v.length > 0 : isD(v) ? true : !!v;
const DUR = { y: 31557600e3, year: 31557600e3, years: 31557600e3, M: 2629800e3, month: 2629800e3, months: 2629800e3, w: 6048e5, week: 6048e5, weeks: 6048e5, d: 864e5, day: 864e5, days: 864e5, h: 36e5, hour: 36e5, hours: 36e5, m: 6e4, minute: 6e4, minutes: 6e4, s: 1e3, second: 1e3, seconds: 1e3 };
function durMs(s){ const m = /^\s*(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*$/.exec(String(s)); if (!m || !(m[2] in DUR)) return null; return +m[1] * DUR[m[2]]; }
function toDate(v){ if (isD(v)) return v; if (v == null || v === "") return null; if (typeof v === "number") return { kind: "date", d: new Date(v) }; const s = String(v).trim(); const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00" : s); return isNaN(d) ? null : { kind: "date", d }; }
const pad = n => String(n).padStart(2, "0");
function fmtDate(d, f){ return String(f).replace(/YYYY|MM|DD|HH|mm|ss|M|D/g, t => ({ YYYY: d.getFullYear(), MM: pad(d.getMonth() + 1), DD: pad(d.getDate()), HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()), M: d.getMonth() + 1, D: d.getDate() })[t]); }

/** A query engine over the vault: one per scan of the bases (it caches note facts as it goes). */
export class BaseQ {
  constructor(app){ this.app = app; this.mc = app.metadataCache; this.cache = new Map(); this.back = null; }
  backlinks(){ if (!this.back) { const b = new Map(), rl = this.mc.resolvedLinks || {}; for (const src in rl) for (const dst in rl[src]) { if (!b.has(dst)) b.set(dst, []); b.get(dst).push(src); } this.back = b; } return this.back; }
  fileV(f){ return f ? { kind: "file", path: f.path, f } : null; }
  linkV(text, from){ const t = String(text).replace(/^\[\[|\]\]$/g, "").split("|")[0].split("#")[0].trim(); const f = this.mc.getFirstLinkpathDest(t, from || ""); return { kind: "link", path: f ? f.path : null, text: t }; }
  // a property value as the base sees it: "[[Note]]" is a link, lists element by element
  prop(v, from){ if (Array.isArray(v)) return v.map(x => this.prop(x, from)); if (typeof v === "string") { const m = /^\s*\[\[([^\]]+)\]\]\s*$/.exec(v); if (m) return this.linkV(m[1], from); } return v === undefined ? null : v; }
  fm(path){ const f = this.app.vault.getAbstractFileByPath(path), c = f && this.mc.getFileCache(f); return (c && c.frontmatter) || {}; }
  same(a, b){ // equality the way a base means it: files and links by the note they point to
    if (isThis(a)) a = a.file; if (isThis(b)) b = b.file;
    if ((isF(a) || isL(a)) && (isF(b) || isL(b))) return a.path && b.path ? a.path === b.path : String(a.text || a.path).toLowerCase() === String(b.text || b.path).toLowerCase();
    if ((isF(a) || isL(a)) && typeof b === "string") return this.nameIs(a, b); if ((isF(b) || isL(b)) && typeof a === "string") return this.nameIs(b, a);
    if (isD(a) && isD(b)) return a.d.getTime() === b.d.getTime();
    if (a == null || b == null) return (a == null || a === "") && (b == null || b === "");
    if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
    return a === b || String(a) === String(b); }
  nameIs(fl, s){ s = String(s).replace(/^\[\[|\]\]$/g, "").toLowerCase(); const p = String(fl.path || fl.text || "").toLowerCase(), base = p.split("/").pop(); return p === s || base === s || base.replace(/\.md$/, "") === s.replace(/\.md$/, "") || String(fl.text || "").toLowerCase() === s; }
  // ---------- evaluation ----------
  ev(e, cx){
    switch (e.k) {
      case "lit": return e.v;
      case "arr": return e.a.map(x => this.ev(x, cx));
      case "not": return !truthy(this.ev(e.e, cx));
      case "neg": return -Number(this.ev(e.e, cx));
      case "if": return truthy(this.ev(e.c, cx)) ? this.ev(e.a, cx) : this.ev(e.b, cx);
      case "id": return this.name(e.v, cx);
      case "get": return this.get(this.ev(e.o, cx), e.n, cx, e.o);
      case "idx": { const o = this.ev(e.o, cx), i = this.ev(e.i, cx); if (Array.isArray(o) || typeof o === "string") { const n = Number(i); return o[n < 0 ? o.length + n : n] ?? null; } if (e.o.k === "id" && (e.o.v === "formula" || e.o.v === "note")) return this.name(e.o.v === "formula" ? "formula." + i : String(i), cx); if (o && typeof o === "object") return this.get(o, String(i), cx); return null; }
      case "call": return this.call(e.f, e.a, cx);
      case "meth": return this.meth(e, cx);
      case "bin": { const o = e.o;
        if (o === "&&") return truthy(this.ev(e.l, cx)) && truthy(this.ev(e.r, cx));
        if (o === "||") return truthy(this.ev(e.l, cx)) || truthy(this.ev(e.r, cx));
        const l = this.ev(e.l, cx), r = this.ev(e.r, cx);
        if (o === "==") return this.same(l, r); if (o === "!=") return !this.same(l, r);
        if (isD(l) || isD(r)) { const ld = toDate(l), rd = isD(r) || typeof r !== "string" || durMs(r) == null ? toDate(r) : null;
          if (ld && (o === "+" || o === "-") && typeof r === "string" && durMs(r) != null) return { kind: "date", d: new Date(ld.d.getTime() + (o === "+" ? 1 : -1) * durMs(r)) };
          if (ld && rd) { const a = ld.d.getTime(), b = rd.d.getTime(); if (o === "-") return a - b; if (o === "<") return a < b; if (o === ">") return a > b; if (o === "<=") return a <= b; if (o === ">=") return a >= b; }
          if (o === "<" || o === ">" || o === "<=" || o === ">=") return false; }
        if (o === "+") return (typeof l === "string" || typeof r === "string") ? String(l ?? "") + String(r ?? "") : Number(l) + Number(r);
        const a = Number(l), b = Number(r);
        if (o === "-") return a - b; if (o === "*") return a * b; if (o === "/") return a / b; if (o === "%") return a % b;
        if (l == null || r == null || l === "" || r === "") return false;
        const sa = typeof l === "string" && typeof r === "string";
        if (o === "<") return sa ? l < r : a < b; if (o === ">") return sa ? l > r : a > b; if (o === "<=") return sa ? l <= r : a <= b; if (o === ">=") return sa ? l >= r : a >= b; }
    }
    throw new Unsupported(e.k); }
  name(v, cx){
    if (v === "file") return cx.file; if (v === "note") return { kind: "note", path: cx.file.path }; if (v === "formula") return { kind: "formula" };
    if (v === "this") { if (!cx.thisF) throw new NeedThis(); return { kind: "this", file: cx.thisF }; }
    if (v === "value") return cx.value; if (v === "index") return cx.index;
    if (v.startsWith("formula.")) return this.formula(v.slice(8), cx);
    return this.prop(this.fm(cx.file.path)[v], cx.file.path); }
  formula(nm, cx){ const src = cx.formulas && cx.formulas[nm]; if (src == null) throw new Unsupported(`the formula "${nm}"`); cx.fstack = cx.fstack || []; if (cx.fstack.includes(nm)) throw new Unsupported(`a formula that uses itself ("${nm}")`);
    const key = "f:" + nm; if (cx.memo && key in cx.memo) return cx.memo[key];
    cx.fstack.push(nm); try { const v = this.ev(cx.fparsed[nm] || (cx.fparsed[nm] = parse(src)), { ...cx, value: undefined }); if (cx.memo) cx.memo[key] = v; return v; } finally { cx.fstack.pop(); } }
  get(o, n, cx){
    if (o && o.kind === "formula") return this.formula(n, cx);
    if (o && o.kind === "note") return this.prop(this.fm(o.path)[n], o.path);
    if (isThis(o)) { if (n === "file") return o.file; return this.prop(this.fm(o.file.path)[n], o.file.path); }
    if (isL(o)) { if (!o.path) return null; o = this.fileV(this.app.vault.getAbstractFileByPath(o.path)); if (!o) return null; }
    if (isF(o)) { const f = o.f, c = this.mc.getFileCache(f) || {};
      switch (n) {
        case "name": return f.name; case "basename": return f.basename; case "path": return f.path; case "ext": return f.extension;
        case "folder": return f.parent && f.parent.path !== "/" ? f.parent.path : ""; case "size": return f.stat.size;
        case "ctime": return { kind: "date", d: new Date(f.stat.ctime) }; case "mtime": return { kind: "date", d: new Date(f.stat.mtime) };
        case "tags": return (getAllTags(c) || []).filter((t, i, a) => a.indexOf(t) === i);
        case "links": return [...(c.links || []), ...(c.frontmatterLinks || [])].map(l => this.linkV(l.link, f.path));   // every link as written (repeats too), body and properties
        case "backlinks": return (this.backlinks().get(f.path) || []).map(p => ({ kind: "link", path: p, text: p.split("/").pop().replace(/\.md$/, "") }));
        case "embeds": return (c.embeds || []).map(x => this.linkV(x.link, f.path));
        case "properties": return c.frontmatter || {};
        case "file": return o; }
      return this.prop(this.fm(f.path)[n], f.path); }
    if (isD(o)) { const d = o.d; switch (n) { case "year": return d.getFullYear(); case "month": return d.getMonth() + 1; case "day": return d.getDate(); case "hour": return d.getHours(); case "minute": return d.getMinutes(); case "second": return d.getSeconds(); case "time": return d.getTime(); } }
    if (Array.isArray(o) || typeof o === "string") { if (n === "length") return o.length; }
    // a date property reads as a date (created.year)
    if ((typeof o === "string" || typeof o === "number") && ["year", "month", "day", "hour", "minute", "second", "time"].includes(n)) { const d = toDate(o); return d ? this.get(d, n, cx) : null; }
    if (o && typeof o === "object" && !o.kind) return this.prop(o[n]);
    if (o == null) return null;
    throw new Unsupported(`".${n}"`); }
  call(f, a, cx){ const v = () => a.map(x => this.ev(x, cx));
    switch (f) {
      case "link": { const [p] = v(); if (isF(p)) return { kind: "link", path: p.path, text: p.f.basename }; return this.linkV(p, cx.file.path); }
      case "file": { const [p] = v(); if (isF(p)) return p; if (isL(p)) return p.path ? this.fileV(this.app.vault.getAbstractFileByPath(p.path)) : null; const l = this.linkV(p, cx.file.path); return l.path ? this.fileV(this.app.vault.getAbstractFileByPath(l.path)) : null; }
      case "list": { const [x] = v(); return Array.isArray(x) ? x : x == null ? [] : [x]; }
      case "date": { const [x] = v(); return toDate(x); }
      case "now": return { kind: "date", d: new Date() };
      case "today": { const d = new Date(); d.setHours(0, 0, 0, 0); return { kind: "date", d }; }
      case "if": { const c = this.ev(a[0], cx); return truthy(c) ? (a[1] ? this.ev(a[1], cx) : null) : (a[2] ? this.ev(a[2], cx) : null); }
      case "number": { const [x] = v(); return isD(x) ? x.d.getTime() : Number(x); }
      case "min": return Math.min(...v().map(Number)); case "max": return Math.max(...v().map(Number));
      case "duration": { const [x] = v(); return durMs(x); }
    }
    throw new Unsupported(`${f}()`); }
  meth(e, cx){
    let o = this.ev(e.o, cx); const m = e.m, A = () => e.a.map(x => this.ev(x, cx));
    if (isThis(o)) o = o.file;
    if (m === "isTruthy") return truthy(o);
    if (m === "isType") { const [t] = A(); const ty = o == null ? "null" : Array.isArray(o) ? "list" : isD(o) ? "date" : isF(o) ? "file" : isL(o) ? "link" : typeof o; return ty === String(t).toLowerCase(); }
    // methods that take an expression run once per item, with value (and index) set
    if ((m === "filter" || m === "map") && Array.isArray(o)) { const out = []; o.forEach((value, index) => { const r = this.ev(e.a[0], { ...cx, value, index, memo: null }); if (m === "map") out.push(r); else if (truthy(r)) out.push(value); }); return out; }
    if (isF(o) || isL(o)) { const fo = isL(o) ? (o.path ? this.fileV(this.app.vault.getAbstractFileByPath(o.path)) : null) : o;
      switch (m) {
        case "inFolder": { const [d] = A(); if (!fo) return false; const dir = String(d).replace(/\/+$/, ""); return fo.path.startsWith(dir + "/"); }
        case "hasTag": { if (!fo) return false; const tags = this.get(fo, "tags", cx).map(t => t.replace(/^#/, "").toLowerCase()); return A().some(x => { const w = String(x).replace(/^#/, "").toLowerCase(); return tags.some(t => t === w || t.startsWith(w + "/")); }); }
        case "hasLink": { const [x] = A(); if (!fo) return false; const target = isThis(x) ? x.file : x; const ls = (this.mc.resolvedLinks || {})[fo.path] || {}; if (isF(target) || isL(target)) return !!target.path && target.path in ls; const l = this.linkV(x, fo.path); return !!l.path && l.path in ls; }
        case "hasProperty": { const [x] = A(); return !!fo && Object.prototype.hasOwnProperty.call(this.fm(fo.path), String(x)); }
        case "asLink": return fo ? { kind: "link", path: fo.path, text: fo.f.basename } : o;
        case "asFile": return fo;
        case "isEmpty": return false;
        case "linksTo": { const [x] = A(); const ls = fo ? (this.mc.resolvedLinks || {})[fo.path] || {} : {}; return !!x && !!x.path && x.path in ls; }
      }
      // a link used like text (contains, startsWith…) reads as its name
      o = isL(o) ? o.text : fo ? fo.f.basename : ""; }
    if (isD(o)) { switch (m) { case "format": { const [f] = A(); return fmtDate(o.d, f || "YYYY-MM-DD"); } case "date": { const d = new Date(o.d); d.setHours(0, 0, 0, 0); return { kind: "date", d }; } case "isEmpty": return false; case "relative": return ""; } }
    if (Array.isArray(o)) { const a = A();
      // a list of tags matches nested tags too: tags.contains("idea") finds #idea/spark
      const tagList = (e.o.k === "id" && /^tags?$/i.test(e.o.v)) || (e.o.k === "get" && e.o.n === "tags"), sm = tagList ? (x, y) => { const t = String(x).replace(/^#/, "").toLowerCase(), w = String(y).replace(/^#/, "").toLowerCase(); return t === w || t.startsWith(w + "/"); } : (x, y) => this.same(x, y);
      switch (m) {
        case "contains": return o.some(x => sm(x, a[0]));
        case "containsAny": { const xs = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; return xs.some(y => o.some(x => sm(x, y))); }
        case "containsAll": { const xs = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; return xs.every(y => o.some(x => sm(x, y))); }
        case "isEmpty": return o.length === 0;
        case "unique": { const out = []; for (const x of o) if (!out.some(y => this.same(x, y))) out.push(x); return out; }
        case "join": return o.map(x => isL(x) ? x.text : isF(x) ? x.f.basename : String(x)).join(a[0] ?? ", ");
        case "flat": return o.flat(); case "reverse": return [...o].reverse(); case "sort": return [...o].sort();
        case "slice": return o.slice(a[0], a[1]); case "length": return o.length;
        case "toString": return o.join(", ");
      } }
    if (o == null) { if (m === "isEmpty") return true; if (["contains", "containsAny", "containsAll", "startsWith", "endsWith"].includes(m)) return false; if (m === "toString") return ""; return null; }
    if (typeof o === "number") { switch (m) { case "round": return Math.round(o); case "floor": return Math.floor(o); case "ceil": return Math.ceil(o); case "abs": return Math.abs(o); case "toFixed": return o.toFixed(A()[0] || 0); case "isEmpty": return false; case "toString": return String(o); } }
    if (typeof o === "boolean") { if (m === "isEmpty") return false; if (m === "toString") return String(o); }
    if (typeof o === "string") { const a = A().map(x => isL(x) ? x.text : isF(x) ? x.f.basename : x), s = o;
      switch (m) {
        case "contains": return s.includes(String(a[0])); case "containsAny": return a.flat().some(x => s.includes(String(x))); case "containsAll": return a.flat().every(x => s.includes(String(x)));
        case "startsWith": return s.startsWith(String(a[0])); case "endsWith": return s.endsWith(String(a[0]));
        case "lower": return s.toLowerCase(); case "upper": return s.toUpperCase(); case "trim": return s.trim(); case "title": return s.replace(/\b\w/g, c => c.toUpperCase());
        case "isEmpty": return s.length === 0; case "split": return s.split(String(a[0] ?? ",")); case "replace": return s.split(String(a[0])).join(String(a[1] ?? ""));
        case "slice": return s.slice(a[0], a[1]); case "toString": return s; case "length": return s.length;
      } }
    if (o && typeof o === "object" && m === "isEmpty") return Object.keys(o).length === 0;
    throw new Unsupported(`.${m}()`); }
  // ---------- bases ----------
  /** Every base in the vault, A–Z, each with its views and whether the map can read them. */
  listBases(){
    const out = [];
    for (const f of this.app.vault.getFiles()) { if (f.extension !== "base") continue;
      out.push({ path: f.path, name: f.basename, views: [] }); }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return out; }
  async readBase(path){
    const f = this.app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return null;
    const key = path + "@" + f.stat.mtime; if (this.cache.has(key)) return this.cache.get(key);
    let y = null; try { y = parseYaml(await this.app.vault.cachedRead(f)) || {}; } catch (e) { y = { err: "its YAML" }; }
    const r = { path, name: f.basename, yaml: y, views: [] };
    if (!y.err) { const fparsed = {}, formulas = y.formulas || {};
      let baseF = null, baseErr = null, baseThis = false; try { baseF = this.compile(y.filters); baseThis = usesThis(y.filters); } catch (e) { baseErr = e.what || e.message; }
      for (const [i, v] of (y.views || []).entries()) { let vf = null, err = baseErr; try { if (!err) vf = this.compile(v.filters); } catch (e) { err = e.what || e.message; }
        const fu = Object.entries(formulas).filter(([k]) => mentions(y.filters, k) || mentions(v.filters, k));
        const ctx = baseThis || usesThis(v.filters) || fu.some(([, s]) => /\bthis\b/.test(String(s)));
        r.views.push({ i, name: v.name || `View ${i + 1}`, type: v.type || "table", err, ctx, run: err ? null : { baseF, vf, formulas, fparsed } }); } }
    else r.err = y.err;
    this.cache.set(key, r); return r; }
  compile(fl){ // a filters block: a string, or { and | or | not: [...] }
    if (fl == null) return null;
    if (typeof fl === "string" || typeof fl === "number" || typeof fl === "boolean") return { k: "e", e: parse(String(fl)) };
    if (Array.isArray(fl)) return { k: "and", a: fl.map(x => this.compile(x)) };
    for (const op of ["and", "or", "not"]) if (Array.isArray(fl[op])) return { k: op, a: fl[op].map(x => this.compile(x)) };
    throw new Unsupported("a filter group"); }
  test(c, cx){ if (!c) return true;
    if (c.k === "e") return truthy(this.ev(c.e, cx));
    if (c.k === "and") return c.a.every(x => this.test(x, cx));
    if (c.k === "or") return c.a.length === 0 || c.a.some(x => this.test(x, cx));
    if (c.k === "not") return !c.a.some(x => this.test(x, cx));
    return true; }
  /** The notes a view holds, as a Set of paths (only notes, .md). thisPath: the note "this" means, for bases that follow the note they sit in. */
  run(view, thisPath){
    const { baseF, vf, formulas, fparsed } = view.run, thisF = thisPath ? this.fileV(this.app.vault.getAbstractFileByPath(thisPath)) : null, out = new Set();
    for (const f of this.app.vault.getMarkdownFiles()) { const cx = { file: this.fileV(f), thisF, formulas, fparsed, memo: {} };
      if (this.test(baseF, cx) && this.test(vf, cx)) out.add(f.path); }
    return out; }
}
const usesThis = fl => /\bthis\b/.test(JSON.stringify(fl || ""));
const mentions = (fl, k) => JSON.stringify(fl || "").includes("formula." + k) || JSON.stringify(fl || "").includes(`formula[\\"${k}\\"]`) || JSON.stringify(fl || "").includes(`formula['${k}']`);
export { Unsupported, NeedThis, parse };
