import { Plugin, TFile, normalizePath } from "obsidian";
import { MapView, VIEW_TYPE } from "./view.js";
import { MapsSettingTab, detectDefaults } from "./settings.js";
import { DEFAULTS, scanVault } from "./scan.js";

export default class IdeaverseMapsPlugin extends Plugin {
  async onload() {
    const saved = (await this.loadData()) || {};
    this.data = { settings: saved.settings || null, state: saved.state || {} };
    this.graph = null;          // the last scan, shared by every open map
    this.dirty = false;         // notes changed since the last scan

    this.registerView(VIEW_TYPE, leaf => new MapView(leaf, this));
    this.addRibbonIcon("orbit", "Open Maps of the Ideaverse", () => { void this.openMap(); });
    this.addCommand({ id: "open", name: "Open map", callback: () => { void this.openMap(); } });
    this.addCommand({ id: "rescan", name: "Rescan the vault", callback: () => { void this.rescan(); } });
    this.addSettingTab(new MapsSettingTab(this.app, this));

    // offer a rescan when notes change (watched only once the vault has loaded, so startup doesn't count)
    this.app.workspace.onLayoutReady(() => {
      const mark = file => { if (file instanceof TFile && (file.extension === "md" || file.extension === "txt")) this.setDirty(); };
      this.registerEvent(this.app.vault.on("modify", mark));
      this.registerEvent(this.app.vault.on("create", mark));
      this.registerEvent(this.app.vault.on("delete", mark));
      this.registerEvent(this.app.vault.on("rename", mark));
    });
  }

  onunload() {}

  /** Settings, with defaults detected from the vault the first time. */
  get settings() {
    if (!this.data.settings) this.data.settings = Object.assign({}, DEFAULTS, detectDefaults(this.app));
    return this.data.settings;
  }
  async saveSettings() { await this.saveData(this.data); }

  /** The map's own remembered choices (view, theme, filters…), saved with the plugin's data. */
  get store() {
    return {
      get: key => this.data.state[key],
      set: (key, value) => {
        if (value === undefined) delete this.data.state[key]; else this.data.state[key] = value;
        window.clearTimeout(this.saveTimer);
        this.saveTimer = window.setTimeout(() => { void this.saveData(this.data); }, 800);
      },
    };
  }

  setDirty() {
    if (this.dirty || !this.graph) return;
    this.dirty = true;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) if (leaf.view instanceof MapView) leaf.view.showStale();
  }

  async openMap() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    const leaf = existing || this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  async rescan() {
    this.graph = null; this.dirty = false;
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (!leaves.length) { await this.openMap(); return; }   // no map open yet: opening one runs the scan
    for (const leaf of leaves) if (leaf.view instanceof MapView) await leaf.view.reload();
  }

  /** Read the whole vault into the map's data (see scan.js). */
  async getGraph(onProgress) {
    if (this.graph) return this.graph;
    const app = this.app, s = this.settings;
    const files = app.vault.getFiles()
      .filter(f => f.extension === "md" || (f.extension === "txt" && s.archive && f.path.startsWith(normalizePath(s.archive) + "/")))
      .map(f => ({ path: f.path, ctime: f.stat.ctime, read: () => app.vault.cachedRead(f) }));
    const resolve = (link, from) => { const f = app.metadataCache.getFirstLinkpathDest(link.replace(/\.md$/i, ""), from); return f ? f.path : null; };
    this.graph = await scanVault({ files, resolve, vaultName: app.vault.getName() }, s, onProgress);
    this.dirty = false;
    return this.graph;
  }
}
