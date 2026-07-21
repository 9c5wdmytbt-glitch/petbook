# PROJECT BRIEF — Petbook Arcade
Date: 2026-07-21 (updated after the IP-clean rework)

## 1. Purpose & Business Context
- A mobile-first browser arcade containing two complete games: **TRENCHFOX**, an original
  trench-network maze-chase, and **STARSHELL**, an original arena game built on a
  hunted → charge → reversal → feast loop.
  Everything is plain HTML/CSS/JavaScript with zero dependencies and zero build
  step — each game is one self-contained file that runs in any modern browser.
- Target users: casual mobile players. One-thumb play (swipe / drag / d-pad),
  short sessions, instant restart; desktop keyboard supported.
- Current stage: **live in production** at
  https://9c5wdmytbt-glitch.github.io/petbook/ via GitHub Pages, with a
  committed QA suite and two rounds of gameplay polish shipped.
- Note: the repository is named `petbook`, but it contains no pet-related code —
  it was an empty repo (README only) that this arcade was built into.

## 2. Tech Stack
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (ES2017+, `'use strict'`).
  No frameworks, no runtime dependencies, no external assets — a strict
  self-containment constraint so the pages also run under claude.ai's Artifact
  CSP, which blocks all external requests.
- **Rendering:** Canvas 2D with `devicePixelRatio` scaling; pre-rendered
  offscreen canvases for maze walls and glow sprites; additive compositing for
  STARSHELL's look.
- **Audio:** Web Audio API, fully synthesised (oscillators + generated noise);
  unlocked on first user gesture.
- **Input:** Touch (swipe + d-pad in TRENCHFOX), Pointer events (drag steering,
  second-finger / double-tap nova in STARSHELL), keyboard fallback, vibration
  haptics where supported.
- **Backend / database / ORM:** None. No server-side code.
- **Testing:** committed Playwright smoke suite in `tests/` (playwright-core,
  `npm test`), driven through in-game debug hooks; plus an optional bot-driven
  tuning harness (`tests/tune.js`).
- **Hosting/CI:** GitHub Pages via `.github/workflows/pages.yml`
  (checkout → configure-pages → upload repo root → deploy) on push to `main`
  (and the original feature branch) plus manual dispatch. Live since run #8;
  every subsequent `main` push redeploys automatically.

## 3. Architecture
- **Static multi-page site; each page a self-contained monolith** (deliberate:
  files must work standalone when copied or published as artifacts). Plain
  `<a href>` navigation from the hub.
- Directory structure:
  - `index.html` — arcade hub / launcher with LAUNCH buttons for both games
  - `trenchfox.html` — complete TRENCHFOX (~1150 lines)
  - `starshell.html` — complete STARSHELL (~990 lines)
  - `tests/` — QA suite (static server, three smoke tests, tuning harness, README)
  - `.github/workflows/pages.yml` — Pages deploy workflow
  - `manifest.webmanifest`, `sw.js`, `icons/` — PWA (installable, offline)
  - `README.md`, `PROJECT_BRIEF.md` — docs
- **Game loop (both):** single rAF loop → `update(dt)` (input → movement →
  collisions → state machine) → `draw()` → DOM HUD sync.
- **TRENCHFOX specifics:** three generated 28×31 trench layouts rotating per sector; tile-centre grid movement with
  buffered turns plus late-swipe corner forgiveness (a perpendicular swipe up
  to ~half a tile after an intersection executes retroactively, overshoot
  carried into the turn); four hunters (HOUND direct / VIPER ahead /
  SHADOW flank / STRAY erratic) on a scatter-chase schedule; signal flares
  expose the hunt, routed hunters regroup at the dugout; death opens with a
  0.5s full freeze; sector clear = hunters vanish + flare-wash flashes in 2.0s.
- **STARSHELL specifics:** continuous-space steering; wave-based difficulty
  (~24s build / ~6.5s lull cycles, each wave peaking higher; swifts from wave 2,
  hunters from wave 3); hunters attack in telegraphed cycles (stalk → 0.4s
  flare + audio wind-up with hard braking → straight lunge locked at launch →
  cooldown); graze ring charges the nova, with a rolling-1.5s graze combo
  scaling charge ×1→×2.5; CLOSE CALL bonus (nova fired with an enemy inside
  ~1.5× graze ring: chain starts at 200, feast +20% longer); chain scoring
  100→1600; seeded daily challenge with streaks; share card.
- **Authentication / authorisation:** None. No accounts, no PII.

## 4. Data Model
No database. All persistence is browser `localStorage`, per-device:
- TRENCHFOX: `trenchfox-high` (int), `trenchfox-muted` ('1'/'0')
- STARSHELL (JSON via a `store` wrapper, `starshell-` prefix; legacy `nova-*` saves migrate on first load): `starshell-best`, `starshell-muted`,
  `starshell-streak`, `starshell-lastDaily`, `starshell-daily-<YYYY-MM-DD>`
  (per-day best; yesterday's value feeds the menu display)

## 5. Features — Current State
| Feature | Status | Notes |
|---|---|---|
| TRENCHFOX: 3 rotating trench layouts, dispatches, flares, 4 hunters | Done | Covered by tests/trenchfox.test.js |
| TRENCHFOX: swipe + d-pad + keyboard, late-swipe corner forgiveness | Done | Corner cut asserted to snap to corridor centre |
| TRENCHFOX: 0.5s death freeze, sector-clear flare wash | Done | Timing asserted in tests |
| STARSHELL: steering, motes, combos, graze ring | Done | |
| STARSHELL: graze combo (×1→×2.5 charge) with HUD readout | Done | ×2.5 never observed in bot play — see §10 |
| STARSHELL: CLOSE CALL bonus + flourish | Done | 5/5 on deliberate point-blank dives, 1/5 incidental |
| STARSHELL: telegraphed hunter lunges | Done | All observed lunges preceded by ~0.4s wind-up |
| STARSHELL: wave pacing (build/lull, ambient cues) | Done | Lull ≈36% lower spawn rate than late build |
| STARSHELL: daily challenge, streaks, share card | Done | Menu shows streak / today / yesterday |
| Arcade hub with LAUNCH buttons | Done | |
| GitHub Pages deployment | **Live** | Auto-deploys on push to main; run #10 green |
| Committed QA suite (`npm test`) | Done | 3 suites, all green; fails on any console error |
| PWA (installable, offline play) | Done | manifest + icons + network-first SW; offline boot covered by tests/pwa.test.js |

## 6. API Surface
Not applicable — static pages only. Each game exposes a debug hook
(`window.__trenchfox`, `window.__starshell`) with read-only snapshots and test-only
triggers (press/kill/winLevel; charge/boom/kill/spawnHunter/spawns). Harmless
in production; used by the QA suite.

## 7. Security Posture
- No secrets anywhere; the workflow uses the ephemeral `GITHUB_TOKEN` with
  scoped permissions (`contents: read`, `pages: write`, `id-token: write`).
- Static files; no data leaves the device; `localStorage` access wrapped in
  try/catch. HTTPS via GitHub Pages.
- Known gaps: none material. Debug hooks allow client-side score manipulation,
  inherent to any client-only game (scores are per-device, not authoritative).

## 8. Testing & Quality
- **Committed:** `tests/` Playwright suite (`npm test`) — trenchfox, nova, hub, pwa;
  all green. Serves the repo root from a separate server process; every test
  fails on any console/page error. `tests/tune.js` runs bot-driven balance
  sessions.
- **Not covered:** real-device iOS Safari (all testing is emulated-mobile
  Chromium), `navigator.share` on device, STARSHELL behaviour past wave 4 (~90s+ —
  bots rarely survive that long), long-session performance on low-end phones.
- **Known bugs:** none currently known.
- **Technical debt (specific):**
  - ~150 lines of near-duplicated boilerplate between the two games (audio,
    storage, resize) — acceptable at 2 games, extract if a third is added.
  - GitHub Actions checkout/configure-pages emit Node 20 deprecation warnings;
    bump the action majors when released.
- **TODO/FIXME comments:** none.

## 9. Environment & Deployment
- **Run locally:** open any `.html` directly, or `python3 -m http.server 8000`.
  No env vars, no build.
- **Run tests:** `cd tests && npm install && CHROMIUM_PATH=<chromium> npm test`
  (see `tests/README.md`).
- **Deployment:** push to `main` → Pages workflow deploys the repo root →
  live at `https://9c5wdmytbt-glitch.github.io/petbook/` (hub), with
  `/trenchfox.html` and `/starshell.html` direct. `tests/` deploys as inert static
  files. Note: the `github-pages` environment only accepts deploys from the
  default branch (`main`).

## 10. Open Decisions & Risks
- **Tuning decisions awaiting human play-test (flagged, deliberately not
  auto-tuned):**
  1. Graze combo ×2.5 was never reached in bot sessions (max ×2). Achieving it
     needs 4 grazes in rolling 1.5s windows across ≥3 distinct shades (0.9s
     per-shade cooldown). Options: widen window to ~2s, cut per-shade cooldown
     to ~0.6s, or accept ×2.5 as aspirational.
  2. CLOSE CALL is deterministic for deliberate point-blank novas (5/5) and
     ~1-in-5 incidental. If a 1-in-3..1-in-5 rate for aggressive-but-imperfect
     play is preferred, shrink the danger radius ~20%.
  3. Wave lull reads as a ~36% spawn-rate drop; if human play wants more
     relief, raise the lull spawn interval (4.5s → 6s).
- **Risk (low):** claude.ai artifact copies of the games require re-publishing
  manually after changes (last refreshed after batch 2; in sync as of this
  brief).
- **Risk (low):** difficulty beyond wave 4 is extrapolated, not observed.

## 11. Recent Work & Next Steps
Recent work (newest first):
1. IP-clean rework in four staged commits: TRENCHFOX (all-new WWI trench
   theme, three generated + validated layouts, four renamed/re-behaved
   hunters, new art and audio, trenchfox-* storage) replaces the earlier
   maze game; STARSHELL (rename, flare-gold/night-blue palette, and a
   nova-* to starshell-* save migration) replaces NOVA; night-war hub;
   service-worker cache v3; test suite renamed and extended (per-layout
   reachability, flare exposure, migration).
2. Blank 192/180 PWA icon fix; icons now carry a flare + fox motif.
3. Earlier: PWA support, committed QA suite, two batches of gameplay
   polish, initial games + hub + Pages deploy (live since run #8).

Next steps, in priority order:
1. Human play-test to settle the three flagged tuning decisions (§10).
2. Real-device iOS Safari pass (share sheet, haptics, audio unlock, safe
   areas, home-screen install).
3. Consider a shared `arcade.js` if a third game is added.
4. Optional: exclude `tests/` from the deployed artifact for tidiness.
