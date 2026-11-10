// The mark (0.9.148): two shapes side by side at the left of the toolbar, also used by the map's watermark.
// Click it to choose: eight pairs from the Linking Your Thinking book cover, the overlapping pair from earlier
// versions, or mix a shape and a gradient for each side.
//
// Shapes sit on a 17-unit body: circle 17; square 16 (a square as wide as the circle reads bigger), crisp edges;
// upright triangle equilateral, as tall as the square, on its bottom line; left-pointing triangle equilateral, as
// tall as the circle. Spacing is measured: the right shape slides in from the right until the closest points of the
// two outlines are 1.5 units apart (two circles touch). A fixed gap looks wider where a shape curves or slants away.

const SVGNS = "http://www.w3.org/2000/svg";
const TU = 16 / 0.8660254, TL = 17 * 0.8660254;
export const MK_SHAPES = {
  circle: { w: 17, el: [["circle", { cx: 8.5, cy: 8.5, r: 8.5 }]] },
  square: { w: 17, el: [["rect", { x: 0.5, y: 0.5, width: 16, height: 16, "shape-rendering": "crispEdges" }]] },
  tri: { w: TU, el: [["polygon", { points: `${TU / 2},0.5 ${TU},16.5 0,16.5` }]] },
  left: { w: TL, el: [["polygon", { points: `0,8.5 ${TL},0 ${TL},17` }]] },
};
const NAMES = { circle: "circle", square: "square", tri: "triangle", left: "left triangle" };
// gradients: [x1,y1,x2,y2], from, to
const GRADS = {
  bg: [[0, 0, 1, 1], "#7ED3FA", "#14AC54", "blue to green"],
  yp: [[0, 0, 0, 1], "#FFD43B", "#EC3F82", "yellow to pink"],
  bv: [[0, 0, 0, 1], "#58CBF2", "#6A2C91", "blue to violet"],
  py: [[1, 0, 0, 1], "#EC3F82", "#FFD43B", "pink to yellow"],
};
export const MK_COVER = [
  [["circle", "bg"], ["circle", "py"]], [["square", "yp"], ["circle", "bg"]], [["tri", "bv"], ["square", "bg"]], [["square", "yp"], ["square", "bg"]],
  [["circle", "py"], ["square", "bg"]], [["left", "bv"], ["circle", "py"]], [["tri", "bv"], ["circle", "yp"]], [["square", "bg"], ["tri", "bv"]],
];
export const MK_CLASSIC = "classic";   // the overlapping circle and rounded square of earlier versions
export const MK_DEFAULT = MK_COVER[0];

const OUT = (() => {
  const seg = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  const poly = ps => ps.flatMap((p, i) => seg(p, ps[(i + 1) % ps.length]));
  return {
    circle: Array.from({ length: 120 }, (_, i) => [8.5 + 8.5 * Math.cos(i * Math.PI / 60), 8.5 + 8.5 * Math.sin(i * Math.PI / 60)]),
    square: poly([[0.5, 0.5], [16.5, 0.5], [16.5, 16.5], [0.5, 16.5]]),
    tri: poly([[TU / 2, 0.5], [TU, 16.5], [0, 16.5]]),
    left: poly([[0, 8.5], [TL, 0], [TL, 17]]),
  };
})();
const GAPS = {};
export function mkGap(a, b) {
  const k = a + "|" + b; if (k in GAPS) return GAPS[k];
  if (a === "circle" && b === "circle") return (GAPS[k] = 0);
  const A = OUT[a], B = OUT[b], aw = MK_SHAPES[a].w, want = 1.5;
  const md = x => { let m = 1e9; for (const p of A) for (const q of B) { const dx = q[0] + x - p[0], dy = q[1] - p[1], d = dx * dx + dy * dy; if (d < m) m = d; } return Math.sqrt(m); };
  // slide the right shape in from the right; stop at the first spot where the outlines come within `want`
  let x = aw + 12; while (x > aw - 20 && md(x - 0.25) > want) x -= 0.25;
  let lo = x - 0.25, hi = x; for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (md(mid) > want) hi = mid; else lo = mid; }
  return (GAPS[k] = hi - aw);
}
export function mkValid(m) {
  return m === MK_CLASSIC || (Array.isArray(m) && m.length === 2 && m.every(x => Array.isArray(x) && MK_SHAPES[x[0]] && GRADS[x[1]]));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const label = m => m === MK_CLASSIC ? "the overlapping pair" : `${NAMES[m[0][0]]} and ${NAMES[m[1][0]]}`;

// the gradients, once per map, with ids of their own so several open maps don't share them
export function mkDefs(doc, host, uid) {
  const sv = doc.createElementNS(SVGNS, "svg"); sv.setAttribute("class", "mkdefs"); sv.setAttribute("aria-hidden", "true"); sv.setAttribute("width", "0"); sv.setAttribute("height", "0");
  const defs = doc.createElementNS(SVGNS, "defs"); sv.appendChild(defs);
  const grad = (id, [x1, y1, x2, y2], a, b) => {
    const g = doc.createElementNS(SVGNS, "linearGradient"); g.setAttribute("id", id);
    g.setAttribute("x1", x1); g.setAttribute("y1", y1); g.setAttribute("x2", x2); g.setAttribute("y2", y2);
    for (const [o, c] of [[0, a], [1, b]]) { const s = doc.createElementNS(SVGNS, "stop"); s.setAttribute("offset", o); s.setAttribute("stop-color", c); g.appendChild(s); }
    defs.appendChild(g);
  };
  for (const k in GRADS) grad(`${uid}-${k}`, ...GRADS[k].slice(0, 3));
  grad(`${uid}-c1`, [0, 0, 1, 1], "#5ec8f2", "#2fae78"); grad(`${uid}-c2`, [0, 0, 1, 1], "#f7c948", "#e8538a");
  host.appendChild(sv);
}

// one mark as an <svg>; h = pixels for 17 units
export function mkSvg(doc, uid, m, h) {
  const sv = doc.createElementNS(SVGNS, "svg"); sv.setAttribute("aria-hidden", "true"); sv.setAttribute("class", "mk");
  const add = (parent, tag, at, fill) => { const e = doc.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); e.setAttribute("fill", fill); parent.appendChild(e); };
  if (m === MK_CLASSIC) {   // 11-unit circle, 11-unit rounded square overlapping it by 3, as before
    sv.setAttribute("viewBox", "0 0 19 11"); sv.setAttribute("width", String(Math.round(19 * h / 11))); sv.setAttribute("height", String(h));
    add(sv, "circle", { cx: 5.5, cy: 5.5, r: 5.5 }, `url(#${uid}-c1)`); add(sv, "rect", { x: 8, y: 0, width: 11, height: 11, rx: 3 }, `url(#${uid}-c2)`);
    return sv;
  }
  const [a, b] = m.map(x => MK_SHAPES[x[0]]), gap = mkGap(m[0][0], m[1][0]), W = Math.max(a.w, a.w + gap + b.w), sc = h / 17;
  sv.setAttribute("viewBox", `0 -1 ${W} 19`); sv.setAttribute("width", String(Math.round(W * sc))); sv.setAttribute("height", String(Math.round(19 * sc)));
  [[m[0], 0], [m[1], a.w + gap]].forEach(([[sh, g], x]) => {
    const grp = doc.createElementNS(SVGNS, "g"); grp.setAttribute("transform", `translate(${x},0)`); sv.appendChild(grp);
    for (const [tag, at] of MK_SHAPES[sh].el) add(grp, tag, at, `url(#${uid}-${g})`);
  });
  return sv;
}

// a shape alone (the chips in the picker)
function chipSvg(doc, uid, sh, fill) {
  const sv = doc.createElementNS(SVGNS, "svg"); sv.setAttribute("aria-hidden", "true"); sv.setAttribute("width", "16"); sv.setAttribute("height", "16"); sv.setAttribute("viewBox", "-1 -2 21 21");
  for (const [tag, at] of MK_SHAPES[sh].el) { const e = doc.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); e.setAttribute("fill", fill.startsWith("#") ? `url(${fill})` : fill); sv.appendChild(e); }
  return sv;
}

// the picker's contents; get() → current mark, set(m) → choose
export function mkRender(doc, uid, pop, get, set, done) {
  pop.replaceChildren();
  const m = get(), el = (tag, cls, txt) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
  const btn = (cls, desc, pressed, onClick) => { const b = el("button", cls); b.type = "button"; b.setAttribute("aria-description", desc); b.setAttribute("aria-pressed", String(pressed)); b.addEventListener("click", e => { e.stopPropagation(); onClick(); }); return b; };
  pop.appendChild(el("div", "pt", "From the Linking Your Thinking book cover"));
  const grid = el("div", "mkgrid"); pop.appendChild(grid);
  [...MK_COVER, MK_CLASSIC].forEach(p => { const b = btn("mkopt", label(p), same(p, m), () => set(p)); b.appendChild(mkSvg(doc, uid, p, 13)); grid.appendChild(b); });
  grid.lastChild.classList.add("mkold"); grid.lastChild.setAttribute("aria-description", "The overlapping pair from earlier versions");
  pop.appendChild(el("div", "pt", "Mix your own"));
  const cur = m === MK_CLASSIC ? MK_DEFAULT : m;
  [0, 1].forEach(side => {
    const row = el("div", "mkside"); row.appendChild(el("span", "mklab", side ? "Right" : "Left"));
    const shapes = el("div", "mkrow"), grads = el("div", "mkrow");
    Object.keys(MK_SHAPES).forEach(sh => { const b = btn("mkchip", NAMES[sh], m !== MK_CLASSIC && cur[side][0] === sh, () => { const n = JSON.parse(JSON.stringify(cur)); n[side][0] = sh; set(n); }); b.appendChild(chipSvg(doc, uid, sh, "currentColor")); shapes.appendChild(b); });
    Object.keys(GRADS).forEach(g => { const b = btn("mkchip", GRADS[g][3], m !== MK_CLASSIC && cur[side][1] === g, () => { const n = JSON.parse(JSON.stringify(cur)); n[side][1] = g; set(n); }); b.appendChild(chipSvg(doc, uid, cur[side][0], `#${uid}-${g}`)); grads.appendChild(b); });
    row.appendChild(shapes); row.appendChild(el("span")); row.appendChild(grads); pop.appendChild(row);
  });
  const foot = el("div", "mkfoot");
  const sh = el("button", "chip", "Shuffle"); sh.type = "button"; sh.addEventListener("click", e => { e.stopPropagation(); const S = Object.keys(MK_SHAPES), G = Object.keys(GRADS), r = a => a[Math.floor(Math.random() * a.length)]; const g1 = r(G), g2 = r(G.filter(x => x !== g1)); set([[r(S), g1], [r(S), g2]]); });
  const dn = el("button", "chip mkdone", "Done"); dn.type = "button"; dn.addEventListener("click", e => { e.stopPropagation(); done(); });
  foot.appendChild(sh); foot.appendChild(el("span", "mknow", m === MK_CLASSIC ? "overlapping pair" : `${NAMES[m[0][0]]} · ${NAMES[m[1][0]]}`)); foot.appendChild(dn);
  pop.appendChild(foot);
}
