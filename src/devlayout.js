import { Notice } from "obsidian";

/* Dev layout (0.8.205, Nick; it began as a private plugin, then he asked for it in the main one so it just works):
   ⌘⌥⌃K, or "Toggle dev layout" in the command palette, lets you drag any map anywhere in the maps menu: into or out of Experimental's groups,
   among the first four, whole groups, the dividers too. A pink light on the maps button says it's on. The layout is saved (iv-devlayout)
   and applied whenever the menu is built, on or off, so you can live with it before it becomes the default. */
const QK = [..."1234567890-=[]\\"];
const keyOf = el => el.id ? el.id : el.dataset && el.dataset.v ? "v:" + el.dataset.v
  : el.tagName === "DETAILS" ? "g:" + ((el.querySelector(":scope > summary") || {}).textContent || "").trim()
  : el.classList.contains("vfold") ? "|" : null;
const movable = el => el.classList.contains("chip") || el.tagName === "DETAILS" || (el.classList.contains("vfold") && !el.classList.contains("vfold0"));
const nameOf = el => el.tagName === "DETAILS" ? "▸ " + keyOf(el).slice(2) : el.classList.contains("vfold") ? "———" : el.textContent.replace(/\s+/g, " ").trim().replace(/[\d\-=[\]\\]$/, "");


class DevLayout {
  constructor(plugin) { this.plugin = plugin; this.data = { get on() { return plugin.store.get("iv-devon") === true; }, set on(v) { plugin.store.set("iv-devon", v); },
    get layout() { return plugin.store.get("iv-devlayout") || null; }, set layout(v) { plugin.store.set("iv-devlayout", v || undefined); } }; }
  saveData() { /* the store saves itself */ }
  register(f) { this.plugin.register(f); }
  all(f) { document.querySelectorAll(".ivm #vmorepop").forEach(f); }

  /* the containers: the menu itself and every group inside it */
  conts(MP) { return [MP, ...MP.querySelectorAll("details")]; }
  ckey(MP, c) { return c === MP ? "top" : keyOf(c); }
  kids(c) { return [...c.children].filter(movable); }

  snapshot(MP) { const o = {}; for (const c of this.conts(MP)) o[this.ckey(MP, c)] = this.kids(c).map(keyOf); return o; }
  apply(MP) { const L = this.data.layout; if (!L) return;
    const pool = new Map(), dvs = []; for (const c of this.conts(MP)) for (const el of this.kids(c)) { const k = keyOf(el); if (k === "|") dvs.push(el); else pool.set(k, el); }
    const end = MP.querySelector(":scope > .vdropmark") || MP.querySelector(":scope > .vreset");
    const place = (ck, parent) => { const list = L[ck]; if (!Array.isArray(list)) return;
      for (const k of list) { const el = k === "|" ? dvs.shift() : pool.get(k); if (!el) continue; if (k !== "|") pool.delete(k);
        if (parent === MP && end) MP.insertBefore(el, end); else parent.appendChild(el);
        if (el.tagName === "DETAILS") place(k, el); } };
    place("top", MP);
    for (const el of dvs) el.remove(); }
  badges(MP) { MP.querySelectorAll(".mkey").forEach(x => x.remove());
    [...MP.querySelectorAll(":scope > .chip")].filter(c => !c.hidden).slice(0, QK.length).forEach((c, j) => { const s = document.createElement("span"); s.className = "mkey"; s.textContent = QK[j]; s.setAttribute("aria-hidden", "true"); c.appendChild(s); }); }

  hook(MP) { MP.dataset.motidev = "1";
    this.apply(MP); if (this.data.layout) this.badges(MP);
    const line = MP.appendChild(document.createElement("div")); line.className = "motidev-line"; line.hidden = true;
    let drag = null;
    const target = e => { let c = e.target.closest && e.target.closest("details"); if (!c || !MP.contains(c)) c = MP;
      if (drag && (c === drag || drag.contains(c))) return null;
      if (c !== MP && !c.open) return { c, before: null };   /* onto a closed group: into it, at the end */
      const els = this.kids(c).filter(x => x !== drag); let before = null;
      for (const el of els) { const r = (el.tagName === "DETAILS" ? el.querySelector(":scope > summary") || el : el).getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = el; break; } }
      if (!before && c === MP) before = MP.querySelector(":scope > .vdropmark") || MP.querySelector(":scope > .vreset");
      return { c, before }; };
    const on = (t, f) => { MP.addEventListener(t, f, true); this.register(() => MP.removeEventListener(t, f, true)); };
    on("dragstart", e => { if (!this.data.on) return; let el = e.target.closest && e.target.closest(".chip, details, .vfold"); if (el && el.tagName !== "DETAILS" && e.target.tagName === "SUMMARY") el = e.target.parentElement;
      if (!el || !movable(el)) return; e.stopImmediatePropagation(); drag = el; el.classList.add("vdragging"); if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", keyOf(el) || ""); } });
    on("dragover", e => { if (!this.data.on || !drag) return; e.stopImmediatePropagation(); const t = target(e); if (!t) { line.hidden = true; return; } e.preventDefault();
      const pr = MP.getBoundingClientRect(), ref = t.before ? (t.before.tagName === "DETAILS" ? t.before.querySelector(":scope > summary") || t.before : t.before).getBoundingClientRect() : (t.c === MP ? null : (t.c.open ? t.c.lastElementChild : t.c).getBoundingClientRect());
      const y = ref ? (t.before ? ref.top : ref.bottom) : pr.bottom - 40, x = (t.c === MP ? pr.left : t.c.getBoundingClientRect().left);
      line.hidden = false; line.style.top = Math.round(y - pr.top + MP.scrollTop - 1) + "px"; line.style.left = Math.round(x - pr.left + 6) + "px"; });
    on("drop", e => { if (!this.data.on || !drag) return; e.stopImmediatePropagation(); e.preventDefault(); const t = target(e); line.hidden = true;
      if (t) { t.c.insertBefore(drag, t.before && t.before.parentElement === t.c ? t.before : null); this.data.layout = this.snapshot(MP);  this.badges(MP); } });
    on("dragend", () => { if (drag) drag.classList.remove("vdragging"); drag = null; line.hidden = true; });
    this.mode(MP); }

  mode(MP) { const on = this.data.on; MP.classList.toggle("motidev", on); const v = MP.closest(".ivm"); if (v) v.classList.toggle("motidev-on", on);
    MP.querySelectorAll(":scope details, :scope .vfold:not(.vfold0)").forEach(el => { el.draggable = on; });
    MP.querySelectorAll(".chip").forEach(el => { if (on) el.draggable = true; }); }

  describe(MP) { const lines = [], walk = (c, d) => { for (const el of this.kids(c)) { lines.push("  ".repeat(d) + nameOf(el)); if (el.tagName === "DETAILS") walk(el, d + 1); } };
    walk(MP, 0); return "MOTI maps menu, Nick's dev layout:\n\n" + lines.join("\n") + "\n\n```json\n" + JSON.stringify(this.snapshot(MP)) + "\n```\n"; }
}

export function registerDevLayout(plugin) {
  const d = new DevLayout(plugin);
  plugin.addCommand({ id: "toggle-dev-layout", name: "Toggle dev layout (move any map anywhere in the maps menu)", hotkeys: [{ modifiers: ["Mod", "Alt", "Ctrl"], key: "K" }],
    callback: () => { d.data.on = !d.data.on; d.all(m => d.mode(m)); new Notice(d.data.on ? "Dev layout on: drag any map anywhere in the maps menu" : "Dev layout off (your layout stays)"); } });
  plugin.app.workspace.onLayoutReady(() => { const mo = new MutationObserver(() => d.all(m => { if (!m.dataset.motidev) d.hook(m); }));
    mo.observe(document.body, { childList: true, subtree: true }); plugin.register(() => mo.disconnect()); d.all(m => d.hook(m)); });
}
