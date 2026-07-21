# Tools

- `mazegen.py` — generates and validates the TRENCHFOX trench layouts
  (`python3 mazegen.py <seed>`): randomised backtracker + loop carving with
  the engine's fixed dugout/crawl-through/spawn invariants stamped in,
  connectivity repair, and a validator (borders, gate, symmetry, full pellet
  reachability with crawl-through wrap, flare count). The three shipped
  layouts are seeds 7, 8 and 9. To reroll, regenerate and paste the arrays
  into `trenchfox.html`'s MAZES.
- `icon-gen.js` — renders the PWA icons (flare + fox motif) via headless
  Chromium canvas (`CHROMIUM_PATH=<chromium> node icon-gen.js`); writes
  512/192/180 png into `../icons/`.
