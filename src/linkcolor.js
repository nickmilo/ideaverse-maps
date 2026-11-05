import { TFile } from "obsidian";
import { VIEW_TYPE } from "./view.js";

/* Color ALL links in all Obsidian windows by Idea Emergence (0.8.234, Nick): with Display → "Color all links by Idea Emergence" on,
   every link in every note is marked with how its note relates to the one it sits in (data-ivk: upp up property, rel related, up above,
   down below, prop another property), and the colors come from styles.css (or a theme that styles [data-ivk], like Starfield).
   The relations come from an open map (its emergence levels and link kinds), so the colors show while a map is open, in front or not. */
function targets(app, path) { const f = app.vault.getAbstractFileByPath(path), c = f instanceof TFile ? app.metadataCache.getFileCache(f) : null, M = new Map(); if (!c) return M;
  for (const l of [...(c.links || []), ...(c.embeds || []), ...(c.frontmatterLinks || [])]) { const base = String(l.link || "").split("#")[0], t = app.metadataCache.getFirstLinkpathDest(base, path); if (!(t instanceof TFile)) continue;
    for (const key of [l.displayText, l.link, base, t.basename]) if (key) { const k = String(key).trim().toLowerCase(); if (!M.has(k)) M.set(k, t.path); } }
  return M; }
const SEL = "a.internal-link, .cm-hmd-internal-link, .multi-select-pill-content, .internal-link";

export function registerLinkColors(plugin) {
  const app = plugin.app; let t = 0;
  const on = () => plugin.store.get("iv-linkcolor") === true;
  const mapApi = () => { for (const l of app.workspace.getLeavesOfType(VIEW_TYPE)) { const m = l.view && l.view.map; if (m && m.linkKind) return m; } return null; };
  const mark = (root, path, m) => { const M = targets(app, path);
    for (const e of root.querySelectorAll(SEL)) { if (e.closest(".ivm-card")) continue;   /* the map's own editors do their own */
      const key = String(e.getAttribute("data-href") || e.textContent || "").trim().toLowerCase(); if (!key) continue;
      { const mp = e.closest(".metadata-property"), v = plugin.settings.collectionProps, CK = (Array.isArray(v) ? v : String(v || "collections").split(",")).map(x => String(x).trim().toLowerCase());
        if (mp && CK.includes(String(mp.getAttribute("data-property-key") || "").toLowerCase())) { if (e.dataset.ivk !== "prop") e.dataset.ivk = "prop"; continue; } }
      /* a link inside an embedded note belongs to that note: colored by how its note relates to the embedded one, not to this one (0.8.279) */
      let from = path, MM = M; { const em = e.closest(".markdown-embed-content, .markdown-embed .markdown-preview-view"), host_ = em && em.closest(".internal-embed[src]");
        if (host_) { const t = app.metadataCache.getFirstLinkpathDest(String(host_.getAttribute("src") || "").split("#")[0], path); if (t instanceof TFile) { from = t.path; MM = targets(app, from); } } }
      const p = MM.get(key) || MM.get(key.split("|")[0].split("#")[0].trim()) || MM.get(key.split("|").pop().trim()), kd = p ? m.linkKind(from, p) : "";
      if ((e.dataset.ivk || "") !== kd) { if (kd) e.dataset.ivk = kd; else delete e.dataset.ivk; } } };
  const run = () => { const yes = on(); document.body.classList.toggle("ivm-linkcolors", yes); if (!yes) return; const m = mapApi(); if (!m) return;
    app.workspace.iterateAllLeaves(l => { const v = l.view; if (v && v.getViewType && v.getViewType() === "markdown" && v.file) mark(v.containerEl, v.file.path, m); }); };
  const soon = () => { window.clearTimeout(t); t = window.setTimeout(run, 200); };
  plugin.linkColorsRun = soon;
  app.workspace.onLayoutReady(() => {
    for (const ev of ["layout-change", "active-leaf-change", "file-open", "editor-change"]) plugin.registerEvent(app.workspace.on(ev, soon));
    plugin.registerEvent(app.metadataCache.on("changed", soon));
    const mo = new MutationObserver(() => { if (on()) soon(); }); mo.observe(app.workspace.containerEl, { childList: true, subtree: true }); plugin.register(() => mo.disconnect());
    plugin.register(() => document.body.classList.remove("ivm-linkcolors"));
    soon(); });
}
