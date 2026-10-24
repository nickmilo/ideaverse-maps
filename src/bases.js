import * as obsidian from "obsidian";
import { mountInto, openBeside } from "./view.js";

/* Maps of the Ideaverse as a Bases view: the map, showing only the notes the base's query returns.
   Levels and scores still come from the whole vault, so a hub stays a hub inside a project. Needs Obsidian 1.10+. */
export const BASES_VIEW = "ideaverse-map";

const makeView = BasesView => class MapBasesView extends BasesView {
  constructor(controller, containerEl, plugin) {
    super(controller);
    this.type = BASES_VIEW;
    this.plugin = plugin;
    this.hostEl = containerEl.createDiv({ cls: "ivm-bases" });
    this.map = null; this.noteLeaf = null; this.mounting = null; this.paths = null;
  }
  onload() { this.mounting = this.mount(); }
  onunload() { if (this.map) { this.map.destroy(); this.map = null; } this.hostEl.empty(); }
  async mount() {
    this.map = await mountInto(this, this.hostEl, {
      isActive: () => this.hostEl.isConnected && this.hostEl.contains(document.activeElement || null),
      openNote: (p, t, b) => { this.noteLeaf = openBeside(this.app, null, this.noteLeaf, p, t, b); },
    });
    if (this.map) this.map.setScope(this.paths || this.currentPaths());
  }
  currentPaths() { const d = this.data, rows = d && Array.isArray(d.data) ? d.data : []; return rows.map(e => e && e.file && e.file.path).filter(Boolean); }
  onDataUpdated() { this.paths = this.currentPaths(); if (this.map) this.map.setScope(this.paths); }
  /** Called by the plugin after a rescan. */
  async reload() { if (this.map) { this.map.destroy(); this.map = null; } await this.mount(); }
  showStale() { if (this.staleBtn) this.staleBtn.hidden = false; }
};

export function registerBases(plugin) {
  if (typeof plugin.registerBasesView !== "function" || !obsidian.BasesView) return false;   // Obsidian before 1.10
  const MapBasesView = makeView(obsidian.BasesView), views = plugin.basesViews = new Set();
  return plugin.registerBasesView(BASES_VIEW, {
    name: "Maps of the Ideaverse", icon: "orbit",
    factory: (controller, containerEl) => { const v = new MapBasesView(controller, containerEl, plugin); views.add(v); v.register(() => views.delete(v)); return v; },
  });
}
