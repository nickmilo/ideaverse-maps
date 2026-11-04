import { BaseQ, NeedThis, Unsupported } from "./baseq.js";
import { Component, FuzzySuggestModal, ItemView, MarkdownRenderer, MarkdownView, Notice, TFile, TFolder, normalizePath } from "obsidian";

/** Pick a folder in the vault, or type a new one (resolves null if closed without choosing). */
const SAVED_NAME = "Maps of the Ideaverse - saved views.json";

// Arena (0.8.41): pick a note for an empty slot, from the notes on the map
class NotePicker extends FuzzySuggestModal {
  constructor(app, items, done, ph) { super(app); this.items = items; this.done = done; this.picked = false;
    this.setPlaceholder(ph || "Put a note in this slot"); this.setInstructions([{ command: "↵", purpose: "choose" }, { command: "esc", purpose: "cancel" }]); }
  getItems() { return this.items; }
  getItemText(it) { return it.title; }
  onChooseItem(it) { this.picked = true; this.done(it.path); }
  onClose() { super.onClose(); window.setTimeout(() => { if (!this.picked) this.done(null); }, 0); }
}
class FolderPicker extends FuzzySuggestModal {
  constructor(app, done, ph, noNote) {
    super(app); this.done = done; this.picked = false; this.noNote = !!noNote;
    this.setPlaceholder(ph || "Where should saved views and tours live? Pick a folder or type a new one");
    this.setInstructions([{ command: "↵", purpose: "choose" }, { command: "esc", purpose: "cancel" }]);
  }
  onOpen() { super.onOpen(); if (this.noNote) return;
    const note = createDiv({ cls: "ivm-pick-note", text: "You can change this later in Settings → Maps of the Ideaverse → Saved views and tours." });
    const box = this.inputEl.closest(".prompt-input-container") || this.inputEl.parentElement; box.after(note); }
  getItems() { return this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder); }
  getItemText(f) { return f.create ? `+ New folder: ${f.create}` : f.isRoot() ? "/ (vault root)" : f.path; }
  getSuggestions(query) {
    const res = super.getSuggestions(query), q = normalizePath(query.trim()).replace(/^\/+|\/+$/g, "");
    if (q && q !== "/" && !(this.app.vault.getAbstractFileByPath(q) instanceof TFolder)) res.push({ item: { create: q }, match: { score: 0, matches: [] } });
    return res;
  }
  onChooseItem(f) { this.picked = true; this.done(f.create ? f.create : f.isRoot() ? "/" : f.path); }
  onClose() { super.onClose(); window.setTimeout(() => { if (!this.picked) this.done(null); }, 0); }
}
import { UI, buildUI } from "./ui.js";
import { mountMap } from "./mapApp.js";
import { PLANET_IMG } from "./planet.js";
import { CREATOR_IMG } from "./creator.js";

export const VIEW_TYPE = "ideaverse-maps";

export class MapView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.map = null;
    this.noteLeaf = null;   // where notes open from the map: one tab beside it, reused
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Maps of the Ideaverse"; }
  getIcon() { return "orbit"; }

  async onOpen() { await this.reload(); }
  async onClose() { this.unmount(); }

  unmount() {
    if (this.map) { this.map.destroy(); this.map = null; }
    if (this.mapEvents) { this.removeChild(this.mapEvents); this.mapEvents = null; }   // drops the map's window and document listeners
    this.contentEl.empty();
  }

  async reload() {
    this.unmount();
    this.map = await mountInto(this, this.contentEl, { isActive: () => this.app.workspace.getActiveViewOfType(MapView) === this, openNote: (p, t, b) => this.openNote(p, t, b) });
  }

  showStale(c) { const b = this.staleBtn; if (!b) return; b.hidden = false; const t = `${c || "Some"} notes changed · rescan`; b.setAttribute("aria-label", t); b.title = t; const n = b.querySelector(".tbadge"); if (n) n.setText(String(c || "")); }

  /** Where the saved views and tours file lives (null until a folder is picked). */
  savedPath() {
    const dir = this.plugin.settings.viewsFolder; if (!dir) return null;
    const d = dir === "/" ? "" : normalizePath(dir);
    return normalizePath(d ? `${d}/${SAVED_NAME}` : SAVED_NAME);
  }

  openNote(path, newTab, background) { this.noteLeaf = openBeside(this.app, this.leaf, this.noteLeaf, path, newTab, background); }
}

/** Open a note from the map: in one note pane beside it, reused (a new tab when asked). Returns the pane used. */
export function openBeside(app, ownLeaf, noteLeaf, path, newTab, background) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return noteLeaf;
  const ws = app.workspace, notes = ws.getLeavesOfType("markdown");
  // a note pane beside the map: one you can see (a note in a tab hidden behind another tab doesn't count), not in the map's own tab group
  const shown = l => { const el = l.view && l.view.containerEl; return !!el && el.isConnected && el.offsetParent !== null; };
  const beside = l => l !== ownLeaf && (!ownLeaf || l.parent !== ownLeaf.parent) && shown(l);
  let leaf = notes.includes(noteLeaf) && beside(noteLeaf) ? noteLeaf : notes.find(beside);
  if (newTab) leaf = ws.getLeftLeaf(false) || ws.getLeaf("tab");   // ⌘-click: a new tab in the left sidebar, so the map stays in view
  else if (!leaf) leaf = ws.getLeaf("split", "vertical");
  if (background && leaf.view && leaf.view.file === file) return newTab ? noteLeaf : leaf;   // already showing it
  void leaf.openFile(file, background ? { active: false } : undefined);   // in the background the map keeps focus
  if (!background) void ws.revealLeaf(leaf);
  return newTab ? noteLeaf : leaf;
}

/** Scan (or reuse the scan), then mount a map into el. owner: the MapView or Bases view that hosts it (a Component with app, plugin). */
export async function mountInto(owner, el, opts) {
  const app = owner.app, plugin = owner.plugin;
  el.empty(); el.addClass("ivm-host");
  const wait = el.createDiv({ cls: "ivm-loading" });
  wait.createDiv({ cls: "ivm-loading-t", text: "Mapping your notes…" });
  const bar = wait.createDiv({ cls: "ivm-loading-bar" }).createDiv();
  const msg = wait.createDiv({ cls: "ivm-loading-m" });
  let graph;
  try {
    graph = await plugin.getGraph((done, total) => { bar.setCssProps({ "--p": String(done / Math.max(1, total)) }); msg.setText(`${done.toLocaleString()} of ${total.toLocaleString()} notes read`); });
  } catch (e) {
    console.error("Maps of the Ideaverse: scan failed", e);
    wait.empty(); wait.createDiv({ cls: "ivm-loading-t", text: "The scan failed. See the developer console for details." });
    return null;
  }
  wait.remove();
  if (!graph.nodes.length) { el.createDiv({ cls: "ivm-loading" }).createDiv({ cls: "ivm-loading-t", text: "No notes to map yet." }); return null; }
  // the map's data is changed in place by the map (levels during the time-lapse), so each view gets its own copy
  const D = structuredClone(graph);
  let cardLinkCb = null;   // Edit mode: where a link clicked in a card goes (set by the map)
  el.addClass("ivm-host"); const root = el.createDiv({ cls: "ivm" });
  buildUI(root, UI);
  const stale = root.querySelector("header").createEl("button", { cls: "chip ivm-stale", text: "↻ Notes changed · rescan" });
  stale.hidden = !plugin.dirty; stale.dataset.count = String(plugin.changed ? plugin.changed.size : 0);
  stale.addEventListener("click", () => { void plugin.rescan(); });
  owner.staleBtn = stale;
  if (owner.mapEvents) owner.removeChild(owner.mapEvents);
  const events = owner.mapEvents = owner.addChild(new Component());
  const savedPath = () => {
    const dir = plugin.settings.viewsFolder; if (!dir) return null;
    const d = dir === "/" ? "" : normalizePath(dir);
    return normalizePath(d ? `${d}/${SAVED_NAME}` : SAVED_NAME); };
  const map = mountMap(root, D, {
    store: opts.store || plugin.store,
    embed: !!opts.embed,
    isActive: opts.isActive,
    registerDomEvent: (target, type, fn, o) => events.registerDomEvent(target, type, fn, o),
    openNote: opts.openNote,
    // saved views and tours live in one JSON file, in a folder the user picks before the first save
    // PKM Planet's map art: a full-size image from the vault if one is set in Settings, otherwise the small built-in one
    creatorSrc: () => { const v = plugin.settings.creatorImage; if (v) { const f = app.vault.getAbstractFileByPath(normalizePath(v)); if (f instanceof TFile) return {src: app.vault.getResourcePath(f), disc: false}; } return {src: CREATOR_IMG, disc: true}; },
    planetSrc: () => { const v = plugin.settings.planetImage; if (v) { const f = app.vault.getAbstractFileByPath(normalizePath(v)); if (f instanceof TFile) return app.vault.getResourcePath(f); } return PLANET_IMG; },
    // Posters: a note's properties, and a picture a note links to (wikilink or vault path)
    readText: async (path) => { const f = app.vault.getAbstractFileByPath(path); return f instanceof TFile ? app.vault.cachedRead(f) : null; },   // Linear Calendar reads the year's theme from its Preview note
    frontmatter: (path) => { const f = app.vault.getAbstractFileByPath(path); return f instanceof TFile ? (app.metadataCache.getFileCache(f)?.frontmatter || null) : null; },
    resource: (link, from) => { if (!link) return null; const f = app.metadataCache.getFirstLinkpathDest(link, from || "") || app.vault.getAbstractFileByPath(normalizePath(link)); return f instanceof TFile ? app.vault.getResourcePath(f) : null; },
    // Show the way home: the note it heads for by default (Settings), if one is set
    wayHome: () => plugin.settings.wayHome || (plugin.settings.homeNotes || [])[0] || "",
    // filter by a base's view: every base in the vault with its views, and the notes a view holds (read from the .base file; see baseq.js)
    baseList: async () => { const q = plugin.baseQ || (plugin.baseQ = new BaseQ(app)); const list = q.listBases();
      for (const b of list) { const r = await q.readBase(b.path); b.err = r ? r.err || null : "the file"; b.views = r ? r.views.map(v => ({ name: v.name, type: v.type, err: v.err, ctx: v.ctx })) : []; } return list; },
    baseNotes: async (path, viewName, thisPath) => { const q = plugin.baseQ || (plugin.baseQ = new BaseQ(app)); q.back = null; const r = await q.readBase(path); if (!r) return { err: "the base is gone" };
      const v = r.views.find(x => x.name === viewName); if (!v) return { err: "the view is gone" }; if (v.err) return { err: v.err };
      try { return { paths: [...q.run(v, thisPath || null)] }; } catch (e) { if (e instanceof NeedThis) return { need: "this" }; if (e instanceof Unsupported) { v.err = e.what; return { err: e.what }; } console.warn("Maps of the Ideaverse: couldn't read the base", path, e); return { err: String(e && e.message || e) }; } },
    // emoji labels: one column of a base (by default the ✨ column of a base called Recents), read for every note
    emojis: async () => { const q = plugin.baseQ || (plugin.baseQ = new BaseQ(app)); const st = plugin.settings; let path = st.emojiBase || "";
      if (!path) { const f = app.vault.getFiles().find(x => x.extension === "base" && x.basename.toLowerCase() === "recents"); path = f ? f.path : ""; }
      if (!path) return { err: "Pick a base for emoji labels in Settings" };
      try { const r = await q.column(path, st.emojiCol || ""); return r.err ? { err: r.err, path } : { map: r.map, path, col: r.col }; } catch (e) { return { err: String(e && e.message || e), path }; } },
    // the views file's folder is a plugin setting, which another device may not have (plugin settings sync separately from files, Nick's phone 0.8.1):
    // with no folder set, adopt the folder of a views file already in the vault (the newest, if there are several)
    savedFolder: () => { const st = plugin.settings; if (!st.viewsFolder) { const fs = app.vault.getFiles().filter(f => f.name === SAVED_NAME).sort((a, b) => b.stat.mtime - a.stat.mtime);
        if (fs.length) { st.viewsFolder = fs[0].parent && fs[0].parent.path !== "/" ? fs[0].parent.path : "/"; void plugin.saveSettings(); } }
      return st.viewsFolder || null; },
    // the file changing under us (a sync from another device, or an edit): hand its text over, skipping our own writes
    onSavedChange: cb => { const h = async f => { if (!(f instanceof TFile) || f.name !== SAVED_NAME) return; if (!plugin.settings.viewsFolder) { plugin.settings.viewsFolder = f.parent && f.parent.path !== "/" ? f.parent.path : "/"; await plugin.saveSettings(); }
        if (f.path !== savedPath()) return; const t = await app.vault.read(f); if (t === plugin.lastSavedText) return; cb(t); };
      events.registerEvent(app.vault.on("modify", h)); events.registerEvent(app.vault.on("create", h)); },
    pickSavedFolder: async () => {
      const dir = await new Promise(res => new FolderPicker(app, res).open());
      if (!dir) return null;
      plugin.settings.viewsFolder = dir; await plugin.saveSettings(); return dir; },
    readSaved: async () => { const f = app.vault.getAbstractFileByPath(savedPath()); return f instanceof TFile ? await app.vault.read(f) : null; },
    writeSaved: async text => { if (opts.embed) return null;   // a map embedded in a note reads the views file, never writes it
      const path = savedPath(); if (!path) return null;
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir);
      const f = app.vault.getAbstractFileByPath(path);
      plugin.lastSavedText = text; if (f instanceof TFile) await app.vault.process(f, () => text); else await app.vault.create(path, text);
      return path; },
    // Capture: a picture or clip saved where the vault keeps attachments (Settings → Files and links), then opened on request
    saveCapture: async (name, buf) => {
      const path = await app.fileManager.getAvailablePathForAttachment(name, (app.workspace.getActiveFile() || {}).path || "");
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir);
      await app.vault.createBinary(path, buf); return path; },
    openFile: path => { const f = app.vault.getAbstractFileByPath(path); if (f instanceof TFile) void app.workspace.getLeaf("tab").openFile(f); },
    // Edit mode (experimental): a real Obsidian editor (Live Preview, links, other plugins) in the map's card. The leaf lives in a split of
    // our own that isn't part of the workspace layout, so it's never saved there (the technique the Hover Editor plugin uses)
    onCardLink: cb => { cardLinkCb = cb; },
    editCard: () => {
      const W = app.workspace, Split = W.rootSplit.constructor, split = new Split(W, "vertical");
      split.getRoot = () => W.rootSplit; split.getContainer = () => W.rootSplit;
      let leaf = null;
      // a link clicked in the card stays on the map (Obsidian would open it in a tab): the map picks that note, and ⌘-click makes it the support note
      if (!plugin.linkPatched) { plugin.linkPatched = true; const W0 = app.workspace, orig = W0.openLinkText;
        W0.openLinkText = function (linktext, sourcePath, newLeaf, ...rest) { const cd = plugin.cardDown;
          if (cd && performance.now() - cd.t < 1500 && cd.el.isConnected) { plugin.cardDown = null;
            const f = app.metadataCache.getFirstLinkpathDest(String(linktext).split("#")[0].split("|")[0], sourcePath || "");
            if (f instanceof TFile && cd.cb(f.path, newLeaf ? "side" : cd.shift ? "tab" : "plain")) return Promise.resolve(); }
          return orig.call(this, linktext, sourcePath, newLeaf, ...rest); };
        plugin.register(() => { W0.openLinkText = orig; }); }
      split.containerEl.addEventListener("pointerdown", e => { if (cardLinkCb) plugin.cardDown = { t: performance.now(), el: split.containerEl, cb: cardLinkCb, shift: e.shiftKey }; }, true);
      // Shift-click on a link (0.8.28): a new tab in the map. The editor would only extend its selection, so the click is taken here
      const linkAt = e => { const t = e.target instanceof Element ? e.target : null; if (!t || !leaf || !(leaf.view instanceof MarkdownView)) return null;
        const a = t.closest("[data-href]"); if (a) return a.getAttribute("data-href");
        const s = t.closest(".cm-hmd-internal-link"); if (!s) return null; const cm = leaf.view.editor && leaf.view.editor.cm, f = leaf.view.file; if (!cm || !f) return null;
        let pos; try { pos = cm.posAtDOM(s); } catch (_) { return null; } const c = app.metadataCache.getFileCache(f);
        const l = c && (c.links || []).find(x => x.position.start.offset <= pos && pos <= x.position.end.offset); return l ? l.link : null; };
      for (const ty of ["mousedown", "click"]) split.containerEl.addEventListener(ty, e => { if (!e.shiftKey || !cardLinkCb || e.metaKey || e.ctrlKey) return; const l = linkAt(e); if (!l) return;
        e.preventDefault(); e.stopPropagation(); if (ty !== "click") return; const sp = leaf.view.file ? leaf.view.file.path : "";
        const f = app.metadataCache.getFirstLinkpathDest(String(l).split("#")[0].split("|")[0], sp); if (f instanceof TFile) cardLinkCb(f.path, "tab"); }, true);
      return { el: split.containerEl,
        open: async path => { const f = app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return false;
          if (!leaf) leaf = W.createLeafInParent(split, 0);
          await leaf.openFile(f, { state: { mode: "source", source: false }, active: false }); return true; },
        resize: () => { if (leaf && leaf.view && typeof leaf.view.onResize === "function") leaf.view.onResize(); },
        focus: () => { const ed = leaf && leaf.view && leaf.view.editor; if (ed) ed.focus(); },   // straight to the editor: our leaf has no tab group, so it can't be the workspace's active leaf
        close: () => { if (leaf) { leaf.detach(); leaf = null; } split.containerEl.remove(); } }; },
    // a read-only preview of a note (Starfield's hub previews): its text without the properties, the start of it, rendered as Obsidian would
    preview: async (path, el) => { const f = app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return;
      const txt = (await app.vault.cachedRead(f)).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
        .replace(/^([ \t>]*)(```|~~~)[^\n]*\n[\s\S]*?^\1\2[^\n]*$/gm, "").replace(/!\[\[[^\]\n]*?\.base(?:[#|][^\]\n]*)?\]\]/g, "")
        .replace(/^>[ \t]*\[![^\]]+\][+-]?[^\n]*\n(?:>[ \t]*(?:\n|$))*(?=[^>]|$)/gm, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1200);   // also inside callouts (0.8.179: a dataview list in a callout still rendered), and a callout left empty goes with it   // a preview opens on words: embedded bases, queries and code blocks are left out (they ran full queries in every small preview, 0.8.178)
      await MarkdownRenderer.render(app, txt, el, path, events); },
    // the map reacting as you write (0.8.23): when Obsidian has re-read a note's links, hand the map that note's links, resolved, each with its kind
    // (0 in the text, 1 up, 4 related, 5 any other property; collections are left to a rescan)
    // a link dragged onto a note's dot (0.8.185): into its related (or up) property, as a quoted [[link]], once
    addLink: async (targetPath, linkPath, kind) => { const t = app.vault.getAbstractFileByPath(targetPath), l = app.vault.getAbstractFileByPath(linkPath); if (!(t instanceof TFile) || !(l instanceof TFile)) return false;
      const st = plugin.settings, names = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean), key = (kind === "up" ? names(st.upProps)[0] : names(st.relatedProps)[0]) || kind;
      const link = `[[${app.metadataCache.fileToLinktext(l, t.path, true)}]]`, base = s_ => String(s_).replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
      let dup = false; await app.fileManager.processFrontMatter(t, fm => { const k = Object.keys(fm).find(x => x.toLowerCase() === key.toLowerCase()) || key; const cur = fm[k] == null || fm[k] === "" ? [] : Array.isArray(fm[k]) ? fm[k] : [fm[k]];
        if (cur.some(x => base(x) === base(link))) { dup = true; return; } fm[k] = [...cur, link]; }); return dup ? "dup" : true; },
    // the folder in the editor strip, clicked (0.8.188, Nick): move the note to another folder, the way Obsidian's "Move file to…" does
    moveNote: async path => { const f = app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile)) return false;
      const dir = await new Promise(res => new FolderPicker(app, res, `Move "${f.basename}" to…`, true).open()); if (!dir) return false;
      const d = dir === "/" ? "" : normalizePath(dir); if (d && !app.vault.getAbstractFileByPath(d)) await app.vault.createFolder(d);
      const to = normalizePath(d ? `${d}/${f.name}` : f.name); if (to === f.path) return false; if (app.vault.getAbstractFileByPath(to)) { new Notice(`There's already a ${f.name} in ${d || "the vault root"}.`); return false; }
      await app.fileManager.renameFile(f, to); return true; },
    onMove: cb => { events.registerEvent(app.vault.on("rename", (f, old) => { if (f instanceof TFile && f.extension === "md" && old) cb(old, f.path); })); },   // a note moved or renamed: the map moves it live
    onLinks: cb => { const st = plugin.settings, nm = (v, d) => (Array.isArray(v) ? v : String(v || d).split(",")).map(x => String(x).trim().toLowerCase()).filter(Boolean);
      events.registerEvent(app.metadataCache.on("changed", (f, _data, c) => { if (!(f instanceof TFile) || !c) return;
        const UP = nm(st.upProps, "up"), RL = nm(st.relatedProps, "related"), CL = nm(st.collectionProps, "collections"), L = [];
        const res = l => { const t = app.metadataCache.getFirstLinkpathDest(String(l).split("#")[0].split("|")[0], f.path); return t instanceof TFile && t.extension === "md" ? t.path : null; };
        for (const l of [...(c.links || []), ...(c.embeds || [])]) { const q = res(l.link); if (q) L.push([q, 0]); }
        for (const l of c.frontmatterLinks || []) { const k = String(l.key || "").split(".")[0].toLowerCase(); if (CL.includes(k)) continue; const q = res(l.link); if (q) L.push([q, UP.includes(k) ? 1 : RL.includes(k) ? 4 : 5]); }
        cb(f.path, L); })); },
    pickNote: (items, ph) => new Promise(res => new NotePicker(app, items, res, ph).open()),
    activePath: () => { const f = app.workspace.getActiveFile(); return f ? f.path : null; },
    debug: (owner.debug = {}),
  });
  if (!owner.fileHooked) { owner.fileHooked = true; owner.registerEvent(app.workspace.on("file-open", file => { if (owner.map && file) owner.map.follow(file.path); })); }
  if (!owner.cssHooked) { owner.cssHooked = true; owner.registerEvent(app.workspace.on("css-change", () => { if (owner.map) owner.map.themeChanged(); })); }
  return map;
}
