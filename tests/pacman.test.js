'use strict';
/* Pac-Man smoke test: boot, input, scoring, corner cut, death pause,
   level clear, pause — and zero console errors. */
const { BASE_URL, launch, assert, finish } = require('./lib');

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/pacman.html');
  await page.waitForTimeout(500);

  let snap = await page.evaluate(() => window.__pacman.snapshot());
  assert(snap.state === 'start', 'boots to start screen');
  assert(snap.dots === 244, 'pellets loaded');

  await page.touchscreen.tap(195, 400);
  await page.waitForTimeout(300);
  snap = await page.evaluate(() => window.__pacman.snapshot());
  assert(snap.state === 'ready', 'tap starts READY');

  // Late-swipe corner cut: armed during READY so the watcher catches the
  // narrow window. Pac moves left from (13.5,23.5) when play begins; press up
  // just after he passes the (12,23) intersection where up is legal.
  let sawPlaying = false;
  const cut = await page.evaluate(() => new Promise(resolve => {
    let pressed = null;
    const iv = setInterval(() => {
      const s = window.__pacman.snapshot();
      if (s.state !== 'playing') return;
      window.__sawPlaying = true;
      const p = s.pac;
      if (!pressed && p.y === 23.5 && p.x < 12.45 && p.x > 12.1) {
        pressed = { x: p.x };
        window.__pacman.press('up');
      }
      if (pressed && p.y < 23.4) { clearInterval(iv); resolve({ ok: true, x: p.x }); }
      if (pressed && p.x < 11.0) { clearInterval(iv); resolve({ ok: false }); }
    }, 8);
    setTimeout(() => { clearInterval(iv); resolve({ ok: false, timeout: true }); }, 8000);
  }));
  assert(cut.ok, 'late swipe executes a corner cut');
  assert(Math.abs(cut.x - 12.5) < 0.05, 'corner cut snaps to the corridor centre');
  sawPlaying = await page.evaluate(() => !!window.__sawPlaying);
  assert(sawPlaying, 'READY leads to playing');

  // Scoring: pellets eaten so far
  snap = await page.evaluate(() => window.__pacman.snapshot());
  assert(snap.score > 0, 'eating pellets scores');

  // Death: 0.5s freeze (ghosts immobile) then sequence, ~2.6s total
  const death = await page.evaluate(() => new Promise(resolve => {
    const g0 = JSON.stringify(window.__pacman.snapshot().ghosts.map(g => [g.x, g.y]));
    window.__pacman.kill();
    const t0 = performance.now();
    let frozen = true;
    const iv = setInterval(() => {
      const t = performance.now() - t0;
      const s = window.__pacman.snapshot();
      if (s.state === 'dying' &&
          JSON.stringify(s.ghosts.map(g => [g.x, g.y])) !== g0) frozen = false;
      if (s.state !== 'dying') { clearInterval(iv); resolve({ t, frozen, lives: s.lives, state: s.state }); }
      if (t > 4000) { clearInterval(iv); resolve({ timeout: true }); }
    }, 60);
  }));
  assert(!death.timeout, 'death sequence ends');
  assert(death.t > 2400 && death.t < 2900, 'death takes ~2.6s (0.5s freeze included), got ' + Math.round(death.t));
  assert(death.frozen, 'ghosts frozen through death');
  assert(death.lives === 2, 'a life is lost');
  assert(death.state === 'ready', 'respawns to READY');

  await page.waitForTimeout(2000); // back to playing

  // Level clear: ~2s celebration then next level with refilled pellets
  const clear = await page.evaluate(() => new Promise(resolve => {
    window.__pacman.winLevel();
    const t0 = performance.now();
    const iv = setInterval(() => {
      const t = performance.now() - t0;
      const s = window.__pacman.snapshot();
      if (s.state === 'ready') { clearInterval(iv); resolve({ t, level: s.level, dots: s.dots }); }
      if (t > 4000) { clearInterval(iv); resolve({ timeout: true }); }
    }, 60);
  }));
  assert(!clear.timeout, 'level clear ends');
  assert(clear.level === 2, 'level increments');
  assert(clear.dots === 244, 'pellets refilled');
  assert(clear.t > 1700 && clear.t < 2600, 'celebration ~2s, got ' + Math.round(clear.t));

  // Pause / resume
  await page.waitForTimeout(2000);
  await page.click('#btnPause');
  await page.waitForTimeout(150);
  snap = await page.evaluate(() => window.__pacman.snapshot());
  assert(snap.state === 'paused', 'pause button pauses');
  await page.click('#btnPause');
  await page.waitForTimeout(150);
  snap = await page.evaluate(() => window.__pacman.snapshot());
  assert(snap.state === 'playing', 'resume works');

  await finish(browser, errors, 'pacman.test');
})().catch(e => { console.error('FAIL pacman.test:', e.message); process.exit(1); });
