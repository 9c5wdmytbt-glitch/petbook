# PROJECT BRIEF — Petbook Arcade
Date: 2026-07-20

## 1. Purpose & Business Context
- A mobile-first browser arcade containing two complete games: a faithful Pac-Man
  recreation and **NOVA**, an original arcade game that modernises the Pac-Man
  loop (hunted → charge a power-up → reversal → feast) for today's players.
  Everything is plain HTML/CSS/JavaScript with zero dependencies and zero build
  step — each game is one self-contained file that runs in any modern browser.
- Target users: casual mobile players. Games are tuned for one-thumb play
  (swipe / drag / on-screen d-pad), short sessions, and instant restart, with
  desktop keyboard support as a secondary path.
- Current stage: **MVP, feature-complete and smoke-tested**. The code is done and
  pushed; public hosting is the only unfinished step (see §10).
- Note: the repository is named `petbook`, but it contains no pet-related code —
  it was an empty repo (README only) that this arcade was built into.

## 2. Tech Stack
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (ES2017+, `'use strict'`).
  No frameworks, no npm packages, no build step, no external assets — a strict
  self-containment constraint so the pages also run under claude.ai's Artifact
  CSP, which blocks all external requests.
- **Rendering:** Canvas 2D with `devicePixelRatio` scaling (capped ×2–×3);
  pre-rendered offscreen canvases for expensive visuals (maze walls, radial
  glow sprites); additive (`lighter`) compositing for the NOVA glow aesthetic.
- **Audio:** Web Audio API, fully synthesised at runtime (oscillators + one
  generated noise buffer) — no audio files. Unlocked on first user gesture as
  required by mobile browsers.
- **Input:** Touch events (Pac-Man swipe + d-pad), Pointer events (NOVA drag
  steering, second-finger / double-tap nova trigger), keyboard fallback
  (arrows/WASD, P/Space). `navigator.vibrate` haptics where supported.
- **Backend / database / ORM:** None. There is no server-side code at all.
- **Third-party runtime services:** None. `navigator.share` and clipboard are
  used for the NOVA share card; `localStorage` for persistence.
- **Dev/test tooling (not committed):** `playwright-core` driving the
  pre-installed Chromium, used from the session scratchpad for automated
  smoke tests. Not part of the repo.
- **Hosting/CI:** GitHub Pages via GitHub Actions
  (`.github/workflows/pages.yml`): checkout → `actions/configure-pages@v5`
  (`enablement: true`) → `upload-pages-artifact@v3` (repo root) →
  `deploy-pages@v4`, on push to `main` / the working branch, plus manual
  dispatch. **Not yet live** — see §10.

## 3. Architecture
- **Static multi-page site; each page is a self-contained monolith.** No shared
  code between pages (deliberate: each file must work standalone when copied,
  attached, or published as an artifact). No routing beyond plain `<a href>`
  navigation from the hub.
- Directory structure:
  - `index.html` — arcade hub / launcher: two game cards with LAUNCH buttons (108 lines)
  - `pacman.html` — complete Pac-Man game: maze, 4-ghost AI, levels, sound (935 lines)
  - `nova.html` — complete NOVA game: arena, swarm AI, nova mechanic, daily mode (913 lines)
  - `README.md` — project description, controls, feature lists, launch links
  - `.github/workflows/pages.yml` — GitHub Pages deploy workflow
- **Data flow (per game page):** single `requestAnimationFrame` loop →
  `update(dt)` (fixed-clamped delta; input → entity movement → collisions →
  scoring/state machine) → `draw()` (full-canvas redraw) → lightweight DOM HUD
  sync. State machines: Pac-Man `start → ready → playing → dying/levelclear →
  gameover`; NOVA `menu → playing → dying → gameover` (+ `paused` in both,
  auto-pause on `visibilitychange`).
- **Game logic highlights:**
  - Pac-Man: 28×31 tile maze as a string map; tile-centre grid movement with
    buffered turns; authentic ghost personalities (Blinky chase, Pinky ambush,
    Inky flank, Clyde shy) with scatter/chase schedule, frightened mode, and
    eyes-return-to-house; tunnel wrap; fruit; 10k extra life.
  - NOVA: continuous-space steering (pointer-seek with easing); swarm AI
    (seek + separation, three enemy types incl. a predictive "hunter");
    graze detection ring; charge meter; nova reversal with chain scoring
    (100→1600); hit-stop slow-mo, screen shake, particles; seeded daily mode
    (mulberry32 over the date string) with streak tracking.
- **Authentication / authorisation:** None. No accounts, no sessions, no PII.

## 4. Data Model
No database. All persistence is browser `localStorage`, per-device:
- Pac-Man: `pacman-high` (int high score), `pacman-muted` ('1'/'0')
- NOVA (all JSON via a small `store` wrapper, `nova-` prefix):
  `nova-best` (int), `nova-muted` (bool), `nova-streak` (int),
  `nova-lastDaily` (YYYY-MM-DD of last daily played),
  `nova-daily-<YYYY-MM-DD>` (int, best score for that day's seeded run)
- Nothing unusual: no soft deletes, tenancy, or audit concerns — data never
  leaves the device.

## 5. Features — Current State
| Feature | Status | Notes |
|---|---|---|
| Pac-Man: maze, pellets, power pellets, fruit, tunnel | Done | Smoke-tested in mobile-viewport Chromium |
| Pac-Man: 4-ghost AI (scatter/chase/frightened/eyes) | Done | Classic targeting rules incl. Inky vector math |
| Pac-Man: swipe + d-pad + keyboard controls | Done | D-pad shown on coarse pointers only |
| Pac-Man: levels, lives, extra life, high score | Done | High score persists |
| NOVA: drag steering, motes, combo chains | Done | Bot-driven test collected motes, built combos |
| NOVA: graze mechanic + charge meter | Done | Verified meter fill via grazes in test |
| NOVA: nova reversal + chain feast (100→1600) | Done | Verified ×5 chain in automated run |
| NOVA: three enemy types, surge waves, difficulty ramp | Done | Hunter leads target by velocity |
| NOVA: endless + seeded Daily Challenge + streaks | Done | Same seed worldwide per calendar day |
| NOVA: share button (native sheet / clipboard) | Done | Untested on real iOS share sheet |
| Both: synth audio + mute, haptics, auto-pause | Done | Audio requires first-gesture unlock |
| Arcade hub with LAUNCH buttons | Done | Navigation to both games verified |
| GitHub Pages deployment | **Broken/Blocked** | Workflow correct; all 4 runs failed because the repo is private (see §10) |
| claude.ai Artifact publishing | Done, limited | Both games published; viewable only when signed in to claude.ai on the web |
| PWA (installable, offline cache) | Planned | Not started; pages already work offline once loaded |

Untested areas: real-device iOS Safari (all testing was emulated-mobile
Chromium), `navigator.share` on device, long-session performance on low-end
phones, NOVA difficulty balance beyond ~2 minutes of play.

## 6. API Surface
Not applicable — there is no server and no HTTP API. The only "surface" is the
three static pages. Each game exposes a small `window.__pacman` / `window.__nova`
debug object (read-only snapshots + test triggers) used by the automated tests;
harmless in production but present.

## 7. Security Posture
- **Secrets:** none exist in the codebase — no keys, tokens, or config. The
  Pages workflow uses only the ephemeral `GITHUB_TOKEN` provided by Actions
  with explicitly scoped permissions (`contents: read`, `pages: write`,
  `id-token: write`).
- **Attack surface:** static files only; no user input is stored or transmitted;
  no cookies; no third-party scripts. `localStorage` reads are wrapped in
  try/catch and `JSON.parse` is applied only to values this app wrote.
- **Transport:** GitHub Pages serves over HTTPS by default once live.
- **Known gaps:** none material for a static arcade. The debug hooks noted in
  §6 allow score manipulation client-side, which is inherent to any client-only
  game (high scores are per-device and not authoritative anywhere).

## 8. Testing & Quality
- **What exists:** automated Playwright smoke tests (session scratchpad, not
  committed) covering: game boot, state transitions, touch/pointer input
  simulation, score/meter progression, Pac-Man death + life loss, NOVA nova
  firing (button, double-tap) and chain eating via a mote-seeking/shade-dodging
  bot, pause, retry, daily mode, and console-error assertions (zero errors on
  final runs). Visual review via screenshots at each milestone.
- **What doesn't exist:** no unit tests, no committed test suite, no CI test
  job, no real-device testing, no cross-browser matrix (Chromium only).
- **Known bugs:** none currently known. Two visual bugs found during
  development (Pac-Man HUD score not updating live; NOVA CHAIN/NOVA HUD text
  overlap + unreadable empty nova button) were fixed and re-verified.
- **Technical debt (specific):**
  - Test scripts live outside the repo; committing them under `tests/` with a
    package.json would make QA reproducible.
  - ~150 lines of near-duplicated boilerplate between the two games (audio
    engine, storage wrapper, resize logic) — acceptable at 2 games, worth
    extracting if a third is added.
  - `actions/checkout@v4` / `configure-pages@v5` emit Node 20 deprecation
    warnings on GitHub's runners; bump when v5/v6 majors land.
- **TODO/FIXME comments in code:** none (verified by grep).

## 9. Environment & Deployment
- **Run locally:** no install or env vars needed. Either open any of the three
  `.html` files directly in a browser, or serve statically, e.g.
  `python3 -m http.server 8000` then visit `http://localhost:8000/`.
- **Run the smoke tests (optional):** `npm i playwright-core` anywhere, point
  it at a Chromium binary, and drive `pacman.html` / `nova.html` via their
  `window.__pacman` / `window.__nova` hooks.
- **Deployment (intended):** merge/keep files on a deployable branch → the
  `pages.yml` workflow uploads the repo root to GitHub Pages →
  site at `https://9c5wdmytbt-glitch.github.io/petbook/` (hub), with
  `/pacman.html` and `/nova.html` as direct game URLs. Also deployable to any
  static host (Netlify/Vercel/S3) by copying the three HTML files.
- **Current deployment state:** workflow present and syntactically verified;
  every run so far fails at `configure-pages` with "Resource not accessible by
  integration" because **GitHub Pages cannot be enabled on a private repo on a
  free plan**.

## 10. Open Decisions & Risks
- **Blocking:** repo visibility. Pages requires `petbook` to be public (or a
  paid GitHub plan). The owner has attempted the switch from mobile several
  times without it completing (the typed-confirmation step is easy to abandon);
  as of this brief the API still reports `private: true`. This session's
  credentials cannot flip visibility (proxy policy blocks repository-settings
  writes) and cannot create an alternative public repo (integration scoped to
  this repo only) — so the switch must be completed by the owner in a browser.
- **Decision pending:** merge the working branch
  (`claude/pacman-mobile-game-tsx383`) to `main` — an open PR (#1) exists.
  The Pages workflow already triggers on both branches, so this is tidiness,
  not a blocker.
- **Decision pending:** whether hosting should instead live in a separate
  public `petbook-arcade` repo to keep `petbook` private (owner approved this
  once, but it proved impossible from this session; would need the owner to
  create the repo or grant broader credentials).
- **Risk (low):** claude.ai Artifact links confuse on mobile — private
  artifacts show a 404/sign-in to browsers without a claude.ai web session.
  Not a product risk once Pages is live.
- **Risk (low):** NOVA difficulty tuning is based on bot runs and brief manual
  review, not real-player data.

## 11. Recent Work & Next Steps
Recent work (this session, newest first):
1. Arcade hub `index.html` with LAUNCH buttons; Pac-Man moved to `pacman.html`;
   README launch badge (commit `6a42c69`).
2. GitHub Pages workflow added (`dc6a837`); four deploy attempts, all blocked
   by repo visibility.
3. NOVA built, tested, and fixed (HUD overlap, nova button) (`23c4061`).
4. Pac-Man built and tested; live-HUD fix (`1cc6390`).
5. Both games published as claude.ai Artifacts; multiple rounds of
   mobile-access troubleshooting (in-app browser auth, file viewer showing
   source instead of rendering).

Next steps, in priority order:
1. **Owner completes the repo visibility switch to Public** (sole blocker).
2. Re-run `pages.yml` (manual dispatch), confirm green, verify the three URLs
   load, and share the launch link.
3. Merge PR #1 to `main` so Pages tracks the default branch.
4. Commit the Playwright smoke tests into `tests/` for repeatable QA.
5. Tune NOVA difficulty from real play feedback; consider a PWA manifest +
   service worker so both games install to the home screen.
