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
    this.st = { mini: false, primary: null, prev: null, sup: [null, null], focus: 0, side: null, drawers: {}, drawerMain: true, hist: {}, leftW: 340 };
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
  linksOf(path) { const app = this.app, mc = app.metadataCache, out = new Map(), inn = new Set(), rl = mc.resolvedLinks || {};
    for (const t of Object.keys(rl[path] || {})) if (t !== path && t.endsWith(".md")) out.set(t, true);
    for (const [s, m] of Object.entries(rl)) if (s !== path && m && m[path]) inn.add(s);
    let m_ = null; for (const l of app.workspace.getLeavesOfType("ideaverse-maps")) { const mm = l.view && l.view.map; if (mm && mm.linkKind) { m_ = mm; break; } }
    const rows = []; for (const p of new Set([...out.keys(), ...inn])) { const o = out.has(p), i = inn.has(p), k = m_ ? m_.linkKind(path, p) || (i && !o ? (m_.linkKind(p, path) === "up" ? "down" : "") : "") : "";
      rows.push({ p, a: o && i ? "↔" : o ? "→" : "←", c: KIND_COL[k] || "var(--ivd-link)", w: k === "upp" ? 0 : k === "rel" ? 1 : o ? 2 : 3 }); }
    rows.sort((a, b) => a.w - b.w || this.title(a.p).localeCompare(this.title(b.p))); return rows; }
  recents(n) { return this.app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, n); }
  age(ms) { const s = (Date.now() - ms) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m" : s < 86400 ? Math.round(s / 3600) + "h" : Math.round(s / 86400) + "d"; }

  /* one row: click = primary; ⌘ click = a support slot; drag it onto a slot */
  row(box, path, a, col, right) { const r = box.createEl("button", { cls: "ivd-row", attr: { type: "button", draggable: "true" } });
    if (a) r.createSpan({ cls: "ivd-a", text: a }); const t = r.createSpan({ cls: "ivd-t", text: this.title(path) }); t.style.setProperty("--c", col || "var(--ivd-link)");
    if (right) r.createSpan({ cls: "ivd-n", text: right });
    r.onclick = e => { e.preventDefault(); if (e.metaKey || e.ctrlKey) this.openSupport(path); else this.openPrimary(path); };
    r.addEventListener("dragstart", e => { e.dataTransfer.setData("text/ivd-path", path); e.dataTransfer.effectAllowed = "copy"; this.contentEl.addClass("ivd-dragging"); });
    r.addEventListener("dragend", () => this.contentEl.removeClass("ivd-dragging")); return r; }
  hud(box, path, mini, linksOnly) { box.empty(); const rh = linksOnly ? null : box.createDiv({ cls: "ivd-h", text: "◷ RECENTS" });
    if (!linksOnly) for (const f of this.recents(mini ? 6 : 9)) this.row(box, f.path, "", f.path === path ? "var(--ivd-acc)" : "var(--ivd-recent)", this.age(f.stat.mtime));
    const ls = path ? this.linksOf(path) : []; box.createDiv({ cls: "ivd-h" + (linksOnly ? "" : " ivd-h2"), text: `⇄ LINKS · ${ls.length}` });
    for (const l of ls) this.row(box, l.p, l.a, l.c); void rh; }
  renderHud() { if (this.hudEl) this.hud(this.hudEl, this.st.primary, this.st.mini); for (const [k, el] of Object.entries(this.drawerEls || {})) if (el && !el.hidden && !el.classList.contains("ivd-main-drawer")) this.hud(el, el.dataset.path, true, true); }

  /* a note card: header (label, title, buttons), the editor, and its links drawer */
  card(parent, cls, label, path, slot, opts = {}) { const c = parent.createDiv({ cls: "ivd-card " + cls }); const hd = c.createDiv({ cls: "ivd-hd" });
    for (const [ic, tip, fn, off] of opts.nav || []) { const b = hd.createEl("button", { cls: "ivd-ib ivd-nav", attr: { type: "button", "aria-label": tip } }); setIcon(b, ic); b.disabled = !!off; b.onclick = e => { e.stopPropagation(); fn(); }; }
    hd.createSpan({ cls: "ivd-lab", text: label }); if (path && opts.readOnly) hd.createSpan({ cls: "ivd-ttl", text: this.title(path) });   /* an editor shows its own title; only Previous (no editor) names its note up here (0.9.2, Nick) */ hd.createSpan({ cls: "ivd-sp" });
    for (const [ic, tip, fn] of opts.btns || []) { const b = hd.createEl("button", { cls: "ivd-ib", attr: { type: "button", "aria-label": tip } }); setIcon(b, ic); b.onclick = e => { e.stopPropagation(); fn(b); }; }
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
    const want = new Set(); const keep = s => want.add(s);
    if (S.mini) { const pc = this.card(root, "ivd-primary", "", P, "p", { btns: [["panel-right", "Recents and links", b => { S.drawerMain = !S.drawerMain; this.save(); this.render(); void b; }]], empty: "Open a note (from any tab) and run “Deck: show the active note”" });
      keep("p"); if (S.drawerMain) { const dr = pc.createDiv({ cls: "ivd-drawer ivd-main-drawer" }); this.hudEl = dr; this.hud(dr, P, true); } else this.hudEl = null;
      for (const k of Object.keys(this.eds)) if (!want.has(k)) this.dropEditor(k); return; }
    root.style.setProperty("--ivd-lw", Math.max(240, Math.min(560, +S.leftW || 340)) + "px");
    const L = root.createDiv({ cls: "ivd-left" }), M = root.createDiv({ cls: "ivd-mid" }), H = root.createDiv({ cls: "ivd-hud" }), R = root.createDiv({ cls: "ivd-right" });
    /* left: the previous primary (read-only, click to swap back) and the pinned sidekick */
    const pv = this.card(L, "ivd-prev", "PREVIOUS", S.prev, "prev", { readOnly: true, empty: "The note you were on shows here" });
    if (S.prev) pv.onclick = () => { this.setSlot("p", S.prev); this.save(); this.render(); };
    this.card(L, "ivd-side", "SIDEKICK", S.side, "side", { nav: this.navBtns("side"), btns: S.side ? [this.drawerBtn("side"), ["pin-off", "Unpin the sidekick", () => { this.setSlot("side", null); this.save(); this.render(); }]] : [], drawer: true, empty: "Pin a note here: a map of content, usually", drop: p => { this.setSlot("side", p); this.save(); this.render(); } }); if (S.side) keep("side");
    /* middle: the primary note */
    this.card(M, "ivd-primary", "PRIMARY", P, "p", { nav: this.navBtns("p"), btns: P ? [["pin", "Pin as the sidekick", () => { this.setSlot("side", P); this.save(); this.render(); }]] : [], drop: p => this.openPrimary(p) }); if (P) keep("p");
    /* its recents and links, straight, right beside it */
    this.hudEl = H; this.hud(H, P, false);
    /* right: two support slots; the focused one is taller */
    for (const i of [0, 1]) { const p_ = S.sup[i], c = this.card(R, "ivd-sup" + (S.focus === i ? " ivd-focus" : ""), "SUPPORT", p_, "s" + i,
        { nav: this.navBtns("s" + i), btns: p_ ? [this.drawerBtn("s" + i), ["x", "Close", () => { this.setSlot("s" + i, null); this.save(); this.render(); }]] : [], drawer: true, drop: p => this.openSupport(p, i) });
      if (p_) keep("s" + i); c.addEventListener("pointerdown", () => { if (S.focus !== i) { S.focus = i; this.save(); R.querySelectorAll(".ivd-sup").forEach((el, j) => el.toggleClass("ivd-focus", j === i)); window.setTimeout(() => this.onResize(), 260); } }, true); }
    /* drag the left column's edge to make the sidekick wider (0.9.2, Nick) */
    { const g = L.createDiv({ cls: "ivd-grip", attr: { "aria-label": "Drag to resize the sidekick" } });
      g.addEventListener("pointerdown", e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const x0 = e.clientX, w0 = L.getBoundingClientRect().width;
        const mv = ev => { S.leftW = Math.round(Math.max(240, Math.min(560, w0 + ev.clientX - x0))); root.style.setProperty("--ivd-lw", S.leftW + "px"); this.onResize(); };
        const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); this.save(); };
        g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); }); }
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
