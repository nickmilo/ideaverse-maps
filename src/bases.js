import * as obsidian from "obsidian";
import { mountInto, openBeside } from "./view.js";

/* Maps of the Ideaverse as a Bases view: the map, showing only the notes the base's query returns.
   Levels and scores still come from the whole vault, so a hub stays a hub inside a project. Needs Obsidian 1.10+. */
export const BASES_VIEW = "ideaverse-map";
const SHARED = new Set(["iv-packs1", "iv-tcol", "iv-pcol", "iv-acol", "iv-anim", "iv-legend", "iv-hcol", "iv-views", "iv-tours", "iv-subsoff"]);

const makeView = BasesView => class MapBasesView extends BasesView {
  constructor(controller, containerEl, plugin) {
    super(controller);
    this.type = BASES_VIEW;
    this.plugin = plugin;
    this.hostEl = containerEl.createDiv({ cls: "ivm-bases", attr: { "data-ivmv": plugin.manifest.version } });   // which version drew it, so an update can redraw older ones
    this.map = null; this.noteLeaf = null; this.mounting = null; this.paths = null;
  }
  onload() { this.mounting = this.mount(); }
  onunload() { if (this.map) { this.map.destroy(); this.map = null; } this.hostEl.empty(); }
  /** This base's own map settings (which map, theme, filters, Follow note…), kept in the .base file under "maps-of-the-ideaverse".
      Anything this base hasn't changed yet comes from the main map, so a new base view starts where you are. */
  baseStore() {
    const KEY = "maps-of-the-ideaverse", main = this.plugin.store;
    this.own = {}; let loaded = false;
    const load = () => { if (loaded || !this.config) return; loaded = true;   // the config can arrive after the view is created
      try { const v = this.config.get(KEY); if (v && typeof v === "object") this.own = Object.assign({}, v, this.own); } catch { /* keep what we have */ } };
    return {
      get: key => { load(); return Object.prototype.hasOwnProperty.call(this.own, key) ? this.own[key] : main.get(key); },
      set: (key, value) => { load();
        if (SHARED.has(key) || key.startsWith("iv-mig")) { main.set(key, value); return; }   // housekeeping and panel tucks stay with the plugin, so opening a base never edits its file
        if (JSON.stringify(value) === JSON.stringify(Object.prototype.hasOwnProperty.call(this.own, key) ? this.own[key] : main.get(key))) return;
        if (value === undefined) delete this.own[key]; else this.own[key] = value;
        window.clearTimeout(this.saveTimer);
        this.saveTimer = window.setTimeout(() => { load(); try { this.config.set(KEY, JSON.parse(JSON.stringify(this.own))); } catch (e) { console.warn("Maps of the Ideaverse: couldn't save this base's map settings", e); } }, 1000);
      },
    };
  }
  async mount() {
    this.map = await mountInto(this, this.hostEl, {
      store: this.baseStore(),
      isActive: () => this.hostEl.isConnected && this.hostEl.contains(document.activeElement || null),
      openNote: (p, t, b) => { this.noteLeaf = openBeside(this.app, null, this.noteLeaf, p, t, b); },
    });
    if (this.map) { this.map.setBaseInfo && this.map.setBaseInfo(this.baseInfo()); this.map.setScope(this.paths || this.currentPaths()); }
  }
  /** The base's own Sort and Group, so maps like Posters can follow them. */
  baseInfo() {
    const d = this.data, strip = p => String(p || "").replace(/^note\./, "");
    let sort = null; try { const s = this.config && this.config.getSort && this.config.getSort(); if (s && s[0]) sort = strip(s[0].property); } catch (e) { /* an older Obsidian without Sort or Group: nothing to follow */ }
    let groups = null, order = null;
    try { const g = d && d.groupedData; if (Array.isArray(g) && g.length > 1 || (g && g[0] && g[0].hasKey && g[0].hasKey())) { groups = new Map(); order = [];
      for (const grp of g) { const k = grp.hasKey && grp.hasKey() ? String(grp.key).replace(/^\[\[([^\]|]+)(\|[^\]]*)?\]\]$/, "$1") : "—"; order.push(k); for (const e of grp.entries || []) if (e && e.file) groups.set(e.file.path, k); } } } catch (e) { /* an older Obsidian without Sort or Group: nothing to follow */ }
    this.biv = (this.biv || 0) + 1;
    return { sort, groups, order, v: this.biv };
  }
  currentPaths() { const d = this.data, rows = d && Array.isArray(d.data) ? d.data : []; return rows.map(e => e && e.file && e.file.path).filter(Boolean); }
  onDataUpdated() { this.paths = this.currentPaths(); if (this.map) { this.map.setBaseInfo && this.map.setBaseInfo(this.baseInfo()); this.map.setScope(this.paths); } }
  /** Called by the plugin after a rescan. */
  async reload() { if (this.map) { this.map.destroy(); this.map = null; } await this.mount(); }
  showStale(c) { const b = this.staleBtn; if (!b) return; b.hidden = false; const t = `${c || "Some"} notes changed · rescan`; b.setAttribute("aria-label", t); b.title = t; const n = b.querySelector(".tbadge"); if (n) n.setText(String(c || "")); }
};

export function registerBases(plugin) {
  if (typeof plugin.registerBasesView !== "function" || !obsidian.BasesView) return false;   // Obsidian before 1.10
  const MapBasesView = makeView(obsidian.BasesView), views = plugin.basesViews = new Set();
  return plugin.registerBasesView(BASES_VIEW, {
    name: "Maps of the Ideaverse", icon: "orbit",
    factory: (controller, containerEl) => { const v = new MapBasesView(controller, containerEl, plugin); views.add(v); v.register(() => views.delete(v)); return v; },
  });
}
