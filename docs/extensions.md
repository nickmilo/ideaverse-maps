# Extensions

Another plugin can extend Starfield. It can lay the stars out its own way, hide notes, draw over the Star Chart and the Ship, always name some notes, and add switches and buttons. Maps of the Ideaverse stays links-only. The extension brings the rest.

## Registering

```js
const moti = app.plugins.plugins["ideaverse-maps"];
const off = moti.api.register({ name: "My pack", attach: h => hooks(h) });   // call off() in onunload
```

Open maps remount when an extension registers or unregisters. `attach(h)` runs once per map. Return an object of hooks, or nothing to stay out of this map, for example when the vault isn't yours.

## The handle `h`

| | |
|---|---|
| `N`, `n` | the notes (each has `path`, `title`, `level`, `score`) and how many |
| `view`, `sel`, `vis` | the current view (`"stars"` is the Chart, `"cockpit"` the Ship), the selected note's index, which notes are showing |
| `SX`, `SY`, `out`, `inn` | Starfield positions; links out and in, by index |
| `W`, `H`, `UB`, `starVer`, `fonts` | canvas size, the layout's bounds and version, the map's mono and body fonts |
| `win`, `doc`, `Menu`, `hash`, `sprite(color)` | the window, the document, Obsidian's Menu, a stable hash, a soft round glow |
| `select(i)`, `draw()` | select a note, redraw |
| `pref(key, default)`, `save(key, value)` | the map's stored state |
| `relayout()`, `refilter()` | lay Starfield out again; filter again (after `hide` changes) |
| `shipOverview()` | the Ship rises to see the whole layout from above |
| `shipHold(on)` | while on, selecting a note leaves the Ship where it is |
| `shipJump()` | the next note change in the Ship is a hyperspace jump |
| `shipBusy()` | the Ship is still moving |
| `say(text)` | a short message in the Ship |

## Hooks

All are optional. A hook that throws is logged and skipped.

| | |
|---|---|
| `name` | heads the extension's switches in the Ship menu |
| `active()` | true while the extension owns Starfield's layout; the other hooks below `place` only matter then |
| `place({ B, web, SX, SY, BOD, COREB, UC, out, inn, hash })` | write every note's `SX`/`SY`; fill `B` with bodies (mark them `ext: true` to draw them yourself in the Ship). Return true. The Ship then looks straight down and opens from above |
| `hide(i)` | true to hide note `i` in Starfield |
| `labels(view)` | indices of notes the Chart always names |
| `chartUnder(c)`, `chartOver(c)` | draw under or over the Chart's sky; `c` is `{ ctx, sx, sy, k, W, H, bgDim, UB, starVer }` |
| `shipDraw(s)` | draw in the Ship; `s` is `{ g, pr, P, sc, F, W, H, c, UC }`, where `pr(x, y, z)` projects to `[x, y, depth]` or null |
| `shipBar(el)` | add buttons beside Back and Galaxy |
| `chartMenu({ el, tog })` | add to the Starfield menu; `tog(label, get, set)` adds a switch |
| `shipMenu({ el, tog })` | add to the Ship menu; `tog(label, get, set, help)` |
| `destroy()` | the map closed |
