import { Component, FuzzySuggestModal, ItemView, TFile, TFolder, normalizePath } from "obsidian";

/** Pick a folder in the vault, or type a new one (resolves null if closed without choosing). */
const SAVED_NAME = "Maps of the Ideaverse - saved views.json";

class FolderPicker extends FuzzySuggestModal {
  constructor(app, done) {
    super(app); this.done = done; this.picked = false;
    this.setPlaceholder("Where should saved views and tours live? Pick a folder or type a new one");
    this.setInstructions([{ command: "↵", purpose: "choose" }, { command: "esc", purpose: "cancel" }]);
  }
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
    const el = this.contentEl;
    el.addClass("ivm-host");
    const wait = el.createDiv({ cls: "ivm-loading" });
    wait.createDiv({ cls: "ivm-loading-t", text: "Mapping your notes…" });
    const bar = wait.createDiv({ cls: "ivm-loading-bar" }).createDiv();
    const msg = wait.createDiv({ cls: "ivm-loading-m" });
    let graph;
    try {
      graph = await this.plugin.getGraph((done, total) => { bar.setCssProps({ "--p": String(done / Math.max(1, total)) }); msg.setText(`${done.toLocaleString()} of ${total.toLocaleString()} notes read`); });
    } catch (e) {
      console.error("Maps of the Ideaverse: scan failed", e);
      wait.empty(); wait.createDiv({ cls: "ivm-loading-t", text: "The scan failed. See the developer console for details." });
      return;
    }
    wait.remove();
    if (!graph.nodes.length) { el.createDiv({ cls: "ivm-loading" }).createDiv({ cls: "ivm-loading-t", text: "No notes to map yet." }); return; }
    // the map's data is changed in place by the map (levels during the time-lapse), so each view gets its own copy
    const D = structuredClone(graph);
    const root = el.createDiv({ cls: "ivm" });
    buildUI(root, UI);
    const stale = root.querySelector("header").createEl("button", { cls: "chip ivm-stale", text: "↻ Notes changed · rescan" });
    stale.hidden = !this.plugin.dirty;
    stale.addEventListener("click", () => { void this.plugin.rescan(); });
    this.staleBtn = stale;
    const events = this.mapEvents = this.addChild(new Component());
    this.map = mountMap(root, D, {
      store: this.plugin.store,
      isActive: () => this.app.workspace.getActiveViewOfType(MapView) === this,
      registerDomEvent: (target, type, fn, opts) => events.registerDomEvent(target, type, fn, opts),
      openNote: (path, newTab, background) => this.openNote(path, newTab, background),
      // saved views and tours live in one JSON file, in a folder the user picks before the first save
      // PKM Planet's map art: a full-size image from the vault if one is set in Settings, otherwise the small built-in one
      creatorSrc: () => { const v = this.plugin.settings.creatorImage; if (v) { const f = this.app.vault.getAbstractFileByPath(normalizePath(v)); if (f instanceof TFile) return {src: this.app.vault.getResourcePath(f), disc: false}; } return {src: CREATOR_IMG, disc: true}; },
      planetSrc: () => { const v = this.plugin.settings.planetImage; if (v) { const f = this.app.vault.getAbstractFileByPath(normalizePath(v)); if (f instanceof TFile) return this.app.vault.getResourcePath(f); } return PLANET_IMG; },
      savedFolder: () => this.plugin.settings.viewsFolder || null,
      pickSavedFolder: async () => {
        const dir = await new Promise(res => new FolderPicker(this.app, res).open());
        if (!dir) return null;
        this.plugin.settings.viewsFolder = dir; await this.plugin.saveSettings(); return dir; },
      readSaved: async () => { const f = this.app.vault.getAbstractFileByPath(this.savedPath()); return f instanceof TFile ? await this.app.vault.read(f) : null; },
      writeSaved: async text => {
        const path = this.savedPath(); if (!path) return null;
        const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        const f = this.app.vault.getAbstractFileByPath(path);
        if (f instanceof TFile) await this.app.vault.process(f, () => text); else await this.app.vault.create(path, text);
        return path; },
      activePath: () => { const f = this.app.workspace.getActiveFile(); return f ? f.path : null; },
      debug: (this.debug = {}),
    });
    if (!this.fileHooked) { this.fileHooked = true; this.registerEvent(this.app.workspace.on("file-open", file => { if (this.map && file) this.map.follow(file.path); })); }
    if (!this.cssHooked) { this.cssHooked = true; this.registerEvent(this.app.workspace.on("css-change", () => { if (this.map) this.map.themeChanged(); })); }
  }

  showStale() { if (this.staleBtn) this.staleBtn.hidden = false; }

  /** Where the saved views and tours file lives (null until a folder is picked). */
  savedPath() {
    const dir = this.plugin.settings.viewsFolder; if (!dir) return null;
    const d = dir === "/" ? "" : normalizePath(dir);
    return normalizePath(d ? `${d}/${SAVED_NAME}` : SAVED_NAME);
  }

  openNote(path, newTab, background) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const ws = this.app.workspace;
    const notes = ws.getLeavesOfType("markdown");
    let leaf = notes.includes(this.noteLeaf) ? this.noteLeaf : notes.find(l => l.parent !== this.leaf.parent);   // a note pane beside the map
    if (newTab) leaf = ws.getLeaf("tab");
    else if (!leaf) leaf = ws.getLeaf("split", "vertical");
    if (!newTab) this.noteLeaf = leaf;
    if (background && leaf.view && leaf.view.file === file) return;   // already showing it
    void leaf.openFile(file, background ? { active: false } : undefined);   // in the background the map keeps focus
  }
}
