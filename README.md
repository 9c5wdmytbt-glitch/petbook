# petbook

## NOVA (mobile)

An original arcade game built on the Pac-Man loop, redesigned for today's players:
[`nova.html`](nova.html). One self-contained file, no dependencies.

You are a spark of light hunted by a growing swarm. Drag to steer, collect light
motes to charge your nova, graze the swarm for bonus charge — then unleash it and
the hunters flee while you feast on them for chained points (200-400-800-1600 style).

- One-thumb drag steering, near-miss "graze" risk-reward, charge-and-reversal core loop
- Juice: particles, shockwaves, hit-stop slow-mo, screen shake, haptics, synth audio
- Short runs with instant restart, endless mode + seeded **Daily Challenge** with streaks
- Share button (native share sheet / clipboard), persistent best score

## Pac-Man (mobile)

A touch-friendly Pac-Man game in a single self-contained file: [`index.html`](index.html).
No build step or dependencies — open it in any browser, or serve the repo with
GitHub Pages / any static host and play on your phone.

**Controls**

- **Mobile:** swipe anywhere on the maze, or use the on-screen d-pad
- **Desktop:** arrow keys or WASD, `P`/`Space` to pause

**Features**

- Classic 28×31 maze with pellets, power pellets, bonus fruit, and the side tunnel
- Four ghosts with authentic AI personalities (Blinky, Pinky, Inky, Clyde),
  scatter/chase cycles, frightened mode, and eyes returning to the ghost house
- Levels with increasing speed and shrinking frightened time, extra life at 10,000
- Score popups, sounds (mutable), pause, and a persistent high score
