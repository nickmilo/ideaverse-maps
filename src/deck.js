/* The Deck (0.9.1, Nick, Nov 5): a writing-first view with no graph. The primary note in the middle, the biggest rectangle; its Recents and Links
   in a straight column right beside it; two support notes on the right (the one you click grows); the note that was primary before, small, top left
   (click to swap back); a pinned sidekick note below it (a MOC, usually). Each support and the sidekick has a links drawer that slides out over its
   right side. The Mini Deck is the primary note alone with its drawer, made to pop out into its own window for meetings.
   Each Deck tab keeps its own notes in its own saved state, so a Mini and the full Deck (and the main map) never fight over settings. */
import { ItemView, MarkdownRenderer, Menu, Notice, Platform, TFile, normalizePath, setIcon } from "obsidian";
import { FolderPicker, NotePicker } from "./view.js";
import { BaseQ } from "./baseq.js";
import { LEAD_EMO, LINKHELP, LVGRAD, spotInfo, spotRender, spotSub } from "./spot.js";
import { dateKeys, parseDay } from "./scan.js";

export const DECK_TYPE = "ideaverse-deck";

const KIND_COL = { upp: "var(--ivd-upp)", rel: "var(--ivd-rel)", up: "var(--ivd-up)", down: "var(--ivd-down)", prop: "var(--ivd-prop)" };

export class DeckView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin;
    this.st = { mini: false, primary: null, prev: null, sup: [null, null], focus: 0, side: null, drawers: {}, drawerMain: true, drawerDock: true, hist: {}, leftW: 340, hudW: 230, rightW: 380 };
    this.eds = {}; }
  getViewType() { return DECK_TYPE; }
  getDisplayText() { return "Mini Deck"; }
  getIcon() { return this.st.mini ? "panel-right" : "layout-dashboard"; }
  getState() { return Object.assign({}, super.getState(), JSON.parse(JSON.stringify(this.st))); }
  async setState(state, result) { if (state && typeof state === "object") for (const k of Object.keys(this.st)) if (k in state) this.st[k] = state[k]; this.st.mini = true;   /* every Deck is a Mini now (0.9.45) */
    await super.setState(state, result); this.render(); }
  save() { this.app.workspace.requestSaveLayout(); }

  async onOpen() {
    this.contentEl.empty(); this.contentEl.addClass("ivd");
    if (!this.st.primary) { const f = this.app.workspace.getActiveFile(); if (f && f.extension === "md") this.st.primary = f.path; }
    this.registerEvent(this.app.vault.on("modify", () => this.soon()));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.soon()));
    this.registerEvent(this.app.vault.on("rename", (f, old) => { let ch = false; const fix = p => { if (p === old) { ch = true; return f.path; } return p; };
      this.st.primary = fix(this.st.primary); this.st.prev = fix(this.st.prev); this.st.side = fix(this.st.side); this.st.sup = this.st.sup.map(fix); if (ch) { this.save(); this.render(); } }));
    this.registerDomEvent(this.contentEl, "pointerdown", e => this.armLinks(e), true);
    /* ⌘ held over a Recents or Links row (or an orb): its preview, which you can drag onto a slot (0.9.5, Nick) */
    const D = this.contentEl.ownerDocument;
    this.registerDomEvent(D, "keydown", e => { if ((e.key === "Meta" || e.key === "Control") && this.hovPath) this.showPv(this.hovPath, this.hovEl); });
    this.registerDomEvent(D, "keyup", e => { if (e.key === "Meta" || e.key === "Control") this.hidePv(); });
    this.render(); }
  async onClose() { for (const k of Object.keys(this.eds)) this.eds[k].close(); this.eds = {}; }
  onResize() { for (const k of Object.keys(this.eds)) this.eds[k].resize(); }
  soon() { window.clearTimeout(this.t_); this.t_ = window.setTimeout(() => this.renderHud(), 400); }

  /* a link clicked inside a Deck editor stays in the Deck: plain = primary, ⌘ = a support slot (the map's own editors do the same) */
  armLinks(e) { const p = this.plugin; this.ensureLinkPatch();
    const ed = e.target && e.target.closest && e.target.closest(".ivd-ed"); if (!ed) return;
    p.cardDown = { t: performance.now(), el: ed, cb: (path, how) => { if (how === "plain") this.openPrimary(path); else this.openSupport(path); return true; } }; }
  ensureLinkPatch() { const p = this.plugin; if (p.linkPatched) return; p.linkPatched = true; const W0 = this.app.workspace, orig = W0.openLinkText, app = this.app;
    W0.openLinkText = function (linktext, sourcePath, newLeaf, ...rest) { const cd = p.cardDown;
      if (cd && performance.now() - cd.t < 1500 && cd.el.isConnected) { p.cardDown = null;
        const f = app.metadataCache.getFirstLinkpathDest(String(linktext).split("#")[0].split("|")[0], sourcePath || "");
        if (f instanceof TFile && cd.cb(f.path, newLeaf === "split" ? "side" : newLeaf ? "tab" : "plain")) return Promise.resolve(); }
      return orig.call(this, linktext, sourcePath, newLeaf, ...rest); };
    p.register(() => { W0.openLinkText = orig; }); }

  /* a real Obsidian editor in a split of our own, outside the saved layout (the map's technique) */
  editor(slot, host) { let o = this.eds[slot]; if (!o) { const W = this.app.workspace, Split = W.rootSplit.constructor, split = new Split(W, "vertical");
      split.getRoot = () => W.rootSplit; split.getContainer = () => W.rootSplit; let leaf = null, cur = null;
      let aeInfo = null;   /* editor hotkeys reach the editor you're in (0.9.50): Obsidian's active editor, as Canvas sets it */
      split.containerEl.addEventListener("focusin", () => { if (Platform.isMobile) return; window.setTimeout(() => { const v = leaf && leaf.view; if (!v || !v.editor || !split.containerEl.contains(document.activeElement)) return;
        aeInfo = new Proxy(v, { getPrototypeOf: () => Object.prototype, get: (t, k) => { const x = Reflect.get(t, k, t); return typeof x === "function" ? x.bind(t) : x; } });   /* the note's own view (Find, ⌘F, needs its methods), dressed so the setter takes it: it refuses a MarkdownView */ W.activeEditor = aeInfo; }, 0); });
      split.containerEl.addEventListener("focusout", e => { if (e.relatedTarget instanceof Node && split.containerEl.contains(e.relatedTarget)) return; window.setTimeout(() => { if (aeInfo && W._activeEditor === aeInfo && !split.containerEl.contains(document.activeElement)) W.activeEditor = null; aeInfo = null; }, 0); });
      o = this.eds[slot] = { el: split.containerEl, get leaf() { return leaf; },
        open: async path => { const f = this.app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return false; if (cur === path && leaf) return true;
          if (!leaf) { leaf = W.createLeafInParent(split, 0); leaf.ivmCard = true; leaf.ivmOwner = this.leaf; } cur = path;
          await leaf.openFile(f, { state: { mode: "source", source: false }, active: false }); return true; },
        resize: () => { if (leaf && leaf.view && typeof leaf.view.onResize === "function") leaf.view.onResize(); },
        close: () => { if (leaf) { leaf.detach(); leaf = null; } cur = null; split.containerEl.remove(); } }; }
    o.el.addClass("ivd-ed", "mod-visible"); for (const t_ of Array.from(o.el.querySelectorAll(".workspace-tabs"))) t_.addClass("mod-visible");   /* a phone hides any pane without mod-visible (0.9.46) */
    if (o.el.parentElement !== host) host.appendChild(o.el); return o; }
  dropEditor(slot) { const o = this.eds[slot]; if (o) { o.close(); delete this.eds[slot]; } }

  file(p) { const f = p && this.app.vault.getAbstractFileByPath(p); return f instanceof TFile ? f : null; }
  title(p) { const f = this.file(p); return f ? f.basename : ""; }

  openPrimary(path) { if (!path || path === this.st.primary) return; if (Platform.isPhone) this.st.drawerMain = false;   /* on a phone, picking a note closes the drawer so you're reading (0.9.46) */
    this.setSlot("p", path); this.save(); this.render(); }
  /* each support slot and the sidekick keep their own back and forward (0.9.2, Nick) */
  getSlot(key) { const S = this.st; return key === "side" ? S.side : key === "p" ? S.primary : S.sup[+key.slice(1)]; }
  setSlot(key, path, viaHist) { const S = this.st, cur = this.getSlot(key); if (cur === path) return; if (key === "p" && cur) S.prev = cur;
    const h = (S.hist[key] ||= { back: [], fwd: [] }); if (!viaHist) { if (cur) h.back.push(cur); if (h.back.length > 50) h.back.shift(); h.fwd = []; }
    if (key === "side") S.side = path; else if (key === "p") S.primary = path; else S.sup[+key.slice(1)] = path; }
  go(key, dir) { const S = this.st, h = S.hist[key]; if (!h) return; const from = dir < 0 ? h.back : h.fwd, to = dir < 0 ? h.fwd : h.back; const p = from.pop(); if (!p) return;
    const cur = this.getSlot(key); if (cur) to.push(cur); this.setSlot(key, p, true); if (key[0] === "s" && key !== "side") S.focus = +key.slice(1); this.save(); this.render(); }
  navBtns(key) { const h = this.st.hist[key] || { back: [], fwd: [] }; return [["arrow-left", "Back", () => this.go(key, -1), !h.back.length], ["arrow-right", "Forward", () => this.go(key, 1), !h.fwd.length]]; }
  openSupport(path, slot) { if (!path) return; const s = this.st.sup; let i = slot != null ? slot : s.indexOf(null); if (i < 0) i = this.st.focus === 0 ? 1 : 0;   /* the empty slot, else the one you're not in */
    this.setSlot("s" + i, path); this.st.focus = i; this.save(); this.render(); }

  /* what a note links to and what links to it, with the map's colors when the map is open */
  /* the map's own scan (shared with the map, read from its cache), for link colors and levels even when no map is open (0.9.3) */
  ensureGraph() { if (this.G || this.gLoading) return; this.gLoading = true;
    void this.plugin.getGraph().then(g => { const idx = new Map(), ek = new Map(); for (const nd of g.nodes) idx.set(nd.path, nd); const byId = new Map(g.nodes.map(nd => [nd.id, nd]));
      for (const [a, b, k] of g.edges) { const A = byId.get(a), B = byId.get(b); if (!A || !B) continue; const key = A.path + "\u0000" + B.path, o_ = ek.get(key); if (o_ == null || (k === 1 || k === 4 || k === 5) && !(o_ === 1 || o_ === 4)) ek.set(key, k); }   /* the map's EKIND rule: up, related or a property wins over a body link (0.9.65) */
      const rk = new Map(); [...g.nodes].filter(nd => !nd.archived).sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((nd, q) => rk.set(nd.path, q + 1)); this.G = { g, idx, ek, rk, w: (() => { const W = (g.settings && g.settings.weights) || {}, sv = this.plugin.store.get("iv-score"); const w0 = { in: W.body_in ?? 1, out: W.body_out ?? .6, up: W.up_in ?? .3, both: W.both ?? .8, coll: W.coll_in ?? 0 }; return sv && sv.w ? Object.assign(w0, sv.w) : w0; })() };   /* the weights the map scores with, your Scoring changes included */ this.gLoading = false; this.render(); }).catch(() => { this.gLoading = false; }); }
  /* a link's kind as the map's linkKind sees it (0.9.65): up, related or a property only as the note itself wrote it; anything else above or below by level, then score */
  kindOf(from, to) { const G = this.G; if (!G) return ""; const k = G.ek.get(from + "\u0000" + to);
    if (k === 1) return "upp"; if (k === 4) return "rel"; if (k === 5 || k === 3) return "prop";
    const A = G.idx.get(from), B = G.idx.get(to); if (!A || !B) return ""; if (B.level !== A.level) return B.level > A.level ? "up" : "down"; return (B.score || 0) >= (A.score || 0) ? "up" : "down"; }
  nbrs(path) { const rl = this.app.metadataCache.resolvedLinks || {}, s_ = new Set(Object.keys(rl[path] || {})); for (const [k, m] of Object.entries(rl)) if (m && m[path]) s_.add(k); s_.delete(path); return s_; }
  linksOf(path) { const app = this.app, mc = app.metadataCache, out = new Map(), inn = new Set(), rl = mc.resolvedLinks || {}; this.ensureGraph();
    for (const t of Object.keys(rl[path] || {})) if (t !== path && t.endsWith(".md")) out.set(t, true);
    for (const [s_, m] of Object.entries(rl)) if (s_ !== path && m && m[path]) inn.add(s_);
    const rows = [], mine = this.nbrs(path);
    for (const p of new Set([...out.keys(), ...inn])) { const o = out.has(p), i = inn.has(p), k = this.kindOf(path, p, o, i);
      /* relevance: how much the two notes share (common neighbours), plus a little for linking both ways and for up or related */
      const th = this.nbrs(p); let c = 0; for (const x of th) if (mine.has(x)) c++; const r = c / Math.sqrt((mine.size + 1) * (th.size + 1)) + (o && i ? .15 : 0) + (k === "upp" || k === "rel" ? .2 : 0);
      rows.push({ p, a: o && i ? "↔" : o ? "→" : "←", c: this.opt("col") ? KIND_COL[k] || "var(--ivd-link)" : "var(--ivd-link)", r }); }
    const mx = Math.max(1e-6, ...rows.map(x => x.r)); for (const x of rows) x.s = Math.max(1, Math.round(100 * x.r / mx));
    rows.sort((a, b) => b.s - a.s || this.title(a.p).localeCompare(this.title(b.p))); return rows; }
  /* the Deck's own Display switches, shared by every Deck (0.9.3, Nick): relevance scores, modified times, link colors */
  opt(k) { const v = this.plugin.store.get("iv-deck-" + k); return v == null ? true : v === true; }
  optD(k, d) { const v = this.plugin.store.get("iv-deck-" + k); return v == null ? d : v === true; }
  /* the strip under a note's header, as in the map's editors: level · in · out · rank (0.9.3, Nick) */
  /* the note strip, the map's strip pill for pill (0.9.7; 0.9.10 from the kit's spec, Nick: "refer to documentation to get this right"):
     L# · up · related │ in · out │ #rank · folder. Up and related always show (dimmed when empty); every pill opens its list in place, each row with its level
     (click = primary, ⌘ = a support slot); up and related end in a + that links a note straight into the property; the rank opens the four numbers,
     why the level, the score table and Emergence → above / below; the folder shows its full path on hover and, clicked, moves the note */
  strip(host, path, slot) { this.ensureGraph(); const G = this.G, nd = G && G.idx.get(path), rl = this.app.metadataCache.resolvedLinks || {}, st = this.plugin.settings;
    const names = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean), UP = names(st.upProps || "up"), RE = names(st.relatedProps || "related");
    const f = this.file(path), fm = (f && this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}, low = a => a.map(x => x.toLowerCase());
    const fmL = keys => { const out = [], K = low(keys); for (const [k, v] of Object.entries(fm)) if (K.includes(k.toLowerCase())) for (const x of Array.isArray(v) ? v : [v]) { const m = /\[\[([^\]|#]+)/.exec(String(x || "")); const t = m && this.app.metadataCache.getFirstLinkpathDest(m[1], path); if (t) out.push(t.path); } return [...new Set(out)]; };
    const lvOf = p => { const n_ = G && G.idx.get(p); return n_ ? n_.level : 0; }, scOf = p => { const n_ = G && G.idx.get(p); return n_ ? n_.score || 0 : 0; };
    const byLv = a => a.sort((x, y) => lvOf(y) - lvOf(x) || scOf(y) - scOf(x));   /* highest level first, as in the map */
    const outL = Object.keys(rl[path] || {}).filter(t => t !== path && t.endsWith(".md")), inL = Object.entries(rl).filter(([k, m]) => k !== path && m && m[path]).map(([k]) => k);
    const L = { up: fmL(UP), related: fmL(RE), out: outL, in: inL }, nb = [...new Set([...outL, ...inL])], me = nd ? nd.level : 0, ms = nd ? nd.score || 0 : 0;
    L.above = nb.filter(p => lvOf(p) > me || (lvOf(p) === me && scOf(p) > ms)); L.below = nb.filter(p => !L.above.includes(p));
    const key = "strip:" + (slot || path), S_ = (this.stripOpen ||= {}), so = S_[key] || {}, open = so.o || "", sub = so.s || "";
    const set_ = (o, s_) => { S_[key] = { o, s: s_ }; this.render(); };
    /* the map's own classes and CSS (cardstrip, carddrop…), so the two strips look and read the same */
    const b = host.createDiv({ cls: "cardstrip" }), dr = host.createDiv({ cls: "carddrop" });
    const LC = { 5: "var(--ivd-upp)", 4: "var(--ivd-rel)", 3: "var(--ivd-up)", 2: "var(--ivd-down)", 1: "var(--text-muted)" };
    if (nd) { const lv = b.createSpan({ cls: "slv", text: "L" + nd.level }); lv.style.setProperty("--slc", LC[nd.level] || "var(--text-muted)"); }
    const chip = (k, label, cls) => { const c = b.createEl("button", { cls: "schip " + cls + (open === k ? " on" : ""), text: label, attr: { type: "button", "aria-expanded": String(open === k) } });
      c.onclick = e => { e.stopPropagation(); set_(open === k ? "" : k, ""); }; };
    const bar = () => b.createSpan({ cls: "sbar" });
    chip("up", L.up.length ? `${L.up.length} up` : "up", "spill sup" + (L.up.length ? "" : " sz")); chip("related", L.related.length ? `${L.related.length} related` : "related", "spill srel" + (L.related.length ? "" : " sz"));
    bar(); chip("in", `${L.in.length} in`, "spill"); chip("out", `${L.out.length} out`, "spill"); bar();
    const rk = G && G.rk.get(path); if (nd) chip("score", rk ? `#${rk.toLocaleString()}` : (nd.score || 0).toFixed(1), "spill sscore");
    { const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "", fo = b.createSpan({ cls: "sfold is-click", text: dir ? dir.split("/").pop() : "Vault root" }); const ic = createSpan({ cls: "sfold-i" }); setIcon(ic, "folder"); fo.prepend(ic);
      let tp = null; fo.addEventListener("pointerenter", () => { if (tp) tp.remove(); const r = fo.getBoundingClientRect(), cr = host.getBoundingClientRect(); tp = host.createDiv({ cls: "sfold-tip", text: dir || "The top of the vault" }); tp.style.setProperty("--tx", Math.round(r.left - cr.left) + "px"); tp.style.setProperty("--ty", Math.round(r.bottom - cr.top + 5) + "px"); });
      fo.addEventListener("pointerleave", () => { if (tp) { tp.remove(); tp = null; } });
      fo.onclick = e => { e.stopPropagation(); if (tp) { tp.remove(); tp = null; } void this.moveNote(path); }; }
    const rowL = (box, p) => { const r = box.createEl("button", { cls: "sdr", attr: { type: "button", draggable: "true" } }); r.createSpan({ text: this.title(p) }); r.createSpan({ cls: "sdm", text: lvOf(p) ? "L" + lvOf(p) : "" });
      r.onclick = e => { e.stopPropagation(); if (e.metaKey || e.ctrlKey) this.openSupport(p); else this.openPrimary(p); };
      r.addEventListener("dragstart", e => { e.dataTransfer.setData("text/ivd-path", p); this.contentEl.addClass("ivd-dragging"); }); r.addEventListener("dragend", () => this.contentEl.removeClass("ivd-dragging"));
      r.addEventListener("mouseenter", e => { this.hovPath = p; this.hovEl = r; if (e.metaKey || e.ctrlKey) this.showPv(p, r); }); r.addEventListener("mouseleave", () => { if (this.hovEl === r) { this.hovPath = null; this.hovEl = null; } }); return r; };
    if (open === "score" && nd) { const f2 = x => (Math.round(x * 100) / 100).toFixed(2), LN = x => Math.log1p(x), w = (G.w || {});
      dr.createDiv({ cls: "sdh", text: `#${(rk || 0).toLocaleString()} IN ${nd.archive ? "THE ARCHIVE" : "THE IDEAVERSE"} · SCORE ${f2(nd.score || 0)}` });
      const det = dr.createDiv({ cls: "sddet" }), g = det.createDiv({ cls: "sdnums" }); for (const [v, t_] of [[nd.body_in || 0, "linked from"], [nd.body_out || 0, "links to"], [nd.up_in || 0, "link up to it"], [(nd.score || 0).toFixed(1), "link score"]]) { const c_ = g.createDiv(); c_.createEl("b", { text: String(v) }); c_.createSpan({ text: t_ }); }
      det.createDiv({ cls: "sdwhy", text: `Level ${nd.level}: ${this.levelWhy(path, nd)}` });
      if (nd.s) { const [a, b_, u, c] = nd.s, rows = [["Links in", a, w.in, (w.in || 0) * LN(a)], ["Links out", b_, w.out, (w.out || 0) * LN(b_)], ["Links both in and out", a && b_ ? `${a} in · ${b_} out` : "—", w.both, (w.both || 0) * Math.sqrt(LN(a) * LN(b_))]];
        if (!nd.archive) rows.push(["Notes that link up to this note", u, w.up, (w.up || 0) * LN(u)], ["Notes in its collection", c, w.coll, (w.coll || 0) * LN(c)]);
        const t = det.createDiv({ cls: "sdtab" }); for (const h of ["", "count", "weight", "adds"]) t.createSpan({ cls: "sdth", text: h });
        for (const [l, ct, wt, ad] of rows) { const z = !ad ? " z" : ""; t.createSpan({ cls: "sdtl" + z, text: l }); t.createSpan({ cls: "sdtn" + z, text: String(ct) }); t.createSpan({ cls: "sdtn" + z, text: "×" + (+(wt || 0)).toFixed(2) }); t.createSpan({ cls: "sdtn" + z, text: f2(ad) }); }
        t.createSpan({ cls: "sdtl sdtt", text: "Score" }); t.createSpan(); t.createSpan(); t.createSpan({ cls: "sdtn sdtt", text: f2(nd.score || 0) }); }
      if (L.above.length || L.below.length) { const em = dr.createDiv({ cls: "sdem" }); em.createSpan({ cls: "sdh", text: "EMERGENCE" });
        for (const [k, lab] of [["above", "above"], ["below", "below"]]) { if (!L[k].length) continue; const c = em.createEl("button", { cls: "schip " + (k === "above" ? "sab" : "sbe") + (sub === k ? " on" : ""), text: `${L[k].length} ${lab}`, attr: { type: "button" } }); c.onclick = e => { e.stopPropagation(); set_("score", sub === k ? "" : k); }; }
        if (sub && L[sub].length) { const ls = dr.createDiv({ cls: "sdl sdsub " + (sub === "above" ? "sd-up" : "sd-down") }); for (const p of byLv(L[sub])) rowL(ls, p); } }
      return; }
    const list = open && L[open] ? L[open] : null, prop_ = open === "up" || open === "related";
    if (!list || (!list.length && !prop_)) { dr.hidden = true; return; }
    dr.createDiv({ cls: "sdh" + (open === "up" ? " sdh-up" : open === "related" ? " sdh-rel" : ""), text: list.length ? `${open.toUpperCase()} · ${list.length}` : open.toUpperCase() });
    const ls = dr.createDiv({ cls: "sdl" }); for (const p of byLv(list)) rowL(ls, p);
    if (prop_) { const ad = dr.createEl("button", { cls: "sdadd", attr: { type: "button", "aria-description": open === "up" ? "Link up to another note" : "Add a related note" } }); setIcon(ad, "plus");
      ad.onclick = async e => { e.stopPropagation(); const have = new Set(list), items = []; for (const [p, n_] of (G ? G.idx : new Map())) if (p !== path && !have.has(p) && !n_.archive) items.push({ path: p, title: n_.title || this.title(p), s: n_.score || 0 });
        items.sort((a, c) => c.s - a.s); const t = this.title(path), p_ = await new Promise(res => new NotePicker(this.app, items, res, open === "up" ? `${t}: link up to…` : `${t}: related to…`).open()); if (!p_) return;
        const r = await this.addProp(path, p_, open === "up" ? UP[0] || "up" : RE[0] || "related"), t_ = this.title(p_);
        new Notice(r === "dup" ? `${t} already has ${t_} in ${open}.` : r ? `${t} → ${open}: ${t_}` : "Couldn't add the link."); window.setTimeout(() => this.render(), 300); }; } }
  levelWhy(path, nd) { for (const l of this.app.workspace.getLeavesOfType("ideaverse-maps")) { const m = l.view && l.view.map; if (m && m.levelRule) { const r = m.levelRule(path); if (r) return r; } }
    /* no map open: the same sentences, from the scan's settings (cut-offs without the map's balancing) */
    const g = this.plugin.graph || {}, ss = g.settings || {}, sc = nd.score || 0, f2 = x => (Math.round(x * 100) / 100).toFixed(2), l4 = +ss.promote_l4 || 6.5, l3 = +ss.promote_l3 || 5.5, top = +ss.l5_top || 25, ml = +ss.l4_map_links || 3;
    let r = nd.level === 5 ? (nd.home ? "It's one of your home notes." : `It's among the top ${top} by score.`)
      : nd.level === 4 ? (nd.is_map && nd.maps_linked >= ml ? `It's a map that links to ${nd.maps_linked} other maps (${ml}+ makes Level 4).` : `Its score ${f2(sc)} is at least the Level 4 cut-off (${l4.toFixed(1)}).`)
      : nd.level === 3 ? (nd.is_map ? "It's a map. Every map is at least Level 3, whatever its score." : `Its score ${f2(sc)} is at least the Level 3 cut-off (${l3.toFixed(1)}).`)
      : nd.level === 2 ? `It has links, but it isn't a map and its score ${f2(sc)} is under the Level 3 cut-off (${l3.toFixed(1)}).` : "No links in or out yet.";
    const rk = this.G && this.G.rk.get(path); if (rk) r += ` (#${rk.toLocaleString()} in ${nd.archive ? "the archive" : "the ideaverse"})`; return r; }
  async addProp(path, linkPath, key) { const t = this.file(path), l = this.file(linkPath); if (!t || !l) return false; const link = `[[${this.app.metadataCache.fileToLinktext(l, t.path, true)}]]`, base = s_ => String(s_).replace(/^\[\[|\]\]$/g, "").split("|")[0].trim(); let dup = false;
    await this.app.fileManager.processFrontMatter(t, fm => { const k = Object.keys(fm).find(x => x.toLowerCase() === key.toLowerCase()) || key, cur = fm[k] == null || fm[k] === "" ? [] : Array.isArray(fm[k]) ? fm[k] : [fm[k]];
      if (cur.some(x => base(x) === base(link))) { dup = true; return; } fm[k] = [...cur, link]; }); return dup ? "dup" : true; }
  async moveNote(path) { const f = this.file(path); if (!f) return false; const dir = await new Promise(res => new FolderPicker(this.app, res, `Move "${f.basename}" to…`, true).open()); if (!dir) return false;
    const d = dir === "/" ? "" : normalizePath(dir); if (d && !this.app.vault.getAbstractFileByPath(d)) await this.app.vault.createFolder(d);
    const to = normalizePath(d ? `${d}/${f.name}` : f.name); if (to === f.path) return false; if (this.app.vault.getAbstractFileByPath(to)) { new Notice(`There's already a ${f.name} in ${d || "the vault root"}.`); return false; }
    await this.app.fileManager.renameFile(f, to); return true; }
  optN() { const v = +this.plugin.store.get("iv-deck-recn"); return v >= 5 && v <= 50 ? v : 30; }
  setOpt(k, v) { this.plugin.store.set("iv-deck-" + k, v); for (const l of this.app.workspace.getLeavesOfType(DECK_TYPE)) if (l.view instanceof DeckView) l.view.render(); }
  recents(n) { return this.app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, n); }
  age(ms) { const s = (Date.now() - ms) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m" : s < 86400 ? Math.round(s / 3600) + "h" : s < 365 * 86400 ? Math.round(s / 86400) + "d" : Math.floor(s / 31557600) + "y"; }   /* years past a year (0.9.66), so a 2019 note reads 7y, not 2500d */

  /* one row: click = primary; ⌘ click = a support slot; drag it onto a slot */
  showPv(path, anchor) { if (!path || !anchor || !anchor.isConnected) return; if (this.pvEl && this.pvEl.dataset.path === path) return; this.hidePv(true);
    const root = this.contentEl, pv = root.createDiv({ cls: "ivd-pvcard", attr: { draggable: "true" } }); pv.dataset.path = path; this.pvEl = pv;
    pv.createDiv({ cls: "ivd-pvt", text: this.title(path) }); const body = pv.createDiv({ cls: "ivd-pvb markdown-rendered" }); pv.createDiv({ cls: "ivd-pvh", text: "drag to a slot · click to open" });
    const f = this.file(path); if (f) void this.app.vault.cachedRead(f).then(t => { if (pv.isConnected) void MarkdownRenderer.render(this.app, t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").slice(0, 700), body, path, this); });
    const r = anchor.getBoundingClientRect(), m = root.getBoundingClientRect(), w = 300; let x = r.left - m.left - w - 10; if (x < 8) x = r.right - m.left + 10; let y = r.top - m.top - 20; y = Math.max(8, Math.min(y, m.height - 260));
    pv.style.left = x + "px"; pv.style.top = y + "px";
    pv.addEventListener("dragstart", e => { e.dataTransfer.setData("text/ivd-path", path); e.dataTransfer.effectAllowed = "copy"; root.addClass("ivd-dragging"); this.pvDrag = true; });
    pv.addEventListener("dragend", () => { root.removeClass("ivd-dragging"); this.pvDrag = false; this.hidePv(true); });
    pv.addEventListener("mouseleave", () => { if (!this.pvDrag) this.hidePv(); });
    pv.onclick = e => { if (e.metaKey || e.ctrlKey) this.openSupport(path); else this.openPrimary(path); this.hidePv(true); }; }
  hidePv(force) { const pv = this.pvEl; if (!pv) return; if (!force && (this.pvDrag || pv.matches(":hover"))) return; pv.remove(); this.pvEl = null; }
  row(box, path, a, col, right) { const r = box.createEl("button", { cls: "ivd-row", attr: { type: "button", draggable: "true" } });
    if (a) r.createSpan({ cls: "ivd-a", text: a }); const t = r.createSpan({ cls: "ivd-t", text: this.title(path) }); t.style.setProperty("--c", col || "var(--ivd-link)");
    if (right) r.createSpan({ cls: "ivd-n", text: right });
    r.onclick = e => { e.preventDefault(); if (e.metaKey || e.ctrlKey) this.openSupport(path); else this.openPrimary(path); };
    r.addEventListener("mouseenter", e => { this.hovPath = path; this.hovEl = r; if (e.metaKey || e.ctrlKey) this.showPv(path, r); });
    r.addEventListener("mouseleave", () => { if (this.hovEl === r) { this.hovPath = null; this.hovEl = null; } window.setTimeout(() => { if (this.pvEl && this.pvEl.dataset.path === path) this.hidePv(); }, 120); });   /* only this row's card: moving on with ⌘ held keeps the next one (0.9.111, Nick) */
    r.addEventListener("dragstart", e => { e.dataTransfer.setData("text/ivd-path", path); e.dataTransfer.effectAllowed = "copy"; this.contentEl.addClass("ivd-dragging"); });
    r.addEventListener("dragend", () => this.contentEl.removeClass("ivd-dragging")); return r; }
  hud(box, path, mini, linksOnly) { box.empty(); const rh = linksOnly ? null : box.createDiv({ cls: "ivd-h", text: "◷ RECENTS" });
    /* Recents scroll in their own box, as many as Show says (0.9.3, Nick: "I should be able to scroll through the recents") */
    const rb = linksOnly ? null : box.createDiv({ cls: "ivd-recs" }); if (rb) rb.style.setProperty("--ivd-rn", String(Math.min(this.optN(), this.recRows(mini))));
    if (!linksOnly) for (const f of this.recents(this.optN())) this.row(rb, f.path, "", f.path === path ? "var(--ivd-acc)" : "var(--ivd-recent)", this.opt("age") ? this.age(f.stat.mtime) : "");
    const ls = path ? this.linksOf(path) : []; box.createDiv({ cls: "ivd-h" + (linksOnly ? "" : " ivd-h2"), text: `⇄ LINKS · ${ls.length}` });
    /* a grip under Recents: drag it down to see more rows, up for fewer (0.9.6, Nick) */
    if (rb) { const g = box.createDiv({ cls: "ivd-vgrip", attr: { "aria-description": "Drag to show more or fewer recents" } }); rb.after(g);
      g.addEventListener("pointerdown", e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const y0 = e.clientY, n0 = this.recRows(mini);
        const mv = ev => { const n = Math.max(3, Math.min(40, n0 + Math.round((ev.clientY - y0) / 22))); rb.style.setProperty("--ivd-rn", String(n)); g.dataset.n = String(n); };
        const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); if (g.dataset.n) this.plugin.store.set("iv-deck-recrows" + (mini ? "m" : ""), +g.dataset.n); };
        g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); }); }
    for (const l of ls) this.row(box, l.p, l.a, l.c, this.opt("rel") ? String(l.s) : ""); void rh; }
  recRows(mini) { const v = +this.plugin.store.get("iv-deck-recrows" + (mini ? "m" : "")); return v >= 3 && v <= 40 ? v : mini ? 8 : 10; }
  renderHud() { if (this.hudEl) this.hud(this.hudEl, this.st.primary, this.st.mini); for (const [k, el] of Object.entries(this.drawerEls || {})) if (el && !el.hidden && !el.classList.contains("ivd-main-drawer")) this.hud(el, el.dataset.path, true, true); }

  /* a note card: header (label, title, buttons), the editor, and its links drawer */
  card(parent, cls, label, path, slot, opts = {}) { const c = parent.createDiv({ cls: "ivd-card " + cls }); const hd = c.createDiv({ cls: "ivd-hd" });
    for (const [ic, tip, fn, off] of opts.nav || []) { const b = hd.createEl("button", { cls: "ivd-ib ivd-nav", attr: { type: "button", "aria-description": tip } }); setIcon(b, ic); b.disabled = !!off; b.onclick = e => { e.stopPropagation(); fn(); }; }
    hd.createSpan({ cls: "ivd-lab", text: label }); if (path) hd.createSpan({ cls: "ivd-ttl", text: this.title(path) });   /* the note's name stays in view once you scroll past its title (0.9.12, Nick) */   /* an editor shows its own title; only Previous (no editor) names its note up here (0.9.2, Nick) */ hd.createSpan({ cls: "ivd-sp" });
    for (const [ic, tip, fn] of opts.btns || []) { const b = hd.createEl("button", { cls: "ivd-ib", attr: { type: "button", "aria-description": tip } }); setIcon(b, ic); b.onclick = e => { e.stopPropagation(); fn(b); }; }
    if (path && opts.strip) this.strip(c, path, slot);
    const body = c.createDiv({ cls: "ivd-body" });
    if (!path) { const e_ = body.createDiv({ cls: "ivd-empty" }); e_.createDiv({ text: opts.empty || "Drop a note here" }); e_.createDiv({ cls: "ivd-sub", text: "drag a Recents or Links row · or ⌘-click one" }); }
    else if (opts.readOnly) { const pv = body.createDiv({ cls: "ivd-pv markdown-rendered" }); void this.app.vault.cachedRead(this.file(path)).then(t => { void MarkdownRenderer.render(this.app, t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").slice(0, 40000), pv, path, this); }); }
    else { const ed = this.editor(slot, body); void ed.open(path); }
    if (opts.drop) { c.addEventListener("dragover", e => { if (e.dataTransfer.types.includes("text/ivd-path")) { e.preventDefault(); c.addClass("ivd-over"); } });
      c.addEventListener("dragleave", () => c.removeClass("ivd-over")); c.addEventListener("drop", e => { const p = e.dataTransfer.getData("text/ivd-path"); c.removeClass("ivd-over"); if (p) { e.preventDefault(); opts.drop(p); } }); }
    if (opts.drawer && path) { const dr = c.createDiv({ cls: "ivd-drawer" }); dr.dataset.path = path; dr.hidden = !this.st.drawers[slot]; if (!dr.hidden) this.hud(dr, path, true, true); (this.drawerEls ||= {})[slot] = dr; }
    return c; }
  drawerBtn(slot) { return ["panel-right", "Links drawer", b => { this.st.drawers[slot] = !this.st.drawers[slot]; this.save(); const dr = this.drawerEls && this.drawerEls[slot]; if (dr) { dr.hidden = !this.st.drawers[slot]; if (!dr.hidden) this.hud(dr, dr.dataset.path, true, true); } b.toggleClass("on", !!this.st.drawers[slot]); }]; }

  render() { const root = this.contentEl; if (!root.isConnected) return; this.drawerEls = {};
    for (const el of Array.from(root.querySelectorAll(".ivd-ed"))) el.detach();   /* editors are kept and moved, not rebuilt */
    root.empty(); root.toggleClass("ivd-mini", !!this.st.mini); const S = this.st, P = S.primary;
    /* a strip at the top: the Deck's settings (⚙), top left where a map's menu sits (0.9.3, Nick) */
    { const top = root.createDiv({ cls: "ivd-top" }), cog = top.createEl("button", { cls: "ivd-ib ivd-cog", attr: { type: "button", "aria-description": "Deck settings" } }); setIcon(cog, "settings");
      top.createSpan({ cls: "ivd-lab", text: "MINI DECK" });
      const pop = top.createDiv({ cls: "ivd-pop" }); pop.hidden = true;
      for (const [k, t] of [["rel", "Show relevance scores"], ["age", "Show time since modified"], ["col", "Color links by Idea Emergence"], ["strip-p", "Note strip on the primary note"], ["strip-s", "Note strip on the support notes"], ["strip-side", "Note strip on the sidekick"]]) {
        if (S.mini && k.startsWith("strip-") && k !== "strip-p") continue;
        const l = pop.createEl("label", { cls: "ivd-sw" }), cb = l.createEl("input", { type: "checkbox" }); cb.checked = this.optD(k, k !== "strip-side"); l.createEl("i"); l.createSpan({ text: t }); cb.onchange = () => this.setOpt(k, cb.checked); }
      { const l = pop.createDiv({ cls: "ivd-sw ivd-rng" }); l.createSpan({ text: "Recents" }); const r = l.createEl("input", { type: "range" }); r.min = "5"; r.max = "50"; r.step = "1"; r.value = String(this.optN()); const v = l.createEl("b", { text: String(this.optN()) });
        r.oninput = () => v.setText(r.value); r.onchange = () => this.setOpt("recn", +r.value); }
      if (S.mini) { const l = pop.createEl("label", { cls: "ivd-sw" }), cb = l.createEl("input", { type: "checkbox" }); cb.checked = S.drawerDock !== false; l.createEl("i"); l.createSpan({ text: "Drawer beside the note, not over it" });
        cb.onchange = () => { S.drawerDock = cb.checked; this.save(); this.render(); }; }   /* 0.9.14, Nick: the drawer can stay open to the right without covering the text */
      cog.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; cog.toggleClass("on", !pop.hidden); };
      this.registerDomEvent(root.ownerDocument, "pointerdown", e => { if (!pop.hidden && !top.contains(e.target)) { pop.hidden = true; cog.removeClass("on"); } }); }
    const want = new Set(); const keep = s => want.add(s);
    /* the full Deck is gone (0.9.45, Nick: "Holodeck is just a superior mode"); the Mini Deck stays */
    { const pc = this.card(root, "ivd-primary", "", P, "p", { strip: this.optD("strip-p", true), nav: this.navBtns("p"), btns: [["panel-right", "Recents and links", b => { S.drawerMain = !S.drawerMain; this.save(); this.render(); void b; }]], empty: "Open a note (from any tab) and run “Deck: show the active note”" });
      keep("p"); pc.toggleClass("ivd-docked", !!(S.drawerMain && S.drawerDock && !Platform.isPhone)); pc.toggleClass("ivd-phone", Platform.isPhone); if (S.drawerMain) { const dr = pc.createDiv({ cls: "ivd-drawer ivd-main-drawer" }); pc.style.setProperty("--ivd-mdw", Platform.isPhone ? "86%" : Math.max(140, Math.min(460, +S.drawerW || 220)) + "px"); dr.style.setProperty("--ivd-mdw", Platform.isPhone ? "86%" : Math.max(140, Math.min(460, +S.drawerW || 220)) + "px");
        /* its left edge can be dragged wider or narrower (0.9.7, Nick); only a CSS width changes while dragging, so nothing re-renders */
        const g = dr.createDiv({ cls: "ivd-grip ivd-grip-l" }); g.addEventListener("pointerdown", e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const x0 = e.clientX, w0 = dr.getBoundingClientRect().width;
          const mv = ev => { S.drawerW = Math.round(Math.max(140, Math.min(460, w0 - (ev.clientX - x0)))); dr.style.setProperty("--ivd-mdw", S.drawerW + "px"); pc.style.setProperty("--ivd-mdw", S.drawerW + "px"); };
          const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); this.save(); this.onResize(); }; g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); });
        const hin = dr.createDiv({ cls: "ivd-hudin" }); this.hudEl = hin; this.hud(hin, P, true); } else this.hudEl = null;
      for (const k of Object.keys(this.eds)) if (!want.has(k)) this.dropEditor(k); }
    window.setTimeout(() => this.onResize(), 50); }
}

/* The Links pane (0.9.59, Nick: "replace the default Obsidian … pane that normally goes on the bottom right … use that instead"): the map's Links HUD
   for the note you're reading anywhere in Obsidian, straight, in a tab or the sidebar. It sorts links the HUD's way: up and related first, then by relevance,
   with ← → ↔ and level colors; then this note's own properties, one group each (collections in coral); then other notes' properties pointing back */
export const LINKS_TYPE = "ideaverse-links";
const LINKSORTS = [["remg", "Relative Emergence"], ["lvl", "Idea Emergence"], ["rel", "Relevance"], null, ["az", "File name (A to Z)"], ["za", "File name (Z to A)"], null, ["mnew", "Modified time (new to old)"], ["mold", "Modified time (old to new)"], null, ["cnew", "Created time (new to old)"], ["cold", "Created time (old to new)"]];
export class LinksPaneView extends DeckView {
  constructor(leaf, plugin) { super(leaf, plugin); this.cur = null; this.q = ""; }
  getViewType() { return LINKS_TYPE; }
  getDisplayText() { return this.cur && this.file(this.cur) ? "Links for " + this.title(this.cur) : "Links"; }   /* as Obsidian names its Backlinks tab; the pane itself no longer repeats the note (0.9.62, Nick) */
  getIcon() { return "waypoints"; }
  getState() { return {}; }
  async setState(state, result) { await ItemView.prototype.setState.call(this, state, result); this.render(); }
  async onOpen() { this.contentEl.empty(); this.contentEl.addClass("ivd", "ivd-links");
    const follow = () => { const f = this.app.workspace.getActiveFile(); if (f && f.extension === "md" && f.path !== this.cur) { this.cur = f.path; this.render(); } };
    this.registerEvent(this.app.workspace.on("file-open", follow)); this.registerEvent(this.app.workspace.on("active-leaf-change", follow));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.soon()));
    this.registerEvent(this.app.vault.on("rename", (f, old) => { if (this.cur === old) { this.cur = f.path; this.render(); } }));
    const D = this.contentEl.ownerDocument;
    this.registerDomEvent(D, "keydown", e => { if ((e.key === "Meta" || e.key === "Control") && this.hovPath) this.showPv(this.hovPath, this.hovEl); });
    this.registerDomEvent(D, "keyup", e => { if (e.key === "Meta" || e.key === "Control") this.hidePv(); });
    follow(); this.render(); }
  /* when a note was made (0.9.69, Nick: "Always, always, always go by the created property"): the map's own date for it (Settings → created properties, then a date in
     its name, then the file), else the note's created property read the same way, else the file's creation time */
  createdMs(p) { const n_ = this.G && this.G.idx.get(p); if (n_ && /^\d{4}-\d{2}-\d{2}$/.test(n_.date || "")) return Date.parse(n_.date);
    const f = this.file(p); if (!f) return 0; const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}, low = {}; for (const [k, v] of Object.entries(fm)) low[k.toLowerCase()] = v;
    for (const k of dateKeys(this.plugin.settings || {})) { const d = parseDay(low[String(k).toLowerCase()]); if (d) return Date.parse(d); }
    const m = /(\d{4}-\d{2}-\d{2})/.exec(f.basename); return m ? Date.parse(m[1]) : f.stat.ctime; }
  /* the Sort and Display menus open below their button, right edges together, so the button stays clear: a second click on it closes the menu (0.9.91, Nick) */
  menuUnder(m, btn) { if (typeof m.setUseNativeMenu === "function") m.setUseNativeMenu(false); if (m.dom) m.dom.addClass("ivd-menu");   /* Obsidian's own menu for both (macOS native menus drop the samples), with the check on the left as macOS shows it (0.9.92, Nick) */ const r = btn.getBoundingClientRect(); m.onHide(() => { this.menuShut = { btn, t: Date.now() }; btn.removeClass("is-active"); }); btn.addClass("is-active"); m.showAtPosition({ x: r.right, y: r.bottom + 4, left: true }, btn.ownerDocument); }
  menuJust(btn) { const z = this.menuShut; return !!(z && z.btn === btn && Date.now() - z.t < 350); }
  /* a group header: its name in mono caps, the count lighter a small step after it, no dot (0.9.101, Nick picked "Quiet number") */
  ghead(list, cls, lab, n) { this.underHead = true; const h = list.createDiv({ cls }); h.createSpan({ text: lab }); h.createSpan({ cls: "ivd-gn", text: String(n) }); return h; }
  /* the mini preview, at the spot (0.9.106, Nick: Obsidian's backlink snippets "don't render"): hold ⌘ over a row and the card opens beside the pane, never off screen.
     For a note that links here, it shows the passage in that note where the link sits, rendered, with the link lit; for a note this one links to, its opening, as before */
  showPv(path, anchor) { if (!path || !anchor || !anchor.isConnected) return; if (this.pvEl && this.pvEl.dataset.path === path) return; this.hidePv(true);
    const D = anchor.ownerDocument, pv = D.body.createDiv({ cls: "ivd-pvcard ivd-pvfloat", attr: { draggable: "true" } }); pv.dataset.path = path; this.pvEl = pv;
    const cur = this.cur, info = spotInfo(this.app, path, cur);
    pv.createDiv({ cls: "ivd-pvt", text: this.title(path) }); spotSub(pv.createDiv({ cls: "ivd-pvsub" }), info);   /* the shared spot preview (src/spot.js, 0.9.114) */
    const body = pv.createDiv({ cls: "ivd-pvb markdown-rendered" }); void spotRender(this.app, path, cur, info, body, this);
    const r = anchor.getBoundingClientRect(), pr = this.contentEl.getBoundingClientRect(), vw = D.documentElement.clientWidth, vh = D.documentElement.clientHeight, w = 320, h = 260;
    let x = pr.left - w - 10; if (x < 8) x = Math.min(vw - w - 8, pr.right + 10); const y = Math.max(8, Math.min(r.top - 20, vh - h - 8));
    pv.setCssProps({ "--pvx": Math.round(x) + "px", "--pvy": Math.round(y) + "px" });
    pv.addEventListener("dragstart", e => { e.dataTransfer.setData("text/ivd-path", path); e.dataTransfer.effectAllowed = "copy"; this.pvDrag = true; });
    pv.addEventListener("dragend", () => { this.pvDrag = false; this.hidePv(true); });
    pv.addEventListener("mouseleave", () => { if (!this.pvDrag) this.hidePv(); });
    pv.onclick = e => { if (e.metaKey || e.ctrlKey) this.openSupport(path); else this.openPrimary(path); this.hidePv(true); }; }
  onClose() { this.hidePv(true); return super.onClose ? super.onClose() : Promise.resolve(); }
  soon() { window.clearTimeout(this.soonT); this.soonT = window.setTimeout(() => this.render(), 400); }
  /* relevance as the Links HUD scores it (0.9.65, Nick saw the two disagree): the map's relFrom, a walk from this note along weighted links that keeps coming home
     (personalized PageRank, 24 rounds, 20% home), up and related weighted double, tempered by how linked a note is, then up ×3 and related ×1.6; 100 for the closest */
  relFrom(path) { const G = this.G; if (!G || !G.g) return null; if (G.relP === path) return G.relV;
    if (!G.R) { const ns = G.g.nodes, n = ns.length, ix = new Map(ns.map((d, q) => [d.id, q])), nb = Array.from({ length: n }, () => []), wt = Array.from({ length: n }, () => []), sw = new Float64Array(n), P_ = new Map();
      const wOf = t => t === 1 || t === 4 ? 2 : t === 5 ? .6 : t === 2 ? .5 : 1;
      for (const [a0, b0, t] of G.g.edges) { const a = ix.get(a0), b = ix.get(b0); if (a == null || b == null || t === 3 || a === b || ns[a].archived || ns[b].archived) continue; const lo = Math.min(a, b), hi = Math.max(a, b), k_ = lo * n + hi; let o = P_.get(k_); if (!o) P_.set(k_, o = { lo, hi, w: 0, f: 0 }); o.w += wOf(t); o.f |= a === lo ? 1 : 2; }
      for (const o of P_.values()) { const w = o.w * (o.f === 3 ? 1.25 : 1); nb[o.lo].push(o.hi); wt[o.lo].push(w); nb[o.hi].push(o.lo); wt[o.hi].push(w); sw[o.lo] += w; sw[o.hi] += w; }
      G.R = { n, nb, wt, sw, pix: new Map(ns.map((d, q) => [d.path, q])) }; }
    const { n, nb, wt, sw, pix } = G.R, a = pix.get(path); if (a == null) return null; const al = .2; let x = new Float64Array(n), y = new Float64Array(n); x[a] = 1;
    for (let it = 0; it < 24; it++) { y.fill(0); y[a] = al; for (let q = 0; q < n; q++) { const v = x[q]; if (!v || !sw[q]) continue; const f = (1 - al) * v / sw[q], L = nb[q], W = wt[q]; for (let z = 0; z < L.length; z++) y[L[z]] += f * W[z]; } [x, y] = [y, x]; }
    const out = new Map(); for (let q = 0; q < n; q++) if (x[q]) out.set(q, x[q] / Math.pow(sw[q] + 1, .3));
    /* as the map does it, once per link between the two (its loop runs over out[a] and inn[a], so a note linked both ways gets the boost twice) */
    const ns = G.g.nodes, aid = ns[a].id, cnt = new Map(); for (const [a0, b0] of G.g.edges) { if (a0 === aid && b0 !== aid) cnt.set(b0, (cnt.get(b0) || 0) + 1); else if (b0 === aid && a0 !== aid) cnt.set(a0, (cnt.get(a0) || 0) + 1); }
    for (const [q, v] of out) { const c_ = cnt.get(ns[q].id); if (!c_) continue; const p = ns[q].path, k1 = G.ek.get(path + "\u0000" + p), kk = k1 ?? G.ek.get(p + "\u0000" + path); if (kk === 1 && k1 === 1) out.set(q, v * Math.pow(3, c_)); else if (kk === 4) out.set(q, v * Math.pow(1.6, c_)); }
    const byP = new Map(); for (const [q, v] of out) byP.set(ns[q].path, v); G.relP = path; G.relV = byP; return byP; }
  linksOf(path) { const rows = super.linksOf(path), rv = this.relFrom(path); if (!rv) return rows; for (const x of rows) x.r = rv.get(x.p) || 0;
    const mx = Math.max(1e-12, ...rows.map(x => x.r)); for (const x of rows) x.s = Math.round(100 * x.r / mx); return rows; }
  /* the pane's own Display (0.9.64, Nick): relevance scores, link colors, Idea Emergence headers, emojis, time since modified; shared by every Links pane */
  opt(k) { const v = this.plugin.store.get("iv-links-" + k); return v === true; }   /* every Show switch starts off for a new user (0.9.100, Nick) */
  setLOpt(k, v) { this.plugin.store.set("iv-links-" + k, v); for (const l of this.app.workspace.getLeavesOfType(LINKS_TYPE)) if (l.view instanceof LinksPaneView) l.view.render(); }
  /* a note's emoji as the map finds it (Display → Assign emojis): its deepest folder with one, else the emoji base's column */
  emoOf(p) { const F = this.plugin.store.get("iv-emofold") || {}; let q = p; while (q.includes("/")) { q = q.slice(0, q.lastIndexOf("/")); if (F[q]) return F[q]; }
    if (!this.emoMap && !this.emoBusy) { this.emoBusy = true; void (async () => { try { const st = this.plugin.settings; let bp = st.emojiBase || ""; if (!bp) { const f = this.app.vault.getFiles().find(x => x.extension === "base" && x.basename.toLowerCase() === "recents"); bp = f ? f.path : ""; }
      const q_ = this.plugin.baseQ || (this.plugin.baseQ = new BaseQ(this.app)); const r = bp ? await q_.column(bp, st.emojiCol || "") : null; this.emoMap = new Map(r && r.map ? Object.entries(r.map) : []); } catch (e) { this.emoMap = new Map(); } this.render(); })(); }
    return this.emoMap ? this.emoMap.get(p) || "" : ""; }
  /* a click opens the note where you're reading; ⌘-click in a new tab */
  openPrimary(path) { if (path) void this.app.workspace.openLinkText(path, "", false); }
  openSupport(path) { if (path) void this.app.workspace.openLinkText(path, "", "tab"); }
  propGroups(path) { const mc = this.app.metadataCache, own = new Map(), back = new Map(), skip = new Set(["up", "related"]);
    const keyOf = k => String(k || "").split(".")[0];
    const fc = mc.getFileCache(this.file(path) || { path }); for (const L of (fc && fc.frontmatterLinks) || []) { const k = keyOf(L.key); if (skip.has(k)) continue; const t = mc.getFirstLinkpathDest(L.link.split("#")[0].split("|")[0], path);
      if (t && t.extension === "md" && t.path !== path) { if (!own.has(k)) own.set(k, new Set()); own.get(k).add(t.path); } }
    const rl = mc.resolvedLinks || {}; for (const [src, m] of Object.entries(rl)) { if (src === path || !m || !m[path]) continue; const c = mc.getFileCache(this.file(src) || { path: src });
      for (const L of (c && c.frontmatterLinks) || []) { const k = keyOf(L.key); if (skip.has(k)) continue; const t = mc.getFirstLinkpathDest(L.link.split("#")[0].split("|")[0], src); if (t && t.path === path) { if (!back.has(k)) back.set(k, new Set()); back.get(k).add(src); } } }
    return { own, back }; }
  render() { const box = this.contentEl; if (!box) return; box.empty(); const path = this.cur; if (this.leaf && typeof this.leaf.updateHeader === "function") this.leaf.updateHeader();
    if (!path || !this.file(path)) { box.createDiv({ cls: "ivd-empty", text: "Open a note to see its links." }); return; }
    const lsAll = this.linksOf(path), { own, back } = this.propGroups(path);
    /* Filter → folders (0.9.110, Nick: "all I need right now is just the ability to deselect specific folders"): a hidden folder hides its notes and everything under it */
    const HIDF = (v => Array.isArray(v) ? v : [])(this.plugin.store.get("iv-links-hidef")), dirOf = p => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "", hidden = p => { const d = dirOf(p); return HIDF.some(h => d === h || d.startsWith(h + "/")); };
    const ls = lsAll.filter(l => !hidden(l.p)); for (const m of [own, back]) for (const [k, set] of m) { for (const x of [...set]) if (hidden(x)) set.delete(x); if (!set.size) m.delete(k); }
    /* collections join the other links under Obsidian's six sorts; only Relevance and Idea Emergence keep them in their own group (0.9.68, Nick) */
    const SO0 = this.plugin.store.get("iv-links-sort"), MC = new Set(), MP = new Set();
    if (SO0 && SO0 !== "rel" && SO0 !== "remg") {   /* Idea Emergence merges them too: a clean list (0.9.116, Nick); Relative Emergence and Relevance keep the groups */ const ck0 = new Set(((v => Array.isArray(v) ? v : String(v || "collections").split(","))(this.plugin.settings && this.plugin.settings.collectionProps)).map(x => String(x).trim()).filter(Boolean));
      for (const k of [...own.keys()]) { for (const x of own.get(k)) (ck0.has(k) ? MC : MP).add(x); own.delete(k); } for (const k of [...back.keys()]) { for (const x of back.get(k)) MP.add(x); back.delete(k); } }   /* every property group joins in (0.9.70, Nick: "just do it for everything") */
    const inG = new Set([...[...own.values()].flatMap(x => [...x]), ...[...back.values()].flatMap(x => [...x])]);
    const KR = { upp: 0 }, KEEP = new Set(["upp", "rel"]), main = ls.filter(l => !inG.has(l.p) || KEEP.has(this.kindOf(path, l.p)))
      .sort((a, b) => (KR[this.kindOf(path, a.p, a.a !== "←", a.a !== "→")] ?? 2) - (KR[this.kindOf(path, b.p, b.a !== "←", b.a !== "→")] ?? 2) || b.s - a.s);
    const hd = box.createDiv({ cls: "ivd-lkhd" }); const NL = ls.length;   /* every link, collections and properties included, as the HUD counts now (0.9.70) */ const hc = hd.createSpan({ cls: "ivd-h", text: `⇄ LINKS · ${NL}` });   /* counted as the HUD counts: links on the map's graph, so collections (drawn, never counted) aren't (0.9.65) */ /* search as the Links HUD does it (0.9.78, Nick: the full-width field was "too prominent"): a faint magnifier after the count opens a slim field in the header */
    const qOpen = this.qOpen || !!this.q, sk = hd.createEl("button", { cls: "ivd-lksb" + (qOpen ? " on" : ""), attr: { type: "button", "aria-description": "Search links" } }); setIcon(sk, "search");
    const qi = hd.createEl("input", { cls: "ivd-lkq", type: "text", attr: { placeholder: "Search links", spellcheck: "false" } }); qi.value = this.q; qi.hidden = !qOpen;
    hd.createSpan({ cls: "ivd-lksp" });
    sk.onclick = () => { if (this.qOpen || this.q) { this.qOpen = false; this.q = ""; this.qFocus = false; this.render(); } else { this.qOpen = true; this.qFocus = true; this.render(); } };
    /* sort (0.9.61, Nick: relevance by default, Idea Emergence, and Obsidian's own six); up and related stay on top in every order */
    const SO = LINKSORTS.some(x => x && x[0] === this.plugin.store.get("iv-links-sort")) ? this.plugin.store.get("iv-links-sort") : "remg",   /* Relative Emergence by default (0.9.100, Nick) */ MOD = SO === "mnew" || SO === "mold", CRE = SO === "cnew" || SO === "cold";
    /* our three orders explain themselves (0.9.96, Nick: "Hey, how are these things being scored?"): a small circled ? before Sort while one is on opens a card */
    const HELPT = LINKHELP[SO];
    const sb = hd.createEl("button", { cls: "ivd-lksort clickable-icon", attr: { type: "button", "aria-description": "Sort links", "aria-pressed": String(SO !== "remg") } }); setIcon(sb, "arrow-up-narrow-wide");
    sb.onclick = () => { if (this.menuJust(sb)) return; const m = new Menu(); for (const x of LINKSORTS) { if (!x) { m.addSeparator(); continue; } m.addItem(it => it.setTitle(x[1]).setChecked(x[0] === SO).onClick(() => this.setLOpt("sort", x[0]))); } this.menuUnder(m, sb); };
    /* Display, beside Sort (0.9.64); time since modified is offered only while sorted by modified time */
    const fb = hd.createEl("button", { cls: "ivd-lksort clickable-icon" + (this.filtOpen ? " is-active" : ""), attr: { type: "button", "aria-description": "Filter by folder", "aria-pressed": String(HIDF.length > 0) } }); setIcon(fb, "filter"); fb.onclick = () => { this.filtOpen = !this.filtOpen; this.render(); };
    const db = hd.createEl("button", { cls: "ivd-lksort clickable-icon", attr: { type: "button", "aria-description": "Display" } }); setIcon(db, "sliders-horizontal"); if (HELPT) { const qb = hd.createEl("button", { cls: "ivd-lkqh" + (this.helpOpen ? " on" : ""), text: "?", attr: { type: "button", "aria-description": "How this order works" } }); qb.onclick = () => { this.helpOpen = !this.helpOpen; this.render(); }; } else hd.createSpan({ cls: "ivd-lkqh ivd-lkqh-ph" });   /* the same slot when there's nothing to explain, so Sort and Display stay put */   /* after Sort and Display: its card opens inline and covers nothing (0.9.97, Nick) */
    /* each switch shows a sample of what it turns on (0.9.82, Nick: "ways to help the user understand what they're about to toggle on") */
    db.onclick = () => { if (this.menuJust(db)) return; const m = new Menu(), D = this.contentEl.ownerDocument; if (typeof m.setUseNativeMenu === "function") m.setUseNativeMenu(false);   /* macOS draws native menus as plain text by default (Settings → Appearance → Native menus): the samples and headers need Obsidian's own menu, as Canvas does for its rich menus (0.9.90) */
      const it_ = (k, t, hint, dis) => m.addItem(it => { const f = D.createDocumentFragment(), sp = D.createElement("span"); sp.className = "ivd-mh"; if (typeof t === "string") sp.append(t); else t(sp); if (hint) { const h = D.createElement("span"); h.className = "ivd-mhx"; hint(h); sp.append("\u2002", h); }   /* an en space too, so the sample never touches the words even where the menu's styles differ */ f.append(sp); it.setTitle(f).setChecked(dis ? false : this.opt(k)); if (dis) it.setDisabled(true); else it.onClick(() => this.setLOpt(k, !this.opt(k))); });
      const tx = (h, s_, c) => { const x = D.createElement("span"); x.className = c || ""; x.textContent = s_; h.append(x); return x; };
      const orbS = (h, L_) => { const o = D.createElement("span"); o.className = "ivd-orb lv" + L_; const g_ = LVGRAD[L_]; o.style.setProperty("--o0", g_[0]); o.style.setProperty("--o1", g_[1]); h.append(o); };
      /* three mini headers for where on a row each switch shows (0.9.88, Nick): LEFT arrows, orbs, emojis; MIDDLE the name's color; RIGHT the score column.
         A sort's own number joins RIGHT; Idea Emergence's headers get a LIST section of their own */
      const hd_ = t => m.addItem(it => { const f = D.createDocumentFragment(), x = D.createElement("span"); x.className = "ivd-mlab"; x.textContent = t; f.append(x); it.setTitle(f); if (typeof it.setIsLabel === "function") it.setIsLabel(true); else it.setDisabled(true); });
      const TAKEN = ((SO === "lvl" || SO === "remg" || SO === "az" || SO === "za") && this.opt("lsc")) || (MOD && this.opt("age")) || (CRE && this.opt("cage"));
      hd_("Left");
      it_("arr", "Show inlink/outlink arrows", h => tx(h, "← → ↔", "ivd-mha"));   /* Nick's name (0.9.88) */
      it_("orb", "Show Idea Emergence orbs", h => { orbS(h, 5); orbS(h, 4); orbS(h, 3); });
      it_("emo", "Show emojis", h => tx(h, "✨"));
      m.addSeparator(); hd_("Middle");
      it_("col", sp => { sp.append("Show "); tx(sp, "Idea", "ivd-mc-upp"); sp.append(" "); tx(sp, "Emergence", "ivd-mc-rel"); sp.append(" "); tx(sp, "link", "ivd-mc-up"); sp.append(" "); tx(sp, "colors", "ivd-mc-down"); });
      if (SO === "lvl") it_("lvh", "Show Idea Emergence headers", h => tx(h, "LEVEL 5", "ivd-mhh"));
      it_("unreq", "Show unrequited links only", h => tx(h, "←", "ivd-mha"));   /* notes that link here that this note doesn't link back to; the rest dim (0.9.107, Nick's "unrequited notes") */   /* rows indent under their group header, like an outline (0.9.103, Nick) */   /* only while sorted by Idea Emergence (0.9.73); in Middle (0.9.89, Nick) */
      m.addSeparator(); hd_("Right");
      /* the score column holds one thing: while link score or a time fills it, relevance shows unchecked and greyed, its own setting kept (0.9.87, Nick) */
      it_("rel", "Show relevance scores", h => tx(h, "82", "ivd-mhn"), TAKEN);
      const EMG = SO === "lvl" || SO === "remg" || SO === "az" || SO === "za";   /* link score under the file-name sorts too (0.9.97, Nick) */
      if (EMG) it_("lsc", "Show link score", h => tx(h, "9.9", "ivd-mhn"));   /* the score that sets each note's level, in place of relevance (0.9.80, Nick) */
      if (MOD) it_("age", "Show time since modified", h => tx(h, "6d", "ivd-mhn")); if (CRE) it_("cage", "Show time since created", h => tx(h, "3y", "ivd-mhn"));   /* each offered only while its sort is on (0.9.66) */

      this.menuUnder(m, db); };
    const G = this.G, fi = p => this.file(p), lv = p => { const n_ = G && G.idx.get(p); return n_ ? [n_.level || 0, n_.score || 0] : [0, 0]; }, sc0 = new Map(ls.map(l => [l.p, l.s]));
    const cmp = {
      rel: (a, b) => (sc0.get(b) || 0) - (sc0.get(a) || 0) || this.title(a).localeCompare(this.title(b)),
      remg: (a, b) => (sc0.get(b) || 0) - (sc0.get(a) || 0) || this.title(a).localeCompare(this.title(b)),
      lvl: (a, b) => { const A = lv(a), B = lv(b); return B[0] - A[0] || B[1] - A[1] || this.title(a).localeCompare(this.title(b)); },
      az: (a, b) => this.title(a).localeCompare(this.title(b), undefined, { numeric: true }), za: (a, b) => this.title(b).localeCompare(this.title(a), undefined, { numeric: true }),
      mnew: (a, b) => ((fi(b) || {}).stat || {}).mtime - ((fi(a) || {}).stat || {}).mtime || 0, mold: (a, b) => ((fi(a) || {}).stat || {}).mtime - ((fi(b) || {}).stat || {}).mtime || 0,
      cnew: (a, b) => this.createdMs(b) - this.createdMs(a) || ((fi(b) || {}).stat || {}).ctime - ((fi(a) || {}).stat || {}).ctime || 0, cold: (a, b) => this.createdMs(a) - this.createdMs(b) || ((fi(a) || {}).stat || {}).ctime - ((fi(b) || {}).stat || {}).ctime || 0 }[SO];
    const PIN = SO === "rel";   /* Idea Emergence no longer lifts up links (0.9.113, Nick: Relative Emergence covers that) */   /* (Relative Emergence groups up on its own) */   /* up on top only in our own two orders; Obsidian's six sort everything alike (0.9.71, Nick) */
    main.sort((a, b) => (PIN ? (KR[this.kindOf(path, a.p)] ?? 2) - (KR[this.kindOf(path, b.p)] ?? 2) : 0) || cmp(a.p, b.p));
    /* the folder list: every folder this note's links live in, as a tree with counts; a click hides or shows it (like the map's Filter → Folders) */
    if (this.filtOpen) { const fp = box.createDiv({ cls: "ivd-lkfilt" }), cnt = new Map(); for (const l of lsAll) { let d = dirOf(l.p); while (true) { cnt.set(d, (cnt.get(d) || 0) + 1); if (!d) break; d = dirOf(d); } }
      const hd2 = fp.createDiv({ cls: "ivd-lkfh" }); hd2.createSpan({ text: "Folders" }); if (HIDF.length) { const all = hd2.createEl("button", { cls: "ivd-lkfall", text: "Show all", attr: { type: "button" } }); all.onclick = () => this.setLOpt("hidef", []); }
      const dirs = [...cnt.keys()].filter(Boolean).sort((a_, b_) => a_.localeCompare(b_));
      for (const d of dirs) { const depth = d.split("/").length - 1, off = HIDF.some(h => d === h || d.startsWith(h + "/")), row = fp.createEl("button", { cls: "ivd-lkfr" + (off ? " off" : ""), attr: { type: "button" } }); row.style.setProperty("--fd", String(depth));
        const cb = row.createSpan({ cls: "ivd-lkfc" }); if (!off) setIcon(cb, "check"); row.createSpan({ cls: "ivd-lkfn", text: d.split("/").pop() }); row.createSpan({ cls: "ivd-lkfk", text: String(cnt.get(d)) });
        row.onclick = () => { const own_ = HIDF.includes(d); let nx = own_ ? HIDF.filter(h => h !== d) : off ? HIDF : [...HIDF.filter(h => !h.startsWith(d + "/")), d]; this.setLOpt("hidef", nx); }; } }
    if (HELPT && this.helpOpen) { const c_ = box.createDiv({ cls: "ivd-lkhelp" }); c_.createDiv({ cls: "ivd-lkht", text: LINKSORTS.find(x => x && x[0] === SO)[1] }); for (const para of HELPT) c_.createEl("p", { text: para }); c_.onclick = () => { this.helpOpen = false; this.render(); }; }
    const list = box.createDiv({ cls: "ivd-lklist" }); this.underHead = false;   /* rows under a group header tuck in, always (0.9.113, Nick: no longer a setting) */ const sc = new Map(ls.map(l => [l.p, l]));
    const ck = new Set(((v => Array.isArray(v) ? v : String(v || "collections").split(","))(this.plugin.settings && this.plugin.settings.collectionProps)).map(x => String(x).trim()).filter(Boolean));
    const ARR = this.opt("arr"), LSC = (SO === "lvl" || SO === "remg" || SO === "az" || SO === "za") && this.opt("lsc"), ORB = this.opt("orb"), AGE = MOD && this.opt("age"), CAGE = CRE && this.opt("cage"), REL = this.opt("rel"), COL = this.opt("col"), EMO = this.opt("emo");
    const onG = p => !this.G || this.G.ek.has(path + "\u0000" + p) || this.G.ek.has(p + "\u0000" + path), right = p => LSC ? (() => { const n_ = this.G && this.G.idx.get(p); if (!n_ || n_.score == null) return ""; const v = +n_.score; return v.toFixed(v < 10 ? 1 : 0); })() : AGE ? (fi(p) ? this.age(fi(p).stat.mtime) : "") : CAGE ? (fi(p) ? this.age(this.createdMs(p)) : "") : REL && sc.has(p) && onG(p) ? String(sc.get(p).s) : "";   /* no score for a collection: the map never counts it */
    const UNREQ = this.opt("unreq"), outS = new Set(ls.filter(l => l.a !== "←").map(l => l.p));
    const put = (p, a0, c) => { let a = a0; const unq = !outS.has(p) && a0 === "←"; if (!ARR) a = ""; if (MC.has(p)) c = !COL ? "var(--ivd-link)" : this.plugin.store.get("iv-colllinks") !== false ? "var(--ivd-coll)" : "var(--ivd-prop)"; else if (MP.has(p) && !MC.has(p) && COL && !KEEP.has(this.kindOf(path, p))) c = "var(--ivd-prop)"; const r = this.row(list, p, a, c, right(p)); r.dataset.q = this.title(p).toLowerCase();
      /* the Holodeck tab's orb (0.9.67, Nick): its level's shape and gradient, 5 a rounded square, 4 a diamond, 3 to 1 a circle */
      if (ORB) { const L_ = lv(p)[0], t0 = r.querySelector(".ivd-t"), o_ = createSpan({ cls: "ivd-orb lv" + L_ }), g_ = LVGRAD[L_]; if (g_) { o_.style.setProperty("--o0", g_[0]); o_.style.setProperty("--o1", g_[1]); } if (t0) t0.before(o_); }
      /* an emoji at the start of the file name is the note's emoji: it fills the column, ahead of folders and the base, and leaves the name (0.9.102, Nick) */
      if (EMO) { const t = r.querySelector(".ivd-t"), m_ = LEAD_EMO.exec(this.title(p)), em = m_ ? m_[1] : this.emoOf(p), sp = createSpan({ cls: "ivd-e" + (m_ ? " ivd-e-own" : ""), text: em || "" });   /* the file name's own emoji carries a small dot at its corner (0.9.105, Nick picked "A dot on the emoji") */ if (t) { if (m_) t.setText(this.title(p).slice(m_[0].length)); t.before(sp); } } if (this.underHead) r.addClass("ivd-under"); if (UNREQ && !unq) r.addClass("ivd-dim");   /* requited (or this note's own link) steps back */
      /* a row drags like a file from Obsidian's list, so dropping it into the note writes a link (0.9.107) */
      r.addEventListener("dragstart", e => { const f_ = this.file(p), dm = this.app.dragManager; if (!f_ || !dm || typeof dm.dragFile !== "function") return; if (dm.draggable && typeof dm.onDragEnd === "function") { try { dm.onDragEnd(e); } catch (_) { /* stale */ } } const d = dm.dragFile(e, f_); if (d) dm.onDragStart(e, d); r.addEventListener("dragend", ev => { if (dm.draggable && typeof dm.onDragEnd === "function") { try { dm.onDragEnd(ev); } catch (_) { /* clean */ } } }, { once: true }); });
      return r; };
    /* Idea Emergence headers (0.9.64, Nick): the main list grouped by level, highest first, in the Holodeck's folder-header style; up and related lead each level */
    /* Relative Emergence (0.9.74, Nick): this note's links by where they sit relative to it, as the note strip and the link colors say: up, related, above, below,
       each by relevance; property groups follow as in Relevance */
    /* the note itself among its links, in its own pill: Relative Emergence between above and below (0.9.75), Idea Emergence at its place by level and score (0.9.113, Nick) */
    const herePill = () => { const h = list.createDiv({ cls: "ivd-here" }); if (ORB) { const L_ = lv(path)[0], o_ = h.createSpan({ cls: "ivd-orb lv" + L_ }), g_ = LVGRAD[L_]; if (g_) { o_.style.setProperty("--o0", g_[0]); o_.style.setProperty("--o1", g_[1]); } } h.createSpan({ cls: "ivd-ht", text: this.title(path) }); const sc_ = this.G && this.G.idx.get(path); if (LSC && sc_ && sc_.score != null) { const v = +sc_.score; h.createSpan({ cls: "ivd-n", text: v.toFixed(v < 10 ? 1 : 0) }); } };
    if (SO === "remg") { const RK = p => { const k = this.kindOf(path, p); if (k === "upp" || k === "rel" || k === "up" || k === "down") return k; const A = this.G && this.G.idx.get(path), B = this.G && this.G.idx.get(p); if (!A || !B) return "down"; return B.level !== A.level ? (B.level > A.level ? "up" : "down") : (B.score || 0) >= (A.score || 0) ? "up" : "down"; };
      for (const [k, lab] of [["upp", "Up"], ["rel", "Related"], ["up", "Above"], ["here"], ["down", "Below"]]) {
        if (k === "here") { herePill(); continue; }   /* no level on the pill (0.9.100, Nick) */   /* with Show link score on, its own score in line with the rest, in place of the level (0.9.86, Nick) */
        const ar = main.filter(l => RK(l.p) === k); if (!ar.length) continue; this.ghead(list, "ivd-lkg ivd-lvh", lab, ar.length); for (const l of ar) put(l.p, l.a, l.c); } }
    else if (SO === "lvl") { const me = { p: path, here: true }, all = [...main, me].sort((x, y) => cmp(x.p, y.p)), heads = this.opt("lvh"); let lastK = null;
      for (const l of all) { const k = lv(l.p)[0]; if (heads && k !== lastK) { const n_ = all.filter(z => lv(z.p)[0] === k && !z.here).length; this.ghead(list, "ivd-lkg ivd-lvh", k ? `Level ${k}` : "Not on the map", n_); lastK = k; } if (l.here) herePill(); else put(l.p, l.a, l.c); } }
    /* pinned up links say so (0.9.94, Nick: "Why is this link at the top with a lower score than the one right below it?"): an UP header over them and a thin line after */
    else { const ups = PIN ? main.filter(l => this.kindOf(path, l.p) === "upp") : []; if (ups.length) { this.ghead(list, "ivd-lkg ivd-lvh", "Up", ups.length); for (const l of ups) put(l.p, l.a, l.c); list.createDiv({ cls: "ivd-lkdiv ivd-lkg" }); this.underHead = false;   /* also ends the UP group, so a search hides UP when none of its rows match */ }
      for (const l of main) if (!ups.includes(l)) put(l.p, l.a, l.c); }
    /* a group's header takes its rows' color, as in the HUD (0.9.65, Nick): collections coral (with Display → Collection links in coral), other properties slate; plain with link colors off */
    const CORAL = this.plugin.store.get("iv-colllinks") !== false;
    const group = (lab, set, arrow, coral) => { if (!set.size) return; const c_ = !COL ? "" : coral && CORAL ? "var(--ivd-coll)" : "var(--ivd-prop)"; const h_ = this.ghead(list, "ivd-h ivd-lkg", lab.toUpperCase(), set.size); if (c_) h_.style.setProperty("--c", c_); if (c_) h_.addClass("ivd-lkgc");
      for (const p of [...set].sort(cmp)) put(p, arrow, c_ || "var(--ivd-link)"); };
    for (const [k, set] of own) group(k, set, "→", ck.has(k)); for (const [k, set] of back) group(k, set, "←", false);
    const apply = () => { const q = this.q.trim().toLowerCase(); let m_ = 0; for (const r of list.querySelectorAll(".ivd-row")) { const hit = !q || (r.dataset.q || "").includes(q); r.toggleAttribute("hidden", !hit); if (hit && q) m_++; } hc.setText(q ? `⇄ LINKS · ${m_}/${NL}` : `⇄ LINKS · ${NL}`);
      for (const g of list.querySelectorAll(".ivd-lkg")) { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains("ivd-lkg")) { if (!n.hasAttribute("hidden")) any = true; n = n.nextElementSibling; } g.toggleAttribute("hidden", !!q && !any); } for (const d of list.querySelectorAll(".ivd-lkdiv")) d.toggleAttribute("hidden", !!q); };
    qi.addEventListener("input", () => { this.q = qi.value; apply(); }); qi.addEventListener("keydown", e => { if (e.key === "Escape") { this.q = ""; this.qOpen = false; this.qFocus = false; this.render(); } });
    qi.addEventListener("focus", () => { this.qFocus = true; }); qi.addEventListener("blur", () => { this.qFocus = false; if (!this.q) { this.qOpen = false; window.setTimeout(() => { if (!this.qOpen && !this.q) this.render(); }, 150); } });
    if (qOpen && this.qFocus) window.setTimeout(() => { qi.focus(); const n_ = qi.value.length; qi.setSelectionRange(n_, n_); }, 0);
    apply(); }
}
export function registerDeck(plugin) {
  plugin.registerView(DECK_TYPE, leaf => new DeckView(leaf, plugin));
  plugin.registerView(LINKS_TYPE, leaf => new LinksPaneView(leaf, plugin));
  /* the Links pane: in the right sidebar, where Obsidian's backlinks sit, or anywhere you drag it */
  plugin.addCommand({ id: "open-links-pane", name: "Open the Links pane", callback: async () => { const W = plugin.app.workspace, ex = W.getLeavesOfType(LINKS_TYPE)[0];
    if (ex) { await W.revealLeaf(ex); return; } const lf = W.getRightLeaf(false); if (!lf) return; await lf.setViewState({ type: LINKS_TYPE, active: true }); await W.revealLeaf(lf); } });
  plugin.addCommand({ id: "open-links-pane-tab", name: "Open the Links pane in a new tab", callback: async () => { const W = plugin.app.workspace, lf = W.getLeaf("tab"); await lf.setViewState({ type: LINKS_TYPE, active: true }); } });
  const active = () => { const f = plugin.app.workspace.getActiveFile(); return f && f.extension === "md" ? f.path : null; };
  /* on mobile there are no pop-out windows: the Mini Deck opens as a tab (0.9.46, Nick: "a quick way between recent notes… as opposed to all these panes you swipe left and right for");
     "Mini Deck", not "Deck Mini": the Holodeck is the main one, the Mini Deck the tiny one (0.9.48, Nick) */
  const openMini = async pin => { const W = plugin.app.workspace, p = pin || active();
    if (Platform.isMobile) { const ex = W.getLeavesOfType(DECK_TYPE)[0]; if (ex) { await W.revealLeaf(ex); if (typeof ex.loadIfDeferred === "function") await ex.loadIfDeferred(); if (ex.view instanceof DeckView) { if (pin && ex.view.st.primary !== pin) ex.view.setSlot("p", pin); ex.view.st.drawerMain = true; ex.view.save(); ex.view.render(); } return; }   /* back to the Mini Deck: the drawer opens, ready to jump */
      const lf = W.getLeaf("tab"); await lf.setViewState({ type: DECK_TYPE, active: true, state: { mini: true, primary: p, drawerMain: true } }); await W.revealLeaf(lf); return; }
    const leaf = typeof W.openPopoutLeaf === "function" ? W.openPopoutLeaf({ size: { width: 560, height: 900 } }) : W.getLeaf("window");
    await leaf.setViewState({ type: DECK_TYPE, active: true, state: { mini: true, primary: p, drawerMain: true } }); };
  plugin.addCommand({ id: "pop-out-deck-mini", name: Platform.isMobile ? "Open Mini Deck" : "Pop out Mini Deck", callback: () => { void openMini(); } });
  /* in every note's ⋯ menu (and a note's right-click or long-press menu), not the ribbon (0.9.48, Nick: "no one uses the ribbon") */
  /* Convert to Mini Deck (0.9.48, Nick): the note's own tab becomes the Mini Deck, no extra tab or window; from the file list (no tab) it opens one */
  const convert = async (leaf, path) => { await leaf.setViewState({ type: DECK_TYPE, active: true, state: { mini: true, primary: path, drawerMain: true } }); await plugin.app.workspace.revealLeaf(leaf); };
  plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file, source, leaf) => { if (!(file instanceof TFile) || file.extension !== "md") return;
    if (leaf && leaf.view && leaf.view.getViewType() === "markdown") menu.addItem(it => it.setTitle("Convert to Mini Deck").setIcon("panel-right").onClick(() => { void convert(leaf, file.path); }));
    else menu.addItem(it => it.setTitle(Platform.isMobile ? "Open in Mini Deck" : "Pop out in Mini Deck").setIcon("panel-right").onClick(() => { void openMini(file.path); })); }));
  plugin.addCommand({ id: "convert-to-mini-deck", name: "Convert to Mini Deck", checkCallback: checking => { const lf = plugin.app.workspace.getMostRecentLeaf(), v = lf && lf.view;
    if (!v || v.getViewType() !== "markdown" || !v.file) return false; if (!checking) void convert(lf, v.file.path); return true; } });
  plugin.addCommand({ id: "deck-show-active", name: "Mini Deck: show the active note as the primary", checkCallback: checking => { const p = active(); const ds = plugin.app.workspace.getLeavesOfType(DECK_TYPE).map(l => l.view).filter(v => v instanceof DeckView);
    if (!p || !ds.length) return false; if (!checking) for (const v of ds) v.openPrimary(p); return true; } });
}
