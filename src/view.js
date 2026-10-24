import { Component, FuzzySuggestModal, ItemView, TFile, TFolder, normalizePath } from "obsidian";

/** Pick a folder in the vault, or type a new one (resolves null if closed without choosing). */
const SAVED_NAME = "Maps of the Ideaverse - saved views.json";

class FolderPicker extends FuzzySuggestModal {
  constructor(app, done) {
    super(app); this.done = done; this.picked = false;
    this.setPlaceholder("Where should saved views and tours live? Pick a folder or type a new one");
    this.setInstructions([{ command: "↵", purpose: "choose" }, { command: "esc", purpose: "cancel" }]);
  }
  onOpen() { super.onOpen();
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

  showStale() { if (this.staleBtn) this.staleBtn.hidden = false; }

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
  let leaf = notes.includes(noteLeaf) ? noteLeaf : notes.find(l => !ownLeaf || l.parent !== ownLeaf.parent);   // a note pane beside the map
  if (newTab) leaf = ws.getLeaf("tab");
  else if (!leaf) leaf = ws.getLeaf("split", "vertical");
  if (background && leaf.view && leaf.view.file === file) return newTab ? noteLeaf : leaf;   // already showing it
  void leaf.openFile(file, background ? { active: false } : undefined);   // in the background the map keeps focus
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
  const root = el.createDiv({ cls: "ivm" });
  buildUI(root, UI);
  const stale = root.querySelector("header").createEl("button", { cls: "chip ivm-stale", text: "↻ Notes changed · rescan" });
  stale.hidden = !plugin.dirty;
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
    isActive: opts.isActive,
    registerDomEvent: (target, type, fn, o) => events.registerDomEvent(target, type, fn, o),
    openNote: opts.openNote,
    // saved views and tours live in one JSON file, in a folder the user picks before the first save
    // PKM Planet's map art: a full-size image from the vault if one is set in Settings, otherwise the small built-in one
    creatorSrc: () => { const v = plugin.settings.creatorImage; if (v) { const f = app.vault.getAbstractFileByPath(normalizePath(v)); if (f instanceof TFile) return {src: app.vault.getResourcePath(f), disc: false}; } return {src: CREATOR_IMG, disc: true}; },
    planetSrc: () => { const v = plugin.settings.planetImage; if (v) { const f = app.vault.getAbstractFileByPath(normalizePath(v)); if (f instanceof TFile) return app.vault.getResourcePath(f); } return PLANET_IMG; },
    savedFolder: () => plugin.settings.viewsFolder || null,
    pickSavedFolder: async () => {
      const dir = await new Promise(res => new FolderPicker(app, res).open());
      if (!dir) return null;
      plugin.settings.viewsFolder = dir; await plugin.saveSettings(); return dir; },
    readSaved: async () => { const f = app.vault.getAbstractFileByPath(savedPath()); return f instanceof TFile ? await app.vault.read(f) : null; },
    writeSaved: async text => {
      const path = savedPath(); if (!path) return null;
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir);
      const f = app.vault.getAbstractFileByPath(path);
      if (f instanceof TFile) await app.vault.process(f, () => text); else await app.vault.create(path, text);
      return path; },
    activePath: () => { const f = app.workspace.getActiveFile(); return f ? f.path : null; },
    debug: (owner.debug = {}),
  });
  if (!owner.fileHooked) { owner.fileHooked = true; owner.registerEvent(app.workspace.on("file-open", file => { if (owner.map && file) owner.map.follow(file.path); })); }
  if (!owner.cssHooked) { owner.cssHooked = true; owner.registerEvent(app.workspace.on("css-change", () => { if (owner.map) owner.map.themeChanged(); })); }
  return map;
}
