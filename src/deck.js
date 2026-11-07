/* The Deck (0.9.1, Nick, Nov 5): a writing-first view with no graph. The primary note in the middle, the biggest rectangle; its Recents and Links
   in a straight column right beside it; two support notes on the right (the one you click grows); the note that was primary before, small, top left
   (click to swap back); a pinned sidekick note below it (a MOC, usually). Each support and the sidekick has a links drawer that slides out over its
   right side. Deck Mini is the primary note alone with its drawer, made to pop out into its own window for meetings.
   Each Deck tab keeps its own notes in its own saved state, so a Mini and the full Deck (and the main map) never fight over settings. */
import { ItemView, MarkdownRenderer, Notice, TFile, normalizePath, setIcon } from "obsidian";
import { FolderPicker, NotePicker } from "./view.js";

export const DECK_TYPE = "ideaverse-deck";

const KIND_COL = { upp: "var(--ivd-upp)", rel: "var(--ivd-rel)", up: "var(--ivd-up)", down: "var(--ivd-down)", prop: "var(--ivd-prop)" };

export class DeckView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin;
    this.st = { mini: false, primary: null, prev: null, sup: [null, null], focus: 0, side: null, drawers: {}, drawerMain: true, drawerDock: true, hist: {}, leftW: 340, hudW: 230, rightW: 380 };
    this.eds = {}; }
  getViewType() { return DECK_TYPE; }
  getDisplayText() { return this.st.mini ? "Deck Mini" : "Deck"; }
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
      o = this.eds[slot] = { el: split.containerEl,
        open: async path => { const f = this.app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return false; if (cur === path && leaf) return true;
          if (!leaf) { leaf = W.createLeafInParent(split, 0); leaf.ivmCard = true; } cur = path;
          await leaf.openFile(f, { state: { mode: "source", source: false }, active: false }); return true; },
        resize: () => { if (leaf && leaf.view && typeof leaf.view.onResize === "function") leaf.view.onResize(); },
        close: () => { if (leaf) { leaf.detach(); leaf = null; } cur = null; split.containerEl.remove(); } }; }
    o.el.addClass("ivd-ed"); if (o.el.parentElement !== host) host.appendChild(o.el); return o; }
  dropEditor(slot) { const o = this.eds[slot]; if (o) { o.close(); delete this.eds[slot]; } }

  file(p) { const f = p && this.app.vault.getAbstractFileByPath(p); return f instanceof TFile ? f : null; }
  title(p) { const f = this.file(p); return f ? f.basename : ""; }

  openPrimary(path) { if (!path || path === this.st.primary) return; this.setSlot("p", path); this.save(); this.render(); }
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
      for (const [a, b, k] of g.edges) { const A = byId.get(a), B = byId.get(b); if (A && B) ek.set(A.path + "\u0000" + B.path, k); }
      const rk = new Map(); [...g.nodes].filter(nd => !nd.archived).sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((nd, q) => rk.set(nd.path, q + 1)); this.G = { idx, ek, rk, w: (() => { const W = (g.settings && g.settings.weights) || {}, sv = this.plugin.store.get("iv-score"); const w0 = { in: W.body_in ?? 1, out: W.body_out ?? .6, up: W.up_in ?? .3, both: W.both ?? .8, coll: W.coll_in ?? 0 }; return sv && sv.w ? Object.assign(w0, sv.w) : w0; })() };   /* the weights the map scores with, your Scoring changes included */ this.gLoading = false; this.render(); }).catch(() => { this.gLoading = false; }); }
  kindOf(from, to, o, i) { const G = this.G; if (!G) return ""; const k = G.ek.get(from + "\u0000" + to), kb = G.ek.get(to + "\u0000" + from);
    if (k === 1) return "upp"; if (k === 4 || kb === 4) return "rel"; if (k === 5 || k === 3) return "prop"; if (kb === 1) return "down";
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
  age(ms) { const s = (Date.now() - ms) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m" : s < 86400 ? Math.round(s / 3600) + "h" : Math.round(s / 86400) + "d"; }

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
    r.addEventListener("mouseleave", () => { if (this.hovEl === r) { this.hovPath = null; this.hovEl = null; } window.setTimeout(() => this.hidePv(), 120); });
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
      top.createSpan({ cls: "ivd-lab", text: S.mini ? "DECK MINI" : "DECK" });
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
    /* the full Deck is gone (0.9.45, Nick: "Holodeck is just a superior mode"); Deck Mini stays */
    { const pc = this.card(root, "ivd-primary", "", P, "p", { strip: this.optD("strip-p", true), nav: this.navBtns("p"), btns: [["panel-right", "Recents and links", b => { S.drawerMain = !S.drawerMain; this.save(); this.render(); void b; }]], empty: "Open a note (from any tab) and run “Deck: show the active note”" });
      keep("p"); pc.toggleClass("ivd-docked", !!(S.drawerMain && S.drawerDock)); if (S.drawerMain) { const dr = pc.createDiv({ cls: "ivd-drawer ivd-main-drawer" }); pc.style.setProperty("--ivd-mdw", Math.max(140, Math.min(460, +S.drawerW || 220)) + "px"); dr.style.setProperty("--ivd-mdw", Math.max(140, Math.min(460, +S.drawerW || 220)) + "px");
        /* its left edge can be dragged wider or narrower (0.9.7, Nick); only a CSS width changes while dragging, so nothing re-renders */
        const g = dr.createDiv({ cls: "ivd-grip ivd-grip-l" }); g.addEventListener("pointerdown", e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const x0 = e.clientX, w0 = dr.getBoundingClientRect().width;
          const mv = ev => { S.drawerW = Math.round(Math.max(140, Math.min(460, w0 - (ev.clientX - x0)))); dr.style.setProperty("--ivd-mdw", S.drawerW + "px"); pc.style.setProperty("--ivd-mdw", S.drawerW + "px"); };
          const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); this.save(); this.onResize(); }; g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); });
        const hin = dr.createDiv({ cls: "ivd-hudin" }); this.hudEl = hin; this.hud(hin, P, true); } else this.hudEl = null;
      for (const k of Object.keys(this.eds)) if (!want.has(k)) this.dropEditor(k); }
    window.setTimeout(() => this.onResize(), 50); }
}

export function registerDeck(plugin) {
  plugin.registerView(DECK_TYPE, leaf => new DeckView(leaf, plugin));
  const active = () => { const f = plugin.app.workspace.getActiveFile(); return f && f.extension === "md" ? f.path : null; };
  plugin.addCommand({ id: "pop-out-deck-mini", name: "Pop out Deck Mini", callback: async () => { const W = plugin.app.workspace, p = active();
    const leaf = typeof W.openPopoutLeaf === "function" ? W.openPopoutLeaf({ size: { width: 560, height: 900 } }) : W.getLeaf("window");
    await leaf.setViewState({ type: DECK_TYPE, active: true, state: { mini: true, primary: p, drawerMain: true } }); } });
  plugin.addCommand({ id: "deck-show-active", name: "Deck Mini: show the active note as the primary", checkCallback: checking => { const p = active(); const ds = plugin.app.workspace.getLeavesOfType(DECK_TYPE).map(l => l.view).filter(v => v instanceof DeckView);
    if (!p || !ds.length) return false; if (!checking) for (const v of ds) v.openPrimary(p); return true; } });
}
