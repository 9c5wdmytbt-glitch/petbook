# petbook

<p align="center">
  <a href="https://9c5wdmytbt-glitch.github.io/petbook/">
    <img src="https://img.shields.io/badge/%E2%96%B6%20LAUNCH%20ARCADE-ffd76a?style=for-the-badge&labelColor=04040c" alt="Launch the arcade">
  </a>
</p>

**[Launch the arcade &rarr;](https://9c5wdmytbt-glitch.github.io/petbook/)** — a hub page
([`index.html`](index.html)) with launch buttons for all three games. Direct links:
[LAST FLARE](https://9c5wdmytbt-glitch.github.io/petbook/lastflare.html) ·
[STARSHELL](https://9c5wdmytbt-glitch.github.io/petbook/starshell.html) ·
[TRENCHFOX](https://9c5wdmytbt-glitch.github.io/petbook/trenchfox.html)

## LAST FLARE (mobile) — the flagship

A one-thumb survivor-style roguelite in a single self-contained file:
[`lastflare.html`](lastflare.html). Hold the line as escalating waves close in —
your guns fire themselves, you drive the positioning.

- Drag to move, auto-fire; 3–6 minute runs with instant retry
- Field promotions: pick 1 of 3 cards each level — four weapons (rifle, trench
  mortar, flare gun, bayonet sweep) with four visible upgrade tiers each, plus
  four passives; by minute 4 the screen is full of fire
- Meta progression: salvage banks win or lose, a barracks with four unlockable
  operators (the Fox comes last), permanent perks, a medals album with visible
  locked slots, and a rank ladder driven by lifetime salvage
- Seeded **Daily Operation**: a fixed operator, deterministic waves and upgrade
  offers, one rotating modifier, 5:00 extraction to win, streaks, and a
  Wordle-style emoji share card
- Session missions with salvage bonuses; adaptive endless difficulty
  (±20% rubber-band off your recent run lengths)
- Dynamic three-layer synth soundtrack (calm → pressure → last stand), damage
  popups, wave callouts, near-death vignette, haptics
- Performance budget: object pools (200 enemies / 300 projectiles / 400
  particles), off-screen culling, batched draws, and a graceful degradation
  ladder that halves particles before capping enemies under sustained load

## STARSHELL (mobile)

An original one-thumb arena game: [`starshell.html`](starshell.html). One
self-contained file, no dependencies.

You are a spark of light hunted by a growing swarm. Drag to steer, collect light
motes to charge your star shell, graze the swarm for bonus charge — then fire it and
the hunters flee while you feast on them for chained points (200-400-800-1600 style).

- One-thumb drag steering, near-miss "graze" risk-reward, charge-and-reversal core loop
- Graze combos multiply charge rate; point-blank **CLOSE CALL** bursts boost the feast
- Wave-based pacing: pressure builds, a brief lull, then a higher peak — with
  telegraphed hunter lunges you can sidestep
- Juice: particles, shockwaves, hit-stop slow-mo, screen shake, haptics, synth audio
- Short runs with instant restart, endless mode + seeded **Daily Challenge** with streaks
- Share button (native share sheet / clipboard), persistent best score

## TRENCHFOX (mobile)

An original maze-chase set in a WWI night trench network, in a single
self-contained file: [`trenchfox.html`](trenchfox.html). You are the Fox, a
dispatch runner — grab every dispatch, use the crawl-through, and when a
signal flare goes up the four hunters are exposed and can be run down.

**Controls**

- **Mobile:** swipe anywhere (late swipes forgive — corners cut cleanly), or the on-screen d-pad
- **Desktop:** arrow keys or WASD, `P`/`Space` to pause

**Features**

- Three original trench layouts rotating per sector, each generated and
  validated for full reachability
- Four hunters with distinct behaviours and silhouettes: HOUND (direct chase),
  VIPER (strikes ahead), SHADOW (predictive flank), STRAY (erratic)
- Signal flares expose the hunt; routed hunters regroup at their dugout
- Sectors speed up, supply-crate bonuses, extra life at 10,000, persistent best

## Shared arcade systems

All three games feed one **arcade rank** (`arcade-xp`, shown on the hub and
on every game-over screen), roll three **session missions** per run that
rotate on the daily seed and pay arcade XP, and play a **dynamic three-layer
synth soundtrack** themed per game (march/tension/triumph in the trenches,
calm/pressure/release + heartbeat under the stars, calm/pressure/last-stand
holding the line) — with the same reward juice throughout: floating popups,
escalating pickup pitch, big-moment callouts, and a near-death vignette.

## Tests

A Playwright smoke suite lives in [`tests/`](tests/) — see
[`tests/README.md`](tests/README.md). `npm test` serves the repo statically
and exercises all three games and the hub — including LAST FLARE's daily-seed
determinism (the same date string must produce identical waves and upgrade
offers) — failing on any console error.
