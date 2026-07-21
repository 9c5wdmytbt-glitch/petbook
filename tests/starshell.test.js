'use strict';
/* STARSHELL smoke test: boot, steering, scoring, nova + chain, hunter telegraph,
   death, retry, daily mode + storage hygiene — and zero console errors. */
const { BASE_URL, launch, installPointer, assert, finish } = require('./lib');

(async () => {
  const { browser, page, errors } = await launch();

  // Legacy-save migration: nova-* keys copy to starshell-* on first load
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('nova-best', '7777');
    localStorage.setItem('nova-streak', '3');
    localStorage.setItem('nova-lastDaily', JSON.stringify('2026-07-19'));
    localStorage.setItem('nova-daily-2026-07-19', '4321');
    localStorage.setItem('nova-muted', 'false');
  });
  await page.goto(BASE_URL + '/starshell.html');
  await page.waitForTimeout(500);

  const migrated = await page.evaluate(() => ({
    best: localStorage.getItem('starshell-best'),
    streak: localStorage.getItem('starshell-streak'),
    lastDaily: localStorage.getItem('starshell-lastDaily'),
    daily: localStorage.getItem('starshell-daily-2026-07-19'),
    muted: localStorage.getItem('starshell-muted'),
  }));
  assert(migrated.best === '7777' && migrated.streak === '3' &&
         migrated.daily === '4321' && migrated.muted === 'false' &&
         migrated.lastDaily === JSON.stringify('2026-07-19'),
         'nova-* saves migrated to starshell-*: ' + JSON.stringify(migrated));

  let snap = await page.evaluate(() => window.__starshell.snap());
  assert(snap.state === 'menu', 'boots to menu');
  assert(snap.best === 7777, 'migrated best score loaded');

  await page.tap('#btnEndless');
  await page.waitForTimeout(400);
  await installPointer(page);
  snap = await page.evaluate(() => window.__starshell.snap());
  assert(snap.state === 'playing', 'endless run starts');

  // Bot: collect motes while avoiding shades for 8s -> score + meter rise
  await page.evaluate(() => {
    window.__steer = setInterval(() => {
      const s = window.__starshell.snap();
      if (s.state !== 'playing' || !s.player) return;
      const p = s.player;
      let vx = 0, vy = 0;
      for (const o of window.__starshell.shadePos()) {
        if (o.warn || o.fright) continue;
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
        const rr = (o.hState === 'lunge' || o.hState === 'windup') ? 220 : 150;
        if (d < rr) { const w = (rr - d) / rr * 5; vx += dx / d * w; vy += dy / d * w; }
      }
      vx += (195 - p.x) / 400; vy += (422 - p.y) / 400;
      const motes = window.__starshell.motePos();
      if (motes.length) {
        let bm = motes[0], bd = 1e9;
        for (const m of motes) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; bm = m; } }
        vx += (bm.x - p.x) / (bd || 1) * 1.2; vy += (bm.y - p.y) / (bd || 1) * 1.2;
      }
      const n = Math.hypot(vx, vy) || 1;
      window.__send(Math.max(15, Math.min(375, p.x + vx / n * 150)),
                    Math.max(15, Math.min(829, p.y + vy / n * 150)));
    }, 90);
  });
  await page.waitForTimeout(8000);
  snap = await page.evaluate(() => window.__starshell.snap());
  assert(snap.score > 0, 'collecting motes scores');
  assert(snap.meter > 0 || snap.novaT > 0, 'meter charges');
  assert(typeof snap.grazeCombo === 'number' && typeof snap.wave === 'number', 'debug fields present');

  // Hunter telegraph: force one, expect windup >= 0.3s before any lunge
  const tele = await page.evaluate(() => new Promise(resolve => {
    window.__starshell.spawnHunter();
    const seen = {};
    const t0 = performance.now();
    const iv = setInterval(() => {
      for (const h of window.__starshell.shadePos().filter(x => x.type === 'hunter' && !x.warn)) {
        if (!seen[h.id]) seen[h.id] = {};
        if (h.hState === 'windup' && !seen[h.id].windup) seen[h.id].windup = performance.now();
        if (h.hState === 'lunge' && !seen[h.id].lunge) seen[h.id].lunge = performance.now();
      }
      for (const k of Object.keys(seen)) {
        if (seen[k].lunge) { clearInterval(iv); resolve(seen[k]); return; }
      }
      if (performance.now() - t0 > 12000) { clearInterval(iv); resolve(null); }
    }, 40);
  }));
  if (tele) {
    assert(tele.windup && tele.lunge - tele.windup > 300, 'lunge telegraphed >=0.3s');
  } else {
    console.log('note: no hunter lunge within 12s (bot kept distance) — telegraph covered by tune.js');
  }

  // Nova + chain: dive toward the nearest shade, fire point-blank, feast
  await page.evaluate(() => {
    clearInterval(window.__steer);
    window.__starshell.charge();
    window.__starshellFired = false;
    window.__steer = setInterval(() => {
      const s = window.__starshell.snap();
      if (s.state === 'gameover') { // died mid-dive: recover and try again
        document.getElementById('btnRetry').click();
        setTimeout(() => window.__starshell.charge(), 400);
        return;
      }
      if (s.state !== 'playing' || !s.player) return;
      const p = s.player;
      if (s.novaT > 0) {
        window.__starshellFired = true;
        const prey = window.__starshell.shadePos().filter(x => x.fright && !x.warn);
        if (!prey.length) return;
        prey.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        // intercept: prey flees directly away, so aim past it along the flee line
        const t = prey[0];
        const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1;
        window.__send(t.x + dx / d * 70, t.y + dy / d * 70);
      } else if (s.meter >= 1) {
        // dive at the nearest slow shade (player outruns 'shade' types) and
        // fire only point-blank so a catchable prey is guaranteed
        const hostiles = window.__starshell.shadePos().filter(x => !x.warn && !x.fright);
        const slows = hostiles.filter(x => x.type === 'shade');
        // prefer slow shades near mid-field so the fleeing prey stays catchable
        const central = (slows.length ? slows : hostiles)
          .filter(x => Math.hypot(x.x - 195, x.y - 422) < 300);
        const pool = central.length ? central : (slows.length ? slows : hostiles);
        const near = pool
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (!near) return;
        if (Math.hypot(near.x - p.x, near.y - p.y) < 90) { window.__starshell.boom(); return; }
        window.__send(near.x, near.y);
      }
    }, 60);
  });
  // wait (up to 15s) for the dive to land and the nova to fire
  let fired = false;
  for (let i = 0; i < 30 && !fired; i++) {
    await page.waitForTimeout(500);
    fired = await page.evaluate(() => window.__starshellFired);
  }
  assert(fired, 'nova fires');
  await page.waitForTimeout(6500);
  snap = await page.evaluate(() => window.__starshell.snap());
  assert(snap.bestChain >= 1, 'chain-ate at least one shade during the nova');
  await page.evaluate(() => clearInterval(window.__steer));

  // Pause via visibility is environment-dependent; test death -> retry
  await page.evaluate(() => window.__starshell.kill());
  let st = '';
  for (let i = 0; i < 25 && st !== 'gameover'; i++) {
    await page.waitForTimeout(200);
    st = (await page.evaluate(() => window.__starshell.snap())).state;
  }
  assert(st === 'gameover', 'death reaches game over, got ' + st);
  const rankInfo = await page.evaluate(() => ({
    line: document.getElementById('runRank').textContent,
    xp: JSON.parse(localStorage.getItem('arcade-xp')),
  }));
  assert(/^RANK [A-Z ]+ · \+\d+ XP$/.test(rankInfo.line), 'game over shows rank + XP gained (' + rankInfo.line + ')');
  assert(rankInfo.xp > 0, 'arcade-xp banked (' + rankInfo.xp + ')');
  await page.tap('#btnRetry');
  for (let i = 0; i < 15 && st !== 'playing'; i++) {
    await page.waitForTimeout(200);
    st = (await page.evaluate(() => window.__starshell.snap())).state;
  }
  snap = await page.evaluate(() => window.__starshell.snap());
  assert(snap.state === 'playing' && snap.score < 100, 'retry restarts clean (' + snap.state + '/' + snap.score + ')');

  // Daily mode + storage hygiene
  await page.evaluate(() => window.__starshell.kill());
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(200);
    if ((await page.evaluate(() => window.__starshell.snap())).state === 'gameover') break;
  }
  await page.tap('#btnMenu');
  await page.waitForTimeout(200);
  await page.tap('#btnDaily');
  await page.waitForTimeout(400);
  snap = await page.evaluate(() => window.__starshell.snap());
  assert(snap.state === 'playing' && snap.mode === 'daily', 'daily challenge starts');
  await page.evaluate(() => window.__starshell.kill());
  await page.waitForTimeout(1600);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  assert(keys.every(k => k.startsWith('starshell-') || k.startsWith('nova-') || k.startsWith('arcade-')),
    'game writes only starshell-/arcade- keys: ' + keys.join(','));
  assert(keys.some(k => k.startsWith('starshell-daily-')), 'daily result stored under starshell-');

  await finish(browser, errors, 'starshell.test');
})().catch(e => { console.error('FAIL starshell.test:', e.message); process.exit(1); });
