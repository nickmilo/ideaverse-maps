import { Component, FuzzySuggestModal, MarkdownRenderChild, Notice, TFile, normalizePath } from "obsidian";
import { mountInto, openBeside } from "./view.js";

/* A map inside a note (0.8.171, Nick: "like Bases can be embedded in obsidian notes with ![[base]] syntax… the same with a MOTI saved view").
   Two ways in:
   - a code block:   ```moti
                     view: 2026 Annual Review
                     height: 520
                     ```
   - a file embed:   ![[2026 Annual Review.moti]]   (a .moti file holds one saved view as plain JSON; the command "Make an embeddable file for a saved view" writes one)
   The map starts only when it scrolls into view, and a veil keeps the page scrolling until you click into it.
   It borrows the main map's settings but never changes them: what you do in an embed stays in the embed. */

const EMBED_OFF = { "iv-follow": false, "iv-editm": false, "iv-edleft": false, "iv-hudl": false };   // an embed never follows the note it sits in, and opens no editors of its own
const SHARED = new Set(["iv-views", "iv-vgroups", "iv-tours"]);

function embedStore(main) {
  const own = {};
  return {
    get: key => Object.prototype.hasOwnProperty.call(own, key) ? own[key] : Object.prototype.hasOwnProperty.call(EMBED_OFF, key) ? EMBED_OFF[key] : main.get(key),
    set: (key, value) => { if (SHARED.has(key)) { main.set(key, value); return; } own[key] = value; },
  };
}

/** Read a code block: "view: Name" and "height: 520" lines, or a bare name on its own. */
export function parseSpec(src) {
  const spec = { view: "", height: 0 };
  for (const line of String(src || "").split(/\r?\n/)) { const t = line.trim(); if (!t) continue;
    const m = /^([a-z]+)\s*:\s*(.*)$/i.exec(t);
    if (m && m[1].toLowerCase() === "view") spec.view = m[2].trim().replace(/^["']|["']$/g, "");
    else if (m && m[1].toLowerCase() === "height") spec.height = parseInt(m[2], 10) || 0;
    else if (!m && !spec.view) spec.view = t; }
  return spec;
}

class EmbedCore {
  constructor(owner, plugin, el, getView, height, sourcePath) {
    this.owner = owner; this.plugin = plugin; this.getView = getView; this.sourcePath = sourcePath; this.map = null; this.noteLeaf = null;
    this.box = el.createDiv({ cls: "ivm-embed" }); this.box.setCssProps({ "--ivm-embed-h": `${Math.max(240, Math.min(1400, height || 480))}px` });
    this.host = this.box.createDiv({ cls: "ivm-embed-host" });
    this.veil = this.box.createDiv({ cls: "ivm-embed-veil" });
    this.veil.createSpan({ cls: "ivm-embed-hint", text: "Click to explore" });
    this.box.addClass("is-quiet");   // until you click in, the note panel stays tucked away so the map has the room
    this.veil.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); this.veil.remove(); this.veil = null; this.box.removeClass("is-quiet"); });
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); void this.mount(); } }, { rootMargin: "200px" });
    io.observe(this.box); owner.register(() => io.disconnect());
  }
  async mount() {
    const o = this.owner; o.app = this.plugin.app; o.plugin = this.plugin;
    const spec = await this.getView();
    this.map = await mountInto(o, this.host, {
      store: embedStore(this.plugin.store), embed: true,
      isActive: () => this.box.isConnected && this.box.contains(document.activeElement || null),
      openNote: (p, t, b) => { let own = null; this.plugin.app.workspace.iterateAllLeaves(l => { if (!own && l.view && l.view.containerEl && l.view.containerEl.contains(this.box)) own = l; });
        this.noteLeaf = openBeside(this.plugin.app, own, this.noteLeaf, p, t, b); },
    });
    if (!this.map) return;
    if (spec && this.map.showSaved) { const ok = await this.map.showSaved(spec); if (!ok && typeof spec === "string") this.box.createDiv({ cls: "ivm-embed-miss", text: `No saved view called “${spec}”. Showing the map as it is.` }); }
  }
  destroy() { if (this.map) { this.map.destroy(); this.map = null; } }
}

/** ```moti … ``` in a note */
class CodeEmbed extends MarkdownRenderChild {
  constructor(el, plugin, src, sourcePath) { super(el); this.plugin = plugin; this.spec = parseSpec(src); this.sourcePath = sourcePath; }
  onload() { this.core = new EmbedCore(this, this.plugin, this.containerEl, async () => this.spec.view || null, this.spec.height, this.sourcePath); }
  onunload() { if (this.core) this.core.destroy(); }
}

/** ![[Name.moti]] in a note: the file holds the saved view itself */
class FileEmbed extends Component {
  constructor(ctx, file, plugin) { super(); this.ctx = ctx; this.file = file; this.plugin = plugin; this.containerEl = ctx.containerEl; }
  onload() { this.containerEl.addClass("ivm-embed-wrap");
    this.core = new EmbedCore(this, this.plugin, this.containerEl, async () => readMoti(this.plugin.app, this.file), 0, this.ctx.sourcePath); }
  loadFile() { /* Obsidian calls this once the embed is in place; the map loads itself when it scrolls into view */ }
  onunload() { if (this.core) this.core.destroy(); }
}

async function readMoti(app, file) {
  try { const o = JSON.parse(await app.vault.read(file)); const v = o && (o.view && typeof o.view === "object" ? o.view : o); if (v && typeof v === "object") { if (!v.name) v.name = file.basename; return v; } } catch { /* not JSON: treat the text as a saved view's name */ }
  try { const t = (await app.vault.read(file)).trim(); return t || file.basename; } catch { return file.basename; }
}

class ViewPicker extends FuzzySuggestModal {
  constructor(app, items, done) { super(app); this.items = items; this.done = done; this.setPlaceholder("Which saved view should become an embeddable .moti file?"); }
  getItems() { return this.items; }
  getItemText(v) { return v.group ? `${v.name}  ·  ${v.group}` : v.name; }
  onChooseItem(v) { this.done(v); }
}

export function registerEmbeds(plugin) {
  const app = plugin.app;
  plugin.registerMarkdownCodeBlockProcessor("moti", (src, el, ctx) => { ctx.addChild(new CodeEmbed(el, plugin, src, ctx.sourcePath)); });
  // ![[x.moti]]: Obsidian's embed registry (the way it embeds images, PDFs and bases). It isn't part of the public API, so it's used only if it's there.
  const reg = /** @type {any} */ (app).embedRegistry;
  if (reg && typeof reg.registerExtension === "function") {
    try { reg.registerExtension("moti", (ctx, file) => new FileEmbed(ctx, file, plugin)); plugin.register(() => { try { reg.unregisterExtension("moti"); } catch { /* already gone */ } }); }
    catch (e) { console.warn("Maps of the Ideaverse: couldn't register .moti embeds", e); } }
  plugin.addCommand({ id: "make-moti", name: "Make an embeddable file for a saved view", callback: () => {
    const views = plugin.store.get("iv-views"); const list = Array.isArray(views) ? views.filter(v => v && v.name) : [];
    if (!list.length) { new Notice("No saved views yet. Save one in the map first (Saved → Save view)."); return; }
    new ViewPicker(app, list, async v => {
      const dir = plugin.settings.viewsFolder && plugin.settings.viewsFolder !== "/" ? normalizePath(plugin.settings.viewsFolder) : "";
      const safe = String(v.name).replace(/[\\/:*?"<>|#^[\]]/g, "-").trim() || "Map";
      const path = normalizePath(dir ? `${dir}/${safe}.moti` : `${safe}.moti`), text = JSON.stringify({ about: "A saved view from Maps of the Ideaverse. Embed it in a note with ![[" + safe + ".moti]]", view: v }, null, 1);
      if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir);
      const f = app.vault.getAbstractFileByPath(path); if (f instanceof TFile) await app.vault.process(f, () => text); else await app.vault.create(path, text);
      const link = `![[${safe}.moti]]`; try { await navigator.clipboard.writeText(link); } catch { /* clipboard blocked: the notice still shows the link */ }
      new Notice(`Saved ${path}. Paste ${link} into any note (copied).`); }).open(); } });
}
