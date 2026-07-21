# Petbook Arcade — QA suite

Playwright smoke tests for both games and the hub, driven through the games'
built-in debug hooks (`window.__trenchfox`, `window.__starshell`).

## Run

```bash
cd tests
npm install
CHROMIUM_PATH=/path/to/chrome-or-chromium npm test
```

`npm test` starts a static server for the repo root on `127.0.0.1:8123`
(override with `PORT`) and runs every `*.test.js` in sequence:

- `trenchfox.test.js` — boot, input, scoring, late-swipe corner cut, flare
  exposure, death freeze, all three maze layouts (rotation + reachability),
  pause/resume
- `starshell.test.js` — legacy-save migration, boot, steering, scoring,
  hunter telegraph, shell burst + chain, death, retry, daily mode,
  `starshell-` storage-key hygiene
- `hub.test.js` — hub launch buttons navigate to both games

Every test also fails on any console/page error.

`CHROMIUM_PATH` must point at a Chrome/Chromium binary (playwright-core does
not download browsers). If unset, playwright-core's default resolution is
attempted.

## Tuning harness (optional)

`node tune.js [seconds]` runs a bot-driven STARSHELL session (default 200s) and
prints balance numbers: survival, graze-combo attainment, CLOSE CALL rate on
aggressive novas, and spawn-rate relief during wave lulls. It is not part of
`npm test`.
