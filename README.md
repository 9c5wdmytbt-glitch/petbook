# petbook

<p align="center">
  <a href="https://9c5wdmytbt-glitch.github.io/petbook/">
    <img src="https://img.shields.io/badge/%E2%96%B6%20LAUNCH%20ARCADE-ffd76a?style=for-the-badge&labelColor=04040c" alt="Launch the arcade">
  </a>
</p>

**[Launch the arcade &rarr;](https://9c5wdmytbt-glitch.github.io/petbook/)** — a hub page
([`index.html`](index.html)) with launch buttons for both games. Direct links:
[NOVA](https://9c5wdmytbt-glitch.github.io/petbook/nova.html) ·
[TRENCHFOX](https://9c5wdmytbt-glitch.github.io/petbook/trenchfox.html)
_(links go live once GitHub Pages is enabled)_

## NOVA (mobile)

An original one-thumb arena game: [`nova.html`](nova.html). One
self-contained file, no dependencies.

You are a spark of light hunted by a growing swarm. Drag to steer, collect light
motes to charge your nova, graze the swarm for bonus charge — then unleash it and
the hunters flee while you feast on them for chained points (200-400-800-1600 style).

- One-thumb drag steering, near-miss "graze" risk-reward, charge-and-reversal core loop
- Graze combos multiply charge rate; point-blank **CLOSE CALL** novas boost the feast
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

## Tests

A Playwright smoke suite lives in [`tests/`](tests/) — see
[`tests/README.md`](tests/README.md). `npm test` serves the repo statically
and exercises both games and the hub, failing on any console error.
