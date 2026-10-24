import { Plugin, TFile, normalizePath } from "obsidian";
import { MapView, VIEW_TYPE } from "./view.js";
import { registerBases } from "./bases.js";
import { MapsSettingTab, detectDefaults } from "./settings.js";
import { DEFAULTS, EXTRACT_VERSION, scanVault } from "./scan.js";

export default class IdeaverseMapsPlugin extends Plugin {
  async onload() {
    const saved = (await this.loadData()) || {};
    this.data = { settings: saved.settings || null, state: saved.state || {} };
    this.graph = null;          // the last scan, shared by every open map
    this.dirty = false;         // notes changed since the last scan

    this.registerView(VIEW_TYPE, leaf => new MapView(leaf, this));
    this.addRibbonIcon("orbit", "Open Maps of the Ideaverse", () => { void this.openMap(); });
    this.addCommand({ id: "open", name: "Open map", callback: () => { void this.openMap(); } });
    // only offered while a map is open
    this.addCommand({ id: "follow", name: "Toggle follow note", checkCallback: checking => {
      const maps = this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l => l.view).filter(v => v instanceof MapView && v.map);
      if (!maps.length) return false;
      if (!checking) for (const v of maps) v.map.toggleFollow();
      return true; } });
    this.addCommand({ id: "rescan", name: "Rescan the vault", callback: () => { void this.rescan(); } });
    this.addSettingTab(new MapsSettingTab(this.app, this));
    registerBases(this);   // the map as a view inside any base (Obsidian 1.10+)

    // offer a rescan when notes change (watched only once the vault has loaded, so startup doesn't count)
    this.app.workspace.onLayoutReady(() => {
      const mark = file => { if (file instanceof TFile && (file.extension === "md" || file.extension === "txt")) this.setDirty(file.path); };
      this.registerEvent(this.app.vault.on("modify", mark));
      this.registerEvent(this.app.vault.on("create", mark));
      this.registerEvent(this.app.vault.on("delete", mark));
      this.registerEvent(this.app.vault.on("rename", (file, oldPath) => { mark(file); if (oldPath) this.setDirty(oldPath); }));
      // after an update, a base that was already open still runs the map from the old version: redraw it with this one
      for (const leaf of this.app.workspace.getLeavesOfType("bases")) {
        const old = leaf.view && leaf.view.containerEl && leaf.view.containerEl.querySelector(".ivm-bases");
        if (!old || old.dataset.ivmv === this.manifest.version) continue;
        if (typeof leaf.rebuildView === "function") leaf.rebuildView(); else void leaf.setViewState(leaf.getViewState());
      }
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

  /** A note changed since the last scan. The map offers a rescan once 5 or more have (one edit alone isn't worth a prompt). */
  setDirty(path) {
    if (!this.graph) return;
    (this.changed ||= new Set()).add(path || "?"); const c = this.changed.size;
    this.dirty = c >= 5; if (!this.dirty) return;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) if (leaf.view instanceof MapView) leaf.view.showStale(c);
    for (const v of this.basesViews || []) v.showStale(c);
  }

  async openMap() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    const leaf = existing || this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  async rescan() {
    this.graph = null; this.dirty = false; this.changed = new Set();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const v of this.basesViews || []) await v.reload();
    if (!leaves.length) { if (!(this.basesViews && this.basesViews.size)) await this.openMap(); return; }   // no map open yet: opening one runs the scan
    for (const leaf of leaves) if (leaf.view instanceof MapView) await leaf.view.reload();
  }

  /** What the scan learned from each note's text, kept between sessions in the plugin's folder, so only changed notes are read again.
      It holds links, counts and a few property values, never note text, and stays on this device. */
  get cachePath() { return normalizePath(`${this.manifest.dir}/scan-cache.json`); }
  async scanCache() {
    if (!this.cacheData) { let d = null;
      try { if (await this.app.vault.adapter.exists(this.cachePath)) d = JSON.parse(await this.app.vault.adapter.read(this.cachePath)); } catch { d = null; }
      this.cacheData = d && d.v === EXTRACT_VERSION && d.files ? d : { v: EXTRACT_VERSION, files: {} }; }
    const F = this.cacheData.files, c = { changed: false,
      get: (p, m, z) => { const r = F[p]; return r && r[0] === m && r[1] === z ? r[2] : undefined; },
      set: (p, m, z, e) => { F[p] = [m, z, e]; c.changed = true; },
      prune: keep => { for (const p of Object.keys(F)) if (!keep.has(p)) { delete F[p]; c.changed = true; } } };
    return c;
  }
  async saveScanCache() { try { await this.app.vault.adapter.write(this.cachePath, JSON.stringify(this.cacheData)); } catch (e) { console.warn("Maps of the Ideaverse: couldn't save the scan cache", e); } }

  /** Read the whole vault into the map's data (see scan.js). */
  async getGraph(onProgress) {
    if (this.graph) return this.graph;
    const app = this.app, s = this.settings;
    const files = app.vault.getFiles()
      .filter(f => f.extension === "md" || (f.extension === "txt" && s.archive && f.path.startsWith(normalizePath(s.archive) + "/")))
      .map(f => ({ path: f.path, ctime: f.stat.ctime, mtime: f.stat.mtime, size: f.stat.size, read: () => app.vault.cachedRead(f) }));
    const resolve = (link, from) => { const f = app.metadataCache.getFirstLinkpathDest(link.replace(/\.md$/i, ""), from); return f ? f.path : null; };
    const cache = await this.scanCache();
    this.graph = await scanVault({ files, resolve, vaultName: app.vault.getName(), cache }, s, onProgress);
    if (cache.changed) void this.saveScanCache();
    this.dirty = false; this.changed = new Set();
    return this.graph;
  }
}
