'use strict';
/* LAST FLARE smoke test: boot, run start, health/damage with iframes,
   upgrade flow, session missions, music layers, performance ladder,
   meta persistence across reloads, and daily-seed determinism (the same
   date string must produce identical waves and upgrade offers). */
const { BASE_URL, launch, assert, finish } = require('./lib');

async function startRun(page) {
  await page.evaluate(() => {
    document.getElementById('btnDeploy').dispatchEvent(new Event('click'));
  });
  await page.waitForTimeout(250);
}

/* one daily probe: deterministic inputs out of a fresh page */
async function dailyProbe(page, date) {
  await page.goto(BASE_URL + '/lastflare.html');
  await page.waitForTimeout(300);
  await page.evaluate(d => window.__lastflare.startDaily(d), date);
  // wait for a fixed COUNT of spawns (not a fixed time) — the seeded draw
  // sequence is deterministic, but how many land in N seconds can jitter
  await page.waitForFunction(() => window.__lastflare.spawnLog().length >= 5, null, { timeout: 20000 });
  return page.evaluate(() => {
    const lf = window.__lastflare;
    lf.gainXp(30); // force a promotion for the offer snapshot
    const offers = lf.offers();
    const m = lf.mode();
    return {
      spawns: lf.spawnLog().slice(0, 5),
      offers,
      mod: m.dailyMod,
      op: m.dailyOp,
      missions: lf.missions().map(x => x.id + ':' + x.n),
    };
  });
}

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/lastflare.html');
  await page.waitForTimeout(400);

  let snap = await page.evaluate(() => window.__lastflare.snap());
  assert(snap.state === 'menu', 'boots to the barracks menu');

  await startRun(page);
  snap = await page.evaluate(() => window.__lastflare.snap());
  assert(snap.state === 'playing' && snap.hp === snap.maxHp, 'DEPLOY starts a run at full HP');
  assert(snap.weapons.length === 1, 'starts with the operator weapon');

  // health/damage: a hit lands, iframes absorb an immediate second hit
  const dmg = await page.evaluate(() => {
    const lf = window.__lastflare;
    const before = lf.snap().hp;
    lf.hurt(20); lf.hurt(20);
    return { before, after: lf.snap().hp, inv: lf.snap().inv };
  });
  assert(dmg.before - dmg.after === 20, 'damage applies once; iframes absorb the double-hit');
  assert(dmg.inv > 0, 'invulnerability window is running');

  // upgrade flow: xp -> three cards -> pick resumes with the upgrade applied
  await page.evaluate(() => window.__lastflare.gainXp(30));
  await page.waitForTimeout(200);
  snap = await page.evaluate(() => window.__lastflare.snap());
  assert(snap.state === 'upgrade', 'level-up opens the promotion choice');
  const offers = await page.evaluate(() => window.__lastflare.offers());
  assert(offers.length === 3, 'three promotion cards offered');
  await page.evaluate(() => window.__lastflare.pick(0));
  await page.waitForTimeout(200);
  snap = await page.evaluate(() => window.__lastflare.snap());
  assert(snap.state === 'playing', 'picking a card resumes the run');

  // session missions: three rolled, and forcing kills completes a kill mission
  const missions = await page.evaluate(() => window.__lastflare.missions());
  assert(missions.length === 3, 'three session missions rolled');
  assert(new Set(missions.map(m => m.id)).size === 3, 'missions are distinct');

  // dynamic music: layers exist after the audio unlock, mode tracks state
  const music = await page.evaluate(() => window.__lastflare.music());
  assert(music.ready, 'music layers initialised after user gesture');
  assert(['calm', 'pressure', 'laststand'].includes(music.mode), 'music mode valid');
  const lastStand = await page.evaluate(() => new Promise(resolve => {
    const lf = window.__lastflare;
    // drive HP under the last-stand line via spaced hits (iframes between);
    // clear enemies each tick so contact damage can't finish the run
    let n = 0;
    const iv = setInterval(() => {
      lf.killAll();
      const s = lf.snap();
      if (s.state === 'upgrade') { lf.pick(0); return; } // gem trickle levelled us up
      if (s.state !== 'playing') { clearInterval(iv); resolve(s.state); return; }
      if (s.hp / s.maxHp < 0.3) { clearInterval(iv); setTimeout(() => resolve(lf.music().mode), 800); return; }
      lf.hurt(Math.ceil(s.maxHp * 0.2));
      if (++n > 20) { clearInterval(iv); resolve('stuck'); }
    }, 900);
  }));
  assert(lastStand === 'laststand', 'music escalates to last-stand at low HP (' + lastStand + ')');

  // performance ladder is wired
  const perf = await page.evaluate(() => {
    window.__lastflare.setPerf(2);
    const p = window.__lastflare.perf();
    window.__lastflare.setPerf(0);
    return p;
  });
  assert(perf.enemyBudget === 140 && perf.partBudget === 200, 'degradation ladder budgets apply');

  // meta persistence: bank salvage, reload, still there
  await page.evaluate(() => window.__lastflare.bank(1234));
  await page.reload();
  await page.waitForTimeout(400);
  const bank = await page.evaluate(() => window.__lastflare.meta().bank);
  assert(bank === 1234, 'salvage bank persists across reload');

  // arcade rank migration: legacy lastflare-xp seeds arcade-xp exactly once
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lastflare-xp', '555'); });
  await page.reload();
  await page.waitForTimeout(400);
  const mig = await page.evaluate(() => ({
    metaXp: window.__lastflare.meta().xp,
    arcade: JSON.parse(localStorage.getItem('arcade-xp')),
  }));
  assert(mig.metaXp === 555 && mig.arcade === 555,
    'lastflare-xp migrates into shared arcade-xp (' + JSON.stringify(mig) + ')');

  // daily determinism: same date -> identical waves, offers, missions
  const a = await dailyProbe(page, '2026-03-14');
  const b = await dailyProbe(page, '2026-03-14');
  const c = await dailyProbe(page, '2026-03-15');
  assert(JSON.stringify(a) === JSON.stringify(b),
    'same date is fully deterministic (waves, offers, mod, operator, missions)');
  assert(a.spawns.length >= 2 && a.offers.length === 3, 'probe captured real waves and offers');
  assert(JSON.stringify(a.spawns) !== JSON.stringify(c.spawns),
    'a different date produces different waves');

  await finish(browser, errors, 'lastflare.test');
})().catch(e => { console.error('FAIL lastflare.test:', e.message); process.exit(1); });
