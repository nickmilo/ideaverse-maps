/* The spot preview and what the Links pane and the Links HUD share (0.9.114): one copy of the parts both draw, so the two can't drift apart again
   (the pane had its own relevance until 0.9.65). The HUD's order, kinds and relevance live in the map (mapApp.js), the pane ports them line for line. */
import { MarkdownRenderer } from "obsidian";

/* an emoji leading a file name (with its variation selector, skin tone or joined parts), and the space after it */
export const LEAD_EMO = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*)\s*/u;

/* the map's level gradients (GRAD in mapApp.js) */
export const LVGRAD = { 5: ["#f7c948", "#e8538a"], 4: ["#8a5bd6", "#3466d6"], 3: ["#4fc3ef", "#5b2e91"] };

/* what the three orders mean, from the map's own explanations (Starship → relevance "?", Display → How notes are scored) */
export const LINKHELP = {
  rel: ["How close each link is to this note, 100 for the closest. Up links sit on top.",
    "A walk starts at this note and keeps coming home; the notes it lands on most often are the most relevant. Links count by kind (up or related 2, a link in the text 1, another property 0.6), a little more when two notes link both ways; big hubs are toned down so they don't win just for being big; and what you declared counts most: a note in this note's up ×3, a related note ×1.6."],
  lvl: ["Highest Idea Emergence level first: 5 Home & hubs, 4 Maps of maps, 3 Maps of content, 2 Linked notes, 1 Unlinked notes. Within a level, the higher link score first. The note itself sits at its own place.",
    "A note gets the highest level it qualifies for. Level 5: a home note, or one of the top scorers. Level 4: a map linking 3+ maps, or a score at the Level 4 cut-off. Level 3: any map, or a score at the Level 3 cut-off. Level 2: any link. Level 1: no links yet.",
    "Link score: each kind of link, counted with diminishing returns, times its weight, added up (Maps of the Ideaverse → Display → How notes are scored)."],
  remg: ["Where each link sits relative to this note, as its note strip and link colors show it.",
    "Up: named in this note's up. Related: named in its related. Above: a higher level, or the same level with a higher link score. Below: the rest. This note sits between Above and Below; each group goes by relevance."] };

/* where `path` links to `cur`: a link in its text (with a position), else one of its properties, else whether `cur` links to it */
export function spotInfo(app, path, cur) { const mc = app.metadataCache, f = app.vault.getAbstractFileByPath(path), fc = f ? mc.getFileCache(f) : null;
  const to = l => { const t = mc.getFirstLinkpathDest(String(l.link || "").split("#")[0].split("|")[0], path); return t && t.path === cur; };
  const hit = cur && fc ? (fc.links || []).concat(fc.embeds || []).find(to) || null : null;
  const fmHit = !hit && cur && fc ? (fc.frontmatterLinks || []).find(to) || null : null;
  const outOnly = !hit && !fmHit && !!cur && !!(mc.resolvedLinks[cur] || {})[path];
  return { f, hit, fmHit, outOnly }; }

/* the line under the title (0.9.111), the property in bold (0.9.112) */
export function spotSub(sub, info) { if (info.hit) sub.setText("Links to the active note at the spot below."); else if (info.fmHit) { sub.append("Links to the active note via the "); sub.createEl("b", { text: String(info.fmHit.key).split(".")[0] }); sub.append(" property."); } else if (info.outOnly) sub.setText("The active note links to this note."); }

/* the passage around the link (2 lines before, up to 8 after, within its paragraph), rendered, the link marked and scrolled into view; else the note's opening */
export async function spotRender(app, path, cur, info, body, comp, opening) { if (!info.f) return; const t = await app.vault.cachedRead(info.f); if (!body.isConnected) return; let md;
  if (info.hit && info.hit.position) { const lines = t.split(/\r?\n/), L = info.hit.position.start.line; let a = L, b = L; while (a > 0 && lines[a - 1].trim() !== "" && L - a < 2) a--; while (b < lines.length - 1 && lines[b + 1].trim() !== "" && b - L < 8) b++; md = lines.slice(Math.max(0, a), b + 1).join("\n"); if (a > 0) md = "…\n\n" + md; }
  else if (opening) { await opening(); return; }
  else md = t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").slice(0, 700);
  await MarkdownRenderer.render(app, md, body, path, comp); if (!cur) return; const mc = app.metadataCache;
  for (const el of body.querySelectorAll("a.internal-link")) { const h = el.getAttribute("data-href") || el.getAttribute("href") || ""; const t2 = mc.getFirstLinkpathDest(h.split("#")[0].split("|")[0], path); if (t2 && t2.path === cur) el.addClass("ivd-pvhit"); }
  const h0 = body.querySelector(".ivd-pvhit"); if (h0) { const br = body.getBoundingClientRect(), hr = h0.getBoundingClientRect(); body.scrollTop = Math.max(0, body.scrollTop + hr.top - br.top - br.height / 3); } }
