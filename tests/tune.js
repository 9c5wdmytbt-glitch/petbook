'use strict';
/* Tuning session harness (not part of `npm test`): runs a bot-driven NOVA
   session and reports balance numbers — graze combo attainment, CLOSE CALL
   rate on aggressive novas, wave lull relief, survival. Run directly:
     BASE_URL=... CHROMIUM_PATH=... node tune.js [seconds]           */
const { BASE_URL, launch, installPointer } = require('./lib');

const SECONDS = Number(process.argv[2] || process.env.TUNE_SECONDS || 200);

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/nova.html');
  await page.waitForTimeout(500);
  await page.tap('#btnEndless');
  await page.waitForTimeout(400);
  await installPointer(page);

  await page.evaluate(() => {
    window.__tune = {
      novas: [], deaths: 0, runLengths: [], maxGrazeMult: 0, mult25Hits: 0,
      samples: [], spawnSets: [],
    };
    let lastT = 0, novaPlan = null, planT = 0, aggressiveToggle = false;
    window.__bot = setInterval(() => {
      const s = window.__nova.snap();
      const M = window.__tune;
      if (s.state === 'gameover') {
        M.spawnSets.push(window.__nova.spawns());
        document.getElementById('btnRetry').click();
        novaPlan = null;
        return;
      }
      if (s.state !== 'playing' || !s.player) return;
      if (s.time < lastT) { M.deaths++; M.runLengths.push(lastT); }
      lastT = s.time;
      M.samples.push({ t: s.time, wave: s.wave, lull: s.waveLull, n: s.shades });
      M.maxGrazeMult = Math.max(M.maxGrazeMult, s.grazeMult);
      if (s.grazeMult >= 2.5) M.mult25Hits++;

      const p = s.player;
      const all = window.__nova.shadePos();
      const hostiles = all.filter(o => !o.warn && !o.fright);
      let vx = 0, vy = 0;

      // avoidance (extra margin for winding/lunging hunters)
      for (const o of hostiles) {
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
        const rr = (o.hState === 'lunge' || o.hState === 'windup') ? 220 : 140;
        if (d < rr) { const w = (rr - d) / rr * 5; vx += dx / d * w; vy += dy / d * w; }
      }
      vx += (195 - p.x) / 420; vy += (422 - p.y) / 420;

      if (s.novaT > 0) {
        // feast
        const prey = all.filter(o => o.fright && !o.warn);
        if (prey.length) {
          prey.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
          vx = (prey[0].x - p.x); vy = (prey[0].y - p.y);
        }
      } else if (s.meter >= 1) {
        // alternate immediate vs aggressive (dive close before firing)
        if (!novaPlan) { aggressiveToggle = !aggressiveToggle; novaPlan = aggressiveToggle ? 'aggressive' : 'immediate'; planT = s.time; }
        if (novaPlan === 'immediate') {
          window.__nova.boom();
          setTimeout(() => M.novas.push({ type: 'immediate', close: window.__nova.snap().lastNovaClose }), 80);
          novaPlan = null;
        } else {
          const near = hostiles.slice().sort((a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
          if (near) {
            const d = Math.hypot(near.x - p.x, near.y - p.y);
            vx = (near.x - p.x); vy = (near.y - p.y); // dive
            if (d < 70 || s.time - planT > 1.6) {
              window.__nova.boom();
              setTimeout(() => M.novas.push({ type: 'aggressive', close: window.__nova.snap().lastNovaClose }), 80);
              novaPlan = null;
            }
          } else { window.__nova.boom(); novaPlan = null; }
        }
      } else {
        // graze farm: thread between two nearest shades when moderately safe
        const near = hostiles.slice().sort((a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        if (near.length >= 2 &&
            Math.hypot(near[0].x - near[1].x, near[0].y - near[1].y) < 150 &&
            Math.hypot(near[0].x - p.x, near[0].y - p.y) > 55) {
          vx += ((near[0].x + near[1].x) / 2 - p.x) / 60;
          vy += ((near[0].y + near[1].y) / 2 - p.y) / 60;
        }
        const motes = window.__nova.motePos();
        if (motes.length) {
          let bm = motes[0], bd = 1e9;
          for (const m of motes) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; bm = m; } }
          vx += (bm.x - p.x) / (bd || 1) * 1.1; vy += (bm.y - p.y) / (bd || 1) * 1.1;
        }
      }
      const n = Math.hypot(vx, vy) || 1;
      window.__send(Math.max(15, Math.min(375, p.x + vx / n * 150)),
                    Math.max(15, Math.min(829, p.y + vy / n * 150)));
    }, 85);
  });

  console.log('tuning session: ' + SECONDS + 's ...');
  await page.waitForTimeout(SECONDS * 1000);
  const M = await page.evaluate(() => {
    clearInterval(window.__bot);
    window.__tune.spawnSets.push(window.__nova.spawns());
    window.__tune.finalRun = window.__nova.snap().time;
    return window.__tune;
  });

  // ---- report ----
  const runs = M.runLengths.concat([M.finalRun]);
  const agg = M.novas.filter(n => n.type === 'aggressive');
  const aggClose = agg.filter(n => n.close).length;
  const imm = M.novas.filter(n => n.type === 'immediate');

  // lull relief: spawns/s in lull vs final 8s of each build, using samples
  let lullRate = null, buildRate = null;
  const spawnTimes = M.spawnSets.flat();
  const lullWins = [], buildWins = [];
  let prev = null;
  for (const s of M.samples) {
    if (prev && !prev.lull && s.lull) lullWins.push([s.t, s.t + 6.5]);
    if (prev && prev.lull && !s.lull) buildWins.push([s.t + 16, s.t + 24]);
    prev = s;
  }
  const rate = wins => {
    let n = 0, dur = 0;
    for (const [a, b] of wins) { n += spawnTimes.filter(t => t >= a && t < b).length; dur += b - a; }
    return dur ? n / dur : null;
  };
  lullRate = rate(lullWins); buildRate = rate(buildWins);

  console.log(JSON.stringify({
    sessionSeconds: SECONDS,
    deaths: M.deaths,
    runLengthsSec: runs.map(r => Math.round(r)),
    maxGrazeMult: M.maxGrazeMult,
    samplesAtMult25: M.mult25Hits,
    novasFired: M.novas.length,
    aggressiveNovas: agg.length,
    aggressiveCloseCalls: aggClose,
    closeCallRateAggressive: agg.length ? (aggClose / agg.length).toFixed(2) : 'n/a',
    immediateCloseCalls: imm.filter(n => n.close).length + '/' + imm.length,
    spawnsPerSec: { lateBuild: buildRate && buildRate.toFixed(2), lull: lullRate && lullRate.toFixed(2) },
    maxWaveReached: Math.max(...M.samples.map(s => s.wave)),
  }, null, 2));
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  await browser.close();
})().catch(e => { console.error('tune.js failed:', e.message); process.exit(1); });
