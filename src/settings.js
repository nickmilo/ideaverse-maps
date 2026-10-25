import { PluginSettingTab, Setting, TFolder, normalizePath } from "obsidian";
import { DEFAULTS, dateKeys } from "./scan.js";

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
    // a line under folder fields naming any folder that isn't in the vault (capitals don't matter)
    const folders = new Set(this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder).map(f => f.path.toLowerCase()));
    const check = (setting, vals) => { const miss = vals.filter(v => !folders.has(v.toLowerCase()));
      let el = setting.descEl.querySelector(".ivm-miss"); if (!el) el = setting.descEl.createDiv({ cls: "ivm-miss mod-warning" });
      el.setText(miss.length ? `Not found in this vault: ${miss.join(", ")}` : ""); };
    const folderList = (name, desc, key) => { const st = new Setting(containerEl).setName(name).setDesc(desc); st.addTextArea(t => t
      .setPlaceholder("Folder/path, one per line").setValue((s[key] || []).join("\n"))
      .onChange(async v => { s[key] = list(v); check(st, s[key]); await save(); })); check(st, s[key] || []); return st; };
    const folderOne = (name, desc, key) => { const st = new Setting(containerEl).setName(name).setDesc(desc); st.addText(t => t
      .setPlaceholder("Folder/path").setValue(s[key] || "")
      .onChange(async v => { s[key] = list(v)[0] || ""; check(st, s[key] ? [s[key]] : []); await save(); })); check(st, s[key] ? [s[key]] : []); return st; };

    new Setting(containerEl).setName("Rescan").setDesc("Changes here take effect on the next scan. The map also offers a rescan when notes change.")
      .addButton(b => b.setButtonText("Rescan now").setCta().onClick(() => { void p.rescan(); }));

    new Setting(containerEl).setName("What's on the map").setHeading();
    folderList("Leave out", "Folders left off the map entirely (templates, system folders).", "exclude");
    folderOne("Archive folder", "An old archive shown as its own layer. Its links never lift notes outside it.", "archive");
    folderOne("Hidden until picked", "A folder that's on the map but switched off by default, and never scored against the rest (for example, imported learning packs).", "packs");
    folderList("Big maps only", "Private folders: only their maps (Level 3 and up) appear.", "privateFolders");

    new Setting(containerEl).setName("Date property").setDesc("The property that says when a note was made, in any capitalization (created, Created, CREATED). The first one a note has wins; the list starts with the common names (created, createdAt, date created… and date last), and you can add your own or reorder them. Reads 2024-05-01, [[2024-05-01]], 2024-05-01T09:30, May 1, 2024 and more; a month or year alone (2024-05, 2024) counts as its first day. Rescan after changing.").addText(t => t
      .setPlaceholder("created, createdAt, date created").setValue(dateKeys(s).join(", "))
      .onChange(async v => { const l = v.split(",").map(x => x.trim()).filter(Boolean); s.dateProps = l.length ? l : ["created"]; await p.saveSettings(); }));

    new Setting(containerEl).setName("Dates from files").setDesc("A note with no date property and no date in its name is placed by when its file was made. File dates change when notes are copied, synced, restored or checked out with git; if that's your vault, turn this off and list your own date property above instead.")
      .addToggle(t => t.setValue(s.fileDates !== false).onChange(async v => { s.fileDates = v; await save(); }));

    new Setting(containerEl).setName("Markdown links").setDesc("Also count markdown-style links to notes, [text](folder/Note.md), the kind some tools write. Off by default: most vaults link with [[wikilinks]].")
      .addToggle(t => t.setValue(!!s.mdLinks).onChange(async v => { s.mdLinks = v; await save(); }));

    new Setting(containerEl).setName("Property names").setHeading();
    // the names this vault uses for up, related, collections and rank (any capitalization; a note may use any name in a list)
    const names = (name, desc, key, def) => new Setting(containerEl).setName(name).setDesc(desc).addText(t => t
      .setPlaceholder(def).setValue((s[key] && s[key].length ? s[key] : def.split(", ")).join(", "))
      .onChange(async v => { const l = v.split(",").map(x => x.trim()).filter(Boolean); s[key] = l.length ? l : def.split(", "); await save(); }));
    names("Up", "The property that links a note up to its parent maps. Comma-separated if your notes use more than one name. Rescan after changing.", "upProps", "up");
    names("Related", "The property that links a note sideways to related notes.", "relatedProps", "related");
    names("Collections", "The property that lists the collections a note belongs to (for example collections, or collection). Map collections below read it.", "collectionProps", "collections");
    names("Rank", "A number property that ranks notes (the first name a note has wins).", "rankProps", "rank");

    new Setting(containerEl).setName("Properties to plot").setDesc("Number properties offered under By → More… (comma-separated), for example year, rating, pages. Each becomes an axis: notes line up left to right by its value. Rescan after changing.").addText(t => t
      .setPlaceholder("year, rating").setValue((s.axisProps || ["year"]).join(", "))
      .onChange(async v => { s.axisProps = v.split(",").map(x => x.trim()).filter(Boolean); await p.saveSettings(); }));

    new Setting(containerEl).setName("PKM Planet").setHeading();
    new Setting(containerEl).setName("Map image").setDesc("A full-size PKM Planet image in your vault (PNG, JPG or WebP). Left empty, the map uses the smaller image built into the plugin.").addText(t => t
      .setPlaceholder("Folder/PKM Planet.png").setValue(s.planetImage || "")
      .onChange(async v => { s.planetImage = v.trim() ? normalizePath(v.trim()) : ""; await p.saveSettings(); }));
    new Setting(containerEl).setName("Creator's Continent image").setDesc("The far side of the PKM Planet globe: a full-size Creator's Continent image in your vault (PNG, JPG or WebP). Left empty, the globe uses the smaller image built into the plugin.").addText(t => t
      .setPlaceholder("Folder/Creator's Continent.png").setValue(s.creatorImage || "")
      .onChange(async v => { s.creatorImage = v.trim() ? normalizePath(v.trim()) : ""; await p.saveSettings(); }));

    new Setting(containerEl).setName("Show the way home").setHeading();
    // filled in with the note it heads for now, so it's clear what goes here
    const wayNow = s.wayHome || (s.homeNotes || [])[0] || "Home";
    new Setting(containerEl).setName("Default note").setDesc("The note Display → Show the way home heads for, unless you pick another on the map. A note name (or its path). Left empty, it's your first home note.").addText(t => t
      .setPlaceholder("Home").setValue(wayNow)
      .onChange(async v => { s.wayHome = v.trim(); await p.saveSettings(); }));

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
