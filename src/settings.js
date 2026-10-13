import { PluginSettingTab, Setting, TFolder, normalizePath } from "obsidian";

const list = v => String(v || "").split(/[\n,]/).map(s => s.trim()).filter(Boolean).map(s => normalizePath(s)).filter(s => s && s !== "/");

/** Sensible first-run settings, read from the vault's folders and note names. */
export function detectDefaults(app) {
  const folders = app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder && f.path !== "/");
  const names = new Set(app.vault.getMarkdownFiles().map(f => f.basename.toLowerCase()));
  return {
    homeNotes: ["Home", "Home Base", "Home Pro"].filter(h => names.has(h.toLowerCase())),
    mapFolders: folders.filter(f => f.name.toLowerCase() === "maps").map(f => f.path),
  };
}

export class MapsSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl } = this, p = this.plugin, s = p.settings;
    containerEl.empty();
    const save = async () => { await p.saveSettings(); p.setDirty(); p.graph = null; };
    const folderList = (name, desc, key) => new Setting(containerEl).setName(name).setDesc(desc).addTextArea(t => t
      .setPlaceholder("Folder/path, one per line").setValue((s[key] || []).join("\n"))
      .onChange(async v => { s[key] = list(v); await save(); }));
    const folderOne = (name, desc, key) => new Setting(containerEl).setName(name).setDesc(desc).addText(t => t
      .setPlaceholder("Folder/path").setValue(s[key] || "")
      .onChange(async v => { s[key] = list(v)[0] || ""; await save(); }));

    new Setting(containerEl).setName("Rescan").setDesc("Changes here take effect on the next scan. The map also offers a rescan when notes change.")
      .addButton(b => b.setButtonText("Rescan now").setCta().onClick(() => { void p.rescan(); }));

    new Setting(containerEl).setName("What's on the map").setHeading();
    folderList("Leave out", "Folders left off the map entirely (templates, system folders).", "exclude");
    folderOne("Archive folder", "An old archive shown as its own layer. Its links never lift notes outside it.", "archive");
    folderOne("Hidden until picked", "A folder that's on the map but switched off by default, and never scored against the rest (for example, imported learning packs).", "packs");
    folderList("Big maps only", "Private folders: only their maps (Level 3 and up) appear.", "privateFolders");

    new Setting(containerEl).setName("Dates from files").setDesc("A note with no created property and no date in its name is placed by when its file was made. File dates can change when notes are copied or synced.")
      .addToggle(t => t.setValue(s.fileDates !== false).onChange(async v => { s.fileDates = v; await save(); }));

    new Setting(containerEl).setName("Saved views and tours").setHeading();
    new Setting(containerEl).setName("Folder").setDesc("The folder that keeps your saved views and tours (one JSON file, updated as you save). Left empty, the map asks before your first save. Use / for the vault root.").addText(t => t
      .setPlaceholder("Folder/path").setValue(s.viewsFolder || "")
      .onChange(async v => { const x = v.trim(); s.viewsFolder = x === "/" ? "/" : list(x)[0] || ""; await p.saveSettings(); }));

    new Setting(containerEl).setName("Idea Emergence levels").setHeading();
    new Setting(containerEl).setName("Home notes").setDesc("Always Level 5. Note names, one per line.").addTextArea(t => t
      .setPlaceholder("Home").setValue((s.homeNotes || []).join("\n")).onChange(async v => { s.homeNotes = list(v); await save(); }));
    folderList("Map folders", "Every note in these folders counts as a map (Level 3 or higher). Notes with MOC in the title, or made mostly of links, count too.", "mapFolders");
    new Setting(containerEl).setName("Map collections").setDesc("Notes listed in these collections (the collections property) count as maps.").addText(t => t
      .setPlaceholder("Maps, Views").setValue((s.mapCollections || []).join(", ")).onChange(async v => { s.mapCollections = list(v); await save(); }));
    new Setting(containerEl).setName("Level 5 seats").setDesc("How many top-scoring notes join the home notes at Level 5. 0 scales with the size of the vault.").addText(t => t
      .setPlaceholder("0").setValue(String(s.l5Top || 0)).onChange(async v => { const n = parseInt(v, 10); s.l5Top = isFinite(n) && n > 0 ? n : 0; await save(); }));
  }
}
