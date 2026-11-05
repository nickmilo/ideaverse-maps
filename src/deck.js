/* The Deck (0.9.1, Nick, Nov 5): a writing-first view with no graph. The primary note in the middle, the biggest rectangle; its Recents and Links
   in a straight column right beside it; two support notes on the right (the one you click grows); the note that was primary before, small, top left
   (click to swap back); a pinned sidekick note below it (a MOC, usually). Each support and the sidekick has a links drawer that slides out over its
   right side. Deck Mini is the primary note alone with its drawer, made to pop out into its own window for meetings.
   Each Deck tab keeps its own notes in its own saved state, so a Mini and the full Deck (and the main map) never fight over settings. */
import { ItemView, MarkdownRenderer, TFile, setIcon } from "obsidian";

export const DECK_TYPE = "ideaverse-deck";

const KIND_COL = { upp: "var(--ivd-upp)", rel: "var(--ivd-rel)", up: "var(--ivd-up)", down: "var(--ivd-down)", prop: "var(--ivd-prop)" };

export class DeckView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin;
    this.st = { mini: false, primary: null, prev: null, sup: [null, null], focus: 0, side: null, drawers: {}, drawerMain: true, hist: {}, leftW: 340, hudW: 230, rightW: 380 };
    this.eds = {}; }
  getViewType() { return DECK_TYPE; }
  getDisplayText() { return this.st.mini ? "Deck Mini" : "Deck"; }
  getIcon() { return this.st.mini ? "panel-right" : "layout-dashboard"; }
  getState() { return Object.assign({}, super.getState(), JSON.parse(JSON.stringify(this.st))); }
  async setState(state, result) { if (state && typeof state === "object") for (const k of Object.keys(this.st)) if (k in state) this.st[k] = state[k];
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
      const rk = new Map(); [...g.nodes].filter(nd => !nd.archived).sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((nd, q) => rk.set(nd.path, q + 1)); this.G = { idx, ek, rk }; this.gLoading = false; this.render(); }).catch(() => { this.gLoading = false; }); }
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
  strip(host, path) { this.ensureGraph(); const nd = this.G && this.G.idx.get(path), rl = this.app.metadataCache.resolvedLinks || {}; let inn = 0; for (const m of Object.values(rl)) if (m && m[path]) inn++;
    const out = Object.keys(rl[path] || {}).filter(t => t !== path).length, b = host.createDiv({ cls: "ivd-strip" });
    if (nd) { const lv = b.createSpan({ cls: "ivd-lv", text: "L" + nd.level }); lv.dataset.l = String(nd.level); }
    b.createSpan({ text: `${inn} in · ${out} out` }); const r = this.G && this.G.rk.get(path); if (r) b.createSpan({ cls: "ivd-rk", text: "#" + r.toLocaleString() }); }
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
    if (rb) { const g = box.createDiv({ cls: "ivd-vgrip", attr: { "aria-label": "Drag to show more or fewer recents" } }); rb.after(g);
      g.addEventListener("pointerdown", e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const y0 = e.clientY, n0 = this.recRows(mini);
        const mv = ev => { const n = Math.max(3, Math.min(40, n0 + Math.round((ev.clientY - y0) / 22))); rb.style.setProperty("--ivd-rn", String(n)); g.dataset.n = String(n); };
        const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); if (g.dataset.n) this.plugin.store.set("iv-deck-recrows" + (mini ? "m" : ""), +g.dataset.n); };
        g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); }); }
    for (const l of ls) this.row(box, l.p, l.a, l.c, this.opt("rel") ? String(l.s) : ""); void rh; }
  recRows(mini) { const v = +this.plugin.store.get("iv-deck-recrows" + (mini ? "m" : "")); return v >= 3 && v <= 40 ? v : mini ? 8 : 10; }
  renderHud() { if (this.hudEl) this.hud(this.hudEl, this.st.primary, this.st.mini); for (const [k, el] of Object.entries(this.drawerEls || {})) if (el && !el.hidden && !el.classList.contains("ivd-main-drawer")) this.hud(el, el.dataset.path, true, true); }

  /* a note card: header (label, title, buttons), the editor, and its links drawer */
  card(parent, cls, label, path, slot, opts = {}) { const c = parent.createDiv({ cls: "ivd-card " + cls }); const hd = c.createDiv({ cls: "ivd-hd" });
    for (const [ic, tip, fn, off] of opts.nav || []) { const b = hd.createEl("button", { cls: "ivd-ib ivd-nav", attr: { type: "button", "aria-label": tip } }); setIcon(b, ic); b.disabled = !!off; b.onclick = e => { e.stopPropagation(); fn(); }; }
    hd.createSpan({ cls: "ivd-lab", text: label }); if (path && opts.readOnly) hd.createSpan({ cls: "ivd-ttl", text: this.title(path) });   /* an editor shows its own title; only Previous (no editor) names its note up here (0.9.2, Nick) */ hd.createSpan({ cls: "ivd-sp" });
    for (const [ic, tip, fn] of opts.btns || []) { const b = hd.createEl("button", { cls: "ivd-ib", attr: { type: "button", "aria-label": tip } }); setIcon(b, ic); b.onclick = e => { e.stopPropagation(); fn(b); }; }
    if (path && opts.strip) this.strip(c, path);
    const body = c.createDiv({ cls: "ivd-body" });
    if (!path) { const e_ = body.createDiv({ cls: "ivd-empty" }); e_.createDiv({ text: opts.empty || "Drop a note here" }); e_.createDiv({ cls: "ivd-sub", text: "drag a Recents or Links row · or ⌘-click one" }); }
    else if (opts.readOnly) { const pv = body.createDiv({ cls: "ivd-pv markdown-rendered" }); void this.app.vault.cachedRead(this.file(path)).then(t => { void MarkdownRenderer.render(this.app, t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").slice(0, 900), pv, path, this); }); }
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
    { const top = root.createDiv({ cls: "ivd-top" }), cog = top.createEl("button", { cls: "ivd-ib ivd-cog", attr: { type: "button", "aria-label": "Deck settings" } }); setIcon(cog, "settings");
      top.createSpan({ cls: "ivd-lab", text: S.mini ? "DECK MINI" : "DECK" });
      const pop = top.createDiv({ cls: "ivd-pop" }); pop.hidden = true;
      for (const [k, t] of [["rel", "Show relevance scores"], ["age", "Show time since modified"], ["col", "Color links by Idea Emergence"], ["strip-p", "Level strip on the primary note"], ["strip-s", "Level strip on the support notes"], ["strip-side", "Level strip on the sidekick"]]) {
        if (S.mini && k.startsWith("strip-") && k !== "strip-p") continue;
        const l = pop.createEl("label", { cls: "ivd-sw" }), cb = l.createEl("input", { type: "checkbox" }); cb.checked = this.optD(k, !k.startsWith("strip-") || k === "strip-p"); l.createEl("i"); l.createSpan({ text: t }); cb.onchange = () => this.setOpt(k, cb.checked); }
      { const l = pop.createDiv({ cls: "ivd-sw ivd-rng" }); l.createSpan({ text: "Recents" }); const r = l.createEl("input", { type: "range" }); r.min = "5"; r.max = "50"; r.step = "1"; r.value = String(this.optN()); const v = l.createEl("b", { text: String(this.optN()) });
        r.oninput = () => v.setText(r.value); r.onchange = () => this.setOpt("recn", +r.value); }
      if (!S.mini) { const r_ = pop.createEl("button", { cls: "ivd-reset", text: "Reset column widths", attr: { type: "button" } }); r_.onclick = () => { S.leftW = 340; S.hudW = 230; S.rightW = 380; this.save(); this.render(); }; }
      cog.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; cog.toggleClass("on", !pop.hidden); };
      this.registerDomEvent(root.ownerDocument, "pointerdown", e => { if (!pop.hidden && !top.contains(e.target)) { pop.hidden = true; cog.removeClass("on"); } }); }
    const want = new Set(); const keep = s => want.add(s);
    if (S.mini) { const pc = this.card(root, "ivd-primary", "", P, "p", { strip: this.optD("strip-p", true), nav: this.navBtns("p"), btns: [["panel-right", "Recents and links", b => { S.drawerMain = !S.drawerMain; this.save(); this.render(); void b; }]], empty: "Open a note (from any tab) and run “Deck: show the active note”" });
      keep("p"); if (S.drawerMain) { const dr = pc.createDiv({ cls: "ivd-drawer ivd-main-drawer" }); this.hudEl = dr; this.hud(dr, P, true); } else this.hudEl = null;
      for (const k of Object.keys(this.eds)) if (!want.has(k)) this.dropEditor(k); return; }
    const CL = { leftW: [240, 560, 340, "--ivd-lw"], hudW: [120, 440, 230, "--ivd-hw"], rightW: [280, 600, 380, "--ivd-rw"] }, setW = (k, v) => { const [a, b, d, cv] = CL[k]; S[k] = Math.round(Math.max(a, Math.min(b, +v || d))); root.style.setProperty(cv, S[k] + "px"); };
    for (const k of Object.keys(CL)) setW(k, S[k]);
    /* the map's orb tabs (the same list), over the primary: click = primary, ⌘ click = a support slot, drag onto any slot (0.9.5) */
    const orbs = (this.plugin.store.get("iv-tabs") || []).filter(t => t && this.file(t.path));
    if (orbs.length) { const ob = root.createDiv({ cls: "ivd-orbs" }); for (const t of orbs) { const o = ob.createEl("button", { cls: "ivd-orb" + (t.path === P ? " on" : ""), attr: { type: "button", draggable: "true", "aria-label": this.title(t.path) } });
        const nd = this.G && this.G.idx.get(t.path); o.dataset.l = String(nd ? nd.level : 2); o.onclick = e => { if (e.metaKey || e.ctrlKey) this.openSupport(t.path); else this.openPrimary(t.path); };
        o.addEventListener("dragstart", e => { e.dataTransfer.setData("text/ivd-path", t.path); root.addClass("ivd-dragging"); }); o.addEventListener("dragend", () => root.removeClass("ivd-dragging"));
        o.addEventListener("mouseenter", e => { this.hovPath = t.path; this.hovEl = o; if (e.metaKey || e.ctrlKey) this.showPv(t.path, o); }); o.addEventListener("mouseleave", () => { if (this.hovEl === o) { this.hovPath = null; this.hovEl = null; } }); } }
    /* a narrow window: the left column folds into two edge tabs, and opens over the primary when one is clicked (0.9.5) */
    { const et = root.createDiv({ cls: "ivd-etabs" }); for (const [t, k] of [["PREVIOUS", "prev"], ["SIDEKICK", "side"]]) { const b = et.createEl("button", { cls: "ivd-etab ivd-etab-" + k, text: t, attr: { type: "button" } }); b.onclick = () => { root.toggleClass("ivd-leftopen", !root.hasClass("ivd-leftopen")); this.onResize(); }; } }
    const L = root.createDiv({ cls: "ivd-left" }), M = root.createDiv({ cls: "ivd-mid" }), H = root.createDiv({ cls: "ivd-hud" }), R = root.createDiv({ cls: "ivd-right" });
    /* left: the previous primary (read-only, click to swap back) and the pinned sidekick */
    const pv = this.card(L, "ivd-prev", "PREVIOUS", S.prev, "prev", { readOnly: true, empty: "The note you were on shows here" });
    if (S.prev) pv.onclick = () => { this.setSlot("p", S.prev); this.save(); this.render(); };
    this.card(L, "ivd-side", "SIDEKICK", S.side, "side", { strip: this.optD("strip-side", false), nav: this.navBtns("side"), btns: S.side ? [this.drawerBtn("side"), ["pin-off", "Unpin the sidekick", () => { this.setSlot("side", null); this.save(); this.render(); }]] : [], drawer: true, empty: "Pin a note here: a map of content, usually", drop: p => { this.setSlot("side", p); this.save(); this.render(); } }); if (S.side) keep("side");
    /* middle: the primary note */
    this.card(M, "ivd-primary", "PRIMARY", P, "p", { strip: this.optD("strip-p", true), nav: this.navBtns("p"), btns: P ? [["pin", "Pin as the sidekick", () => { this.setSlot("side", P); this.save(); this.render(); }]] : [], drop: p => this.openPrimary(p) }); if (P) keep("p");
    /* its recents and links, straight, right beside it */
    { const Hi = H.createDiv({ cls: "ivd-hudin" }); this.hudEl = Hi; this.hud(Hi, P, false); }   /* content inside, so a refresh keeps the grip on H */
    /* right: two support slots; the focused one is taller */
    for (const i of [0, 1]) { const p_ = S.sup[i], c = this.card(R, "ivd-sup" + (S.focus === i ? " ivd-focus" : ""), "SUPPORT", p_, "s" + i,
        { strip: this.optD("strip-s", false), nav: this.navBtns("s" + i), btns: p_ ? [this.drawerBtn("s" + i), ["x", "Close", () => { this.setSlot("s" + i, null); this.save(); this.render(); }]] : [], drawer: true, drop: p => this.openSupport(p, i) });
      if (p_) keep("s" + i); c.addEventListener("pointerdown", () => { if (S.focus !== i) { S.focus = i; this.save(); R.querySelectorAll(".ivd-sup").forEach((el, j) => el.toggleClass("ivd-focus", j === i)); window.setTimeout(() => this.onResize(), 260); } }, true); }
    /* every column can be made wider or narrower within limits (0.9.2 the sidekick; 0.9.3 all of them, Nick): a grip on the left column's right edge, and on the left edges of the HUD and the supports */
    const grip = (host, k, side, sign) => { const g = host.createDiv({ cls: "ivd-grip ivd-grip-" + side, attr: { "aria-label": "Drag to resize" } });
      g.addEventListener("pointerdown", e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const x0 = e.clientX, w0 = S[k]; root.addClass("ivd-resizing");
        const mv = ev => { setW(k, w0 + sign * (ev.clientX - x0)); this.onResize(); };
        const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); root.removeClass("ivd-resizing"); this.save(); };
        g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); }); };
    grip(L, "leftW", "r", 1); grip(H, "hudW", "l", -1); grip(R, "rightW", "l", -1);
    for (const k of Object.keys(this.eds)) if (!want.has(k)) this.dropEditor(k);
    for (const [k, el] of Object.entries(this.drawerEls)) { const b = el.parentElement.querySelector('.ivd-ib[aria-label="Links drawer"]'); if (b) b.toggleClass("on", !!S.drawers[k]); }
    window.setTimeout(() => this.onResize(), 50); }
}

export function registerDeck(plugin) {
  plugin.registerView(DECK_TYPE, leaf => new DeckView(leaf, plugin));
  const active = () => { const f = plugin.app.workspace.getActiveFile(); return f && f.extension === "md" ? f.path : null; };
  plugin.addCommand({ id: "open-deck", name: "Open the Deck", callback: async () => { const W = plugin.app.workspace;
    let leaf = W.getLeavesOfType(DECK_TYPE).find(l => l.view instanceof DeckView && !l.view.st.mini);
    if (!leaf) { const p = active(); leaf = W.getLeaf("tab"); await leaf.setViewState({ type: DECK_TYPE, active: true, state: { mini: false, primary: p } }); }
    await W.revealLeaf(leaf); } });
  plugin.addCommand({ id: "pop-out-deck-mini", name: "Pop out Deck Mini", callback: async () => { const W = plugin.app.workspace, p = active();
    const leaf = typeof W.openPopoutLeaf === "function" ? W.openPopoutLeaf({ size: { width: 560, height: 900 } }) : W.getLeaf("window");
    await leaf.setViewState({ type: DECK_TYPE, active: true, state: { mini: true, primary: p, drawerMain: true } }); } });
  plugin.addCommand({ id: "deck-show-active", name: "Deck: show the active note as the primary", checkCallback: checking => { const p = active(); const ds = plugin.app.workspace.getLeavesOfType(DECK_TYPE).map(l => l.view).filter(v => v instanceof DeckView);
    if (!p || !ds.length) return false; if (!checking) for (const v of ds) v.openPrimary(p); return true; } });
}
