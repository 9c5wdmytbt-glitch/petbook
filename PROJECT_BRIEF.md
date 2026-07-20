# PROJECT BRIEF — Petbook Arcade
Date: 2026-07-20 (updated after batch 2)

## 1. Purpose & Business Context
- A mobile-first browser arcade containing two complete games: a faithful Pac-Man
  recreation and **NOVA**, an original arcade game that modernises the Pac-Man
  loop (hunted → charge a power-up → reversal → feast) for today's players.
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
  NOVA's look.
- **Audio:** Web Audio API, fully synthesised (oscillators + generated noise);
  unlocked on first user gesture.
- **Input:** Touch (swipe + d-pad in Pac-Man), Pointer events (drag steering,
  second-finger / double-tap nova in NOVA), keyboard fallback, vibration
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
  - `pacman.html` — complete Pac-Man (~960 lines)
  - `nova.html` — complete NOVA (~990 lines)
  - `tests/` — QA suite (static server, three smoke tests, tuning harness, README)
  - `.github/workflows/pages.yml` — Pages deploy workflow
  - `README.md`, `PROJECT_BRIEF.md` — docs
- **Game loop (both):** single rAF loop → `update(dt)` (input → movement →
  collisions → state machine) → `draw()` → DOM HUD sync.
- **Pac-Man specifics:** 28×31 string-map maze; tile-centre grid movement with
  buffered turns plus late-swipe corner forgiveness (a perpendicular swipe up
  to ~half a tile after an intersection executes retroactively, overshoot
  carried into the turn); authentic four-ghost AI (chase/ambush/flank/shy,
  scatter-chase schedule, frightened, eyes-return); death opens with a 0.5s
  full freeze; level clear = ghosts vanish + 4-5 wall flashes in 2.0s.
- **NOVA specifics:** continuous-space steering; wave-based difficulty
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
- Pac-Man: `pacman-high` (int), `pacman-muted` ('1'/'0')
- NOVA (JSON via a `store` wrapper, `nova-` prefix): `nova-best`, `nova-muted`,
  `nova-streak`, `nova-lastDaily` (YYYY-MM-DD), `nova-daily-<YYYY-MM-DD>`
  (per-day best; yesterday's value feeds the menu display)

## 5. Features — Current State
| Feature | Status | Notes |
|---|---|---|
| Pac-Man: maze, pellets, fruit, tunnel, 4-ghost AI, levels | Done | Covered by tests/pacman.test.js |
| Pac-Man: swipe + d-pad + keyboard, late-swipe corner forgiveness | Done | Corner cut asserted to snap to corridor centre |
| Pac-Man: 0.5s death freeze, level-clear flash celebration | Done | Timing + pixel-sampled in tests |
| NOVA: steering, motes, combos, graze ring | Done | |
| NOVA: graze combo (×1→×2.5 charge) with HUD readout | Done | ×2.5 never observed in bot play — see §10 |
| NOVA: CLOSE CALL bonus + flourish | Done | 5/5 on deliberate point-blank dives, 1/5 incidental |
| NOVA: telegraphed hunter lunges | Done | All observed lunges preceded by ~0.4s wind-up |
| NOVA: wave pacing (build/lull, ambient cues) | Done | Lull ≈36% lower spawn rate than late build |
| NOVA: daily challenge, streaks, share card | Done | Menu shows streak / today / yesterday |
| Arcade hub with LAUNCH buttons | Done | |
| GitHub Pages deployment | **Live** | Auto-deploys on push to main; run #10 green |
| Committed QA suite (`npm test`) | Done | 3 suites, all green; fails on any console error |
| PWA (installable, offline cache) | Planned | Not started |

## 6. API Surface
Not applicable — static pages only. Each game exposes a debug hook
(`window.__pacman`, `window.__nova`) with read-only snapshots and test-only
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
- **Committed:** `tests/` Playwright suite (`npm test`) — pacman, nova, hub;
  all green. Serves the repo root from a separate server process; every test
  fails on any console/page error. `tests/tune.js` runs bot-driven balance
  sessions.
- **Not covered:** real-device iOS Safari (all testing is emulated-mobile
  Chromium), `navigator.share` on device, NOVA behaviour past wave 4 (~90s+ —
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
  `/pacman.html` and `/nova.html` direct. `tests/` deploys as inert static
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
Recent work (batch 2, newest first — one commit per item):
1. `b4f6742` tests: pointer-helper + tuning-harness measurement fixes
2. `f4f19dd` committed QA suite under `tests/`
3. `fde0f41` Pac-Man level-clear celebration
4. `177a0e9` Pac-Man half-second death freeze
5. `8b2f190` NOVA wave-based difficulty pacing
6. `6df94fb` NOVA telegraphed hunter lunges
Earlier (batch 1): corner forgiveness, graze combo, CLOSE CALL, daily hook;
before that: both games, hub, Pages deploy (live since run #8).

Next steps, in priority order:
1. Human play-test to settle the three flagged tuning decisions (§10).
2. PWA manifest + service worker so both games install to the home screen.
3. Real-device iOS Safari pass (share sheet, haptics, audio unlock, safe areas).
4. Consider a shared `arcade.js` if a third game is added.
5. Optional: exclude `tests/` from the deployed artifact for tidiness.
