# Tests

End-to-end checks that run the plugin inside real Obsidian (Linux build, under Xvfb) on a made-up vault, driven by Playwright over the Chrome DevTools port.

```
python3 test/make-ace-vault.py /tmp/vaults/synth 2500     # ACE folders, maps, links, up/related, dates
python3 test/make-films.py /tmp/vaults/synth                # + 160 made-up films with posters (Posters, README)
# README images: node test/obs.js /tmp/vaults/synth test/scenarios/readme-shots2.js  (SHOTS=<dir>)
python3 test/make-plain-vault.py /tmp/vaults/plain 600    # no ACE, no frontmatter
npm run build
OBSIDIAN=/path/to/obsidian-1.x/obsidian xvfb-run -a -s "-screen 0 1600x1000x24" \
  node test/obs.js /tmp/vaults/synth test/scenarios/open-note.js
```

`obs.js` copies the built plugin into the vault, starts Obsidian, trusts and enables the plugin, then runs the scenario. `FRESH=1` clears the plugin's saved data first. Screenshots go to `$SHOTS` (default `<tmp>/ivm-shots`).

## Visual regression

Before a styling change, take a baseline; after it, take another and compare. The baseline walks through 18 states (three maps, 3D, note panel, focus, collapsed bars, filters, three window widths) and records screenshots plus the position of every key element.

```
TAG=before FRESH=1 xvfb-run … node test/obs.js /tmp/vaults/synth test/scenarios/visual-baseline.js
# change things, rebuild
TAG=after  FRESH=1 xvfb-run … node test/obs.js /tmp/vaults/synth test/scenarios/visual-baseline.js
python3 test/visual-compare.py before after
```

Only one Obsidian can run at a time (the debugging port is fixed).
