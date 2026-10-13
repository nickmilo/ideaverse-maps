# Contributing

Thanks for helping with Maps of the Ideaverse.

## Issues and ideas

Open a [GitHub issue](https://github.com/nickmilo/ideaverse-maps/issues). For a bug, include your Obsidian version, your operating system, roughly how many notes are in your vault, and what you saw (a screenshot helps). Please don't attach notes you'd rather keep private; the map works the same on a small test vault.

## Working on the code

The plugin is plain JavaScript, bundled with esbuild.

```
npm ci            # install the exact versions in package-lock.json
npm run dev       # rebuild main.js on every change
npm run build     # production build
npm run lint      # eslint with Obsidian's plugin rules
```

Copy `main.js`, `manifest.json` and `styles.css` into `<your test vault>/.obsidian/plugins/ideaverse-maps/` and reload Obsidian.

- `src/main.js`: the plugin (commands, ribbon, settings, scanning the vault).
- `src/scan.js`: reads the notes and gives each one its Idea Emergence level.
- `src/view.js`: the map's view inside Obsidian.
- `src/mapApp.js`: the map itself (drawing, time-lapse, panels).
- `src/ui.js`: the map's controls.
- `styles.css`: everything is scoped under `.ivm`.

## Pull requests

Keep them small and focused, run `npm run lint` first, and say what you tested. The plugin never changes notes and makes no network requests; changes that would alter either won't be merged.

## Releases

Bumping `version` in `manifest.json` (plus `package.json` and `versions.json`) on `main` builds and publishes the release automatically.
