'use strict';
/* TRENCHFOX smoke test: boot, input, scoring, corner forgiveness, flare
   exposure, death freeze, all three maze layouts (rotation + integrity),
   pause — and zero console errors. */
const { BASE_URL, launch, assert, finish } = require('./lib');

/* Node-side maze integrity: every dispatch/flare reachable from spawn. */
function checkMaze(rows, label) {
  assert(rows.length === 31 && rows.every(r => r.length === 28), label + ': 28x31');
  assert(rows[12][13] === '-' && rows[12][14] === '-', label + ': dugout gate present');
  assert(rows[14][0] !== '#' && rows[14][27] !== '#', label + ': crawl-through open');
  const seen = Array.from({ length: 31 }, () => new Array(28).fill(false));
  const pass = (r, c) => {
    if (r === 14 && (c < 0 || c >= 28)) return true;
    return r >= 0 && r < 31 && c >= 0 && c < 28 && rows[r][c] !== '#' && rows[r][c] !== '-';
  };
  const q = [[23, 13]];
  seen[23][13] = true;
  while (q.length) {
    const [r, c] = q.pop();
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let nr = r + dr, nc = c + dc;
      if (nr === 14) nc = (nc + 28) % 28;
      if (pass(nr, nc) && !seen[nr][nc]) { seen[nr][nc] = true; q.push([nr, nc]); }
    }
  }
  let pellets = 0;
  for (let r = 0; r < 31; r++) for (let c = 0; c < 28; c++) {
    if (rows[r][c] === '.' || rows[r][c] === 'o') {
      pellets++;
      assert(seen[r][c], label + ': unreachable pellet at ' + r + ',' + c);
    }
  }
  assert(pellets > 100, label + ': enough dispatches (' + pellets + ')');
}

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/trenchfox.html');
  await page.waitForTimeout(500);

  let snap = await page.evaluate(() => window.__trenchfox.snapshot());
  assert(snap.state === 'start', 'boots to start screen');
  assert(snap.dots > 100, 'dispatches loaded');

  await page.touchscreen.tap(195, 400);
  await page.waitForTimeout(300);
  snap = await page.evaluate(() => window.__trenchfox.snapshot());
  assert(snap.state === 'ready', 'tap starts READY');

  // Layout-agnostic late-swipe corner cut: while the Fox runs horizontally,
  // press a legal perpendicular turn just after a tile centre and confirm the
  // retroactive cut (snap to corridor centre, overshoot carried).
  const cut = await page.evaluate(() => new Promise(resolve => {
    const maze = window.__trenchfox.maze();
    const pass = (r, c) => r >= 0 && r < 31 && c >= 0 && c < 28 && maze[r][c] !== '#' && maze[r][c] !== '-';
    let pressed = null;
    const iv = setInterval(() => {
      const s = window.__trenchfox.snapshot();
      if (s.state !== 'playing') return;
      const p = s.pac;
      if (pressed) {
        if (Math.abs(p.x - pressed.cx - 0.5) < 0.03 && Math.abs(p.y - pressed.row - 0.5) > 0.05) {
          clearInterval(iv); resolve({ ok: true, ...pressed });
        }
        if (Math.abs(p.x - pressed.cx - 0.5) > 2.5) pressed = null; // sailed by; rearm
        return;
      }
      const onRow = Math.abs(p.y - Math.floor(p.y) - 0.5) < 1e-3;
      if (!onRow) return;
      const row = Math.floor(p.y);
      // moving horizontally with a small overshoot past a centre?
      const fx = p.x - 0.5;
      const cx = Math.round(fx);
      const o = fx - cx;
      if (Math.abs(o) < 0.08 || Math.abs(o) > 0.38) return;
      for (const [dname, dr] of [['up', -1], ['down', 1]]) {
        if (pass(row + dr, cx)) {
          pressed = { cx, row, dname };
          window.__trenchfox.press(dname);
          return;
        }
      }
    }, 8);
    setTimeout(() => { clearInterval(iv); resolve({ ok: false }); }, 10000);
  }));
  assert(cut.ok, 'late swipe corner cut executes (' + JSON.stringify(cut) + ')');

  // dispatches are spaced along the trenches — run around for a bit
  await page.evaluate(() => new Promise(resolve => {
    const dirs = ['up', 'down', 'left', 'right'];
    let n = 0;
    const iv = setInterval(() => {
      window.__trenchfox.press(dirs[(Math.random() * 4) | 0]);
      if (++n > 16) { clearInterval(iv); resolve(); }
    }, 180);
  }));
  snap = await page.evaluate(() => window.__trenchfox.snapshot());
  assert(snap.score > 0, 'grabbing dispatches scores');

  // Flare: hunters exposed (fright), timer runs
  await page.evaluate(() => window.__trenchfox.flare());
  await page.waitForTimeout(200);
  snap = await page.evaluate(() => window.__trenchfox.snapshot());
  assert(snap.frightTimer > 0, 'flare starts the exposure window');
  const active = snap.ghosts.filter(g => g.state === 'active');
  assert(active.length > 0 && active.every(g => g.fright), 'active hunters exposed by the flare');

  // dynamic music: layers live after the audio unlock; the flare reversal
  // must escalate the mode to triumph while the exposure window runs
  const mus = await page.evaluate(() => window.__trenchfox.music());
  assert(mus.ready, 'music layers initialised');
  assert(mus.mode === 'triumph', 'flare reversal escalates music to triumph (' + mus.mode + ')');

  // juice: running down exposed hunters fires ROUTED callout popups
  const routs = await page.evaluate(() => {
    let n = 0;
    while (n < 3 && window.__trenchfox.routNearest()) n++;
    return { n, popups: window.__trenchfox.snapshot().popups };
  });
  assert(routs.n >= 1, 'ran down at least one exposed hunter');
  if (routs.n >= 2) {
    assert(routs.popups.some(t => /ROUTED ×2!|FULL ROUT!/.test(t)),
      'ROUTED callout popup shown (' + routs.popups.join(',') + ')');
  } else {
    console.log('note: only one hunter active at flare time — callout needs a chain of 2');
  }
  await page.waitForTimeout(2500);

  // Death: 0.5s freeze then sequence, ~2.6s total, hunters immobile
  const death = await page.evaluate(() => new Promise(resolve => {
    const g0 = JSON.stringify(window.__trenchfox.snapshot().ghosts.map(g => [g.x, g.y]));
    window.__trenchfox.kill();
    const t0 = performance.now();
    let frozen = true;
    const iv = setInterval(() => {
      const t = performance.now() - t0;
      const s = window.__trenchfox.snapshot();
      if (s.state === 'dying' &&
          JSON.stringify(s.ghosts.map(g => [g.x, g.y])) !== g0) frozen = false;
      if (s.state !== 'dying') { clearInterval(iv); resolve({ t, frozen, lives: s.lives, state: s.state }); }
      if (t > 4000) { clearInterval(iv); resolve({ timeout: true }); }
    }, 60);
  }));
  assert(!death.timeout, 'death sequence ends');
  assert(death.t > 2400 && death.t < 2900, 'death ~2.6s incl. freeze, got ' + Math.round(death.t));
  assert(death.frozen, 'hunters frozen through death');
  assert(death.lives === 2, 'a life is lost');

  await page.waitForTimeout(2000);

  // All three sectors: rotation, refill, and per-layout integrity
  const seenMazes = [];
  for (let i = 0; i < 3; i++) {
    const info = await page.evaluate(() => ({
      maze: window.__trenchfox.maze(),
      snap: window.__trenchfox.snapshot(),
    }));
    seenMazes.push(info);
    checkMaze(info.maze, 'sector ' + info.snap.level + ' (maze ' + info.snap.mazeIndex + ')');
    if (i < 2) {
      await page.evaluate(() => window.__trenchfox.winLevel());
      await page.waitForTimeout(4300);
    }
  }
  const idxs = seenMazes.map(m => m.snap.mazeIndex);
  assert(new Set(idxs).size === 3, 'three distinct layouts rotate: ' + idxs.join(','));
  assert(seenMazes[2].snap.dots > 100, 'dispatches refilled each sector');

  // Pause / resume
  await page.click('#btnPause');
  await page.waitForTimeout(150);
  snap = await page.evaluate(() => window.__trenchfox.snapshot());
  assert(snap.state === 'paused', 'pause works');
  await page.click('#btnPause');
  await page.waitForTimeout(150);
  snap = await page.evaluate(() => window.__trenchfox.snapshot());
  assert(snap.state === 'playing', 'resume works');

  // Natural sector clear: reduce the board to the 2 nearest dispatches and
  // let a BFS-pathing bot eat them for real — the levelclear must come from
  // the genuine last-dispatch path, not the winLevel shortcut.
  const natural = await page.evaluate(() => new Promise(resolve => {
    window.__trenchfox.eatAllBut(2);
    const start = window.__trenchfox.snapshot();
    const maze = window.__trenchfox.maze();
    const pass = (r, c) => {
      if (r === 14 && (c < 0 || c >= 28)) return true;
      return r >= 0 && r < 31 && c >= 0 && c < 28 && maze[r][c] !== '#' && maze[r][c] !== '-';
    };
    // BFS next-step toward the nearest remaining dispatch
    const nextDir = (fr, fc, targets) => {
      const key = (r, c) => r * 28 + ((c + 28) % 28);
      const tset = new Set(targets.map(t => key(t.r, t.c)));
      const prev = new Map();
      const q = [[fr, fc]];
      prev.set(key(fr, fc), null);
      while (q.length) {
        const [r, c] = q.shift();
        if (tset.has(key(r, c))) {
          let cur = [r, c], par = prev.get(key(r, c));
          while (par && prev.get(key(par[0], par[1])) !== null) { cur = par; par = prev.get(key(par[0], par[1])); }
          if (!par) return null; // already on target
          const dr = cur[0] - fr;
          let dc = cur[1] - fc;
          if (dc > 1) dc -= 28;          // crawl-through wrap
          if (dc < -1) dc += 28;
          if (dr === 1) return 'down';
          if (dr === -1) return 'up';
          return dc === 1 ? 'right' : 'left';
        }
        for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          let nr = r + dr, nc = c + dc;
          if (nr === 14) nc = (nc + 28) % 28;
          if (pass(nr, nc) && !prev.has(key(nr, nc))) { prev.set(key(nr, nc), [r, c]); q.push([nr, nc]); }
        }
      }
      return null;
    };
    const iv = setInterval(() => {
      const s = window.__trenchfox.snapshot();
      if (s.state === 'levelclear' || (s.state === 'ready' && s.level > start.level)) {
        clearInterval(iv);
        resolve({ ok: true, dotsAtSetup: start.dots });
        return;
      }
      if (s.state !== 'playing') return;
      // survive: if a hunter is close, flare escape hatch
      // (cheap and rare; the point of this test is the clear path)
      const fr = Math.floor(s.pac.y), fc = Math.floor(s.pac.x);
      const near = s.ghosts.some(g => g.state === 'active' && !g.fright &&
        Math.abs(g.x - s.pac.x) + Math.abs(g.y - s.pac.y) < 4);
      if (near && s.frightTimer <= 0) window.__trenchfox.flare();
      // remaining dispatches from the live grid via maze()? snapshot has dots;
      // recompute targets by asking the page grid through eatAllBut(999)? No:
      // track via a scan hook — simplest: scan DOM-side each tick
      const targets = window.__trenchfox.dispatches();
      if (!targets.length) return;
      const d = nextDir(fr, fc, targets);
      if (d) window.__trenchfox.press(d);
    }, 110);
    setTimeout(() => { clearInterval(iv); resolve({ ok: false }); }, 25000);
  }));
  assert(natural.ok, 'eating the last dispatch triggers the real sector clear');

  // Arcade XP: run all remaining lives down; game over must bank arcade-xp
  // and show rank + XP-gained on the overlay
  await page.waitForTimeout(2500); // let the ready phase finish
  const xpBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('arcade-xp')) || 0);
  const over = await page.evaluate(() => new Promise(resolve => {
    const t0 = performance.now();
    let sawVig = 0;
    const iv = setInterval(() => {
      const s = window.__trenchfox.snapshot();
      if (s.lives === 0) sawVig = Math.max(sawVig, s.vig);
      if (s.state === 'gameover') {
        clearInterval(iv);
        resolve({
          msg: document.getElementById('ovMsg').textContent,
          xp: JSON.parse(localStorage.getItem('arcade-xp')) || 0,
          sawVig,
        });
        return;
      }
      if (s.state === 'playing') window.__trenchfox.kill();
      if (performance.now() - t0 > 30000) { clearInterval(iv); resolve(null); }
    }, 400);
  }));
  assert(over, 'lives run down to game over');
  assert(over.sawVig > 0.2, 'near-death vignette engages on the final life (' + over.sawVig.toFixed(2) + ')');
  assert(/RANK [A-Z ]+/.test(over.msg) && /\+\d+ XP/.test(over.msg),
    'game over shows rank + XP gained');
  assert(over.xp > xpBefore, 'arcade-xp banked (' + xpBefore + ' -> ' + over.xp + ')');

  await finish(browser, errors, 'trenchfox.test');
})().catch(e => { console.error('FAIL trenchfox.test:', e.message); process.exit(1); });
