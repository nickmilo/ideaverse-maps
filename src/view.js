import { Component, ItemView, TFile } from "obsidian";
import { UI, buildUI } from "./ui.js";
import { mountMap } from "./mapApp.js";

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
      openNote: (path, newTab) => this.openNote(path, newTab),
      activePath: () => { const f = this.app.workspace.getActiveFile(); return f ? f.path : null; },
      debug: (this.debug = {}),
    });
    if (!this.fileHooked) { this.fileHooked = true; this.registerEvent(this.app.workspace.on("file-open", file => { if (this.map && file) this.map.follow(file.path); })); }
    if (!this.cssHooked) { this.cssHooked = true; this.registerEvent(this.app.workspace.on("css-change", () => { if (this.map) this.map.themeChanged(); })); }
  }

  showStale() { if (this.staleBtn) this.staleBtn.hidden = false; }

  openNote(path, newTab) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const ws = this.app.workspace;
    const notes = ws.getLeavesOfType("markdown");
    let leaf = notes.includes(this.noteLeaf) ? this.noteLeaf : notes.find(l => l.parent !== this.leaf.parent);   // a note pane beside the map
    if (newTab) leaf = ws.getLeaf("tab");
    else if (!leaf) leaf = ws.getLeaf("split", "vertical");
    if (!newTab) this.noteLeaf = leaf;
    void leaf.openFile(file);
  }
}
