'use strict';
/* Tuning session harness (not part of `npm test`): runs a bot-driven STARSHELL
   session and reports balance numbers — graze combo attainment, CLOSE CALL
   rate on aggressive novas, wave lull relief, survival. Run directly:
     BASE_URL=... CHROMIUM_PATH=... node tune.js [seconds]           */
const { BASE_URL, launch, installPointer } = require('./lib');

const SECONDS = Number(process.argv[2] || process.env.TUNE_SECONDS || 200);

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/starshell.html');
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
      const s = window.__starshell.snap();
      const M = window.__tune;
      if (s.state === 'gameover') {
        M.spawnSets.push(window.__starshell.spawns());
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
      const all = window.__starshell.shadePos();
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
          window.__starshell.boom();
          setTimeout(() => M.novas.push({ type: 'immediate', close: window.__starshell.snap().lastNovaClose }), 80);
          novaPlan = null;
        } else {
          const near = hostiles.slice().sort((a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
          if (near) {
            const d = Math.hypot(near.x - p.x, near.y - p.y);
            vx = (near.x - p.x); vy = (near.y - p.y); // dive
            if (d < 65) { // inside the ~66px close-call radius, above contact
              window.__starshell.boom();
              setTimeout(() => M.novas.push({ type: 'aggressive', close: window.__starshell.snap().lastNovaClose }), 80);
              novaPlan = null;
            } else if (s.time - planT > 2.2) {
              window.__starshell.boom();
              setTimeout(() => M.novas.push({ type: 'bailed', close: window.__starshell.snap().lastNovaClose }), 80);
              novaPlan = null;
            }
          } else { window.__starshell.boom(); novaPlan = null; }
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
        const motes = window.__starshell.motePos();
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
    window.__tune.spawnSets.push(window.__starshell.spawns());
    window.__tune.finalRun = window.__starshell.snap().time;
    return window.__tune;
  });

  // ---- report ----
  const runs = M.runLengths.concat([M.finalRun]);
  const agg = M.novas.filter(n => n.type === 'aggressive');
  const aggClose = agg.filter(n => n.close).length;
  const imm = M.novas.filter(n => n.type === 'immediate');

  // lull relief: spawns/s in lulls vs the final 8s of builds, computed
  // strictly per run (time resets on retry - never mix runs)
  const runsSamples = [[]];
  for (const smp of M.samples) {
    const cur = runsSamples[runsSamples.length - 1];
    if (cur.length && smp.t < cur[cur.length - 1].t) runsSamples.push([]);
    runsSamples[runsSamples.length - 1].push(smp);
  }
  let lullN = 0, lullDur = 0, buildN = 0, buildDur = 0;
  runsSamples.forEach((rs, i) => {
    const spawnTimes = M.spawnSets[i] || [];
    let prev = null;
    for (const smp of rs) {
      if (prev && !prev.lull && smp.lull) { // lull began
        // 5.5s window: sampling lag must not let the next wave's opening
        // burst bleed into the lull measurement
        lullN += spawnTimes.filter(t => t >= smp.t && t < smp.t + 5.5).length;
        lullDur += 5.5;
      }
      if (prev && prev.lull && !smp.lull) { // next build began
        buildN += spawnTimes.filter(t => t >= smp.t + 16 && t < smp.t + 24).length;
        buildDur += 8;
      }
      prev = smp;
    }
  });
  const lullRate = lullDur ? lullN / lullDur : null;
  const buildRate = buildDur ? buildN / buildDur : null;

  console.log(JSON.stringify({
    sessionSeconds: SECONDS,
    deaths: M.deaths,
    runLengthsSec: runs.map(r => Math.round(r)),
    maxGrazeMult: M.maxGrazeMult,
    samplesAtMult25: M.mult25Hits,
    novasFired: M.novas.length,
    bailedDives: M.novas.filter(n => n.type === 'bailed').length,
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
