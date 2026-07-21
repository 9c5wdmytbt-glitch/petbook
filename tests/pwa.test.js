'use strict';
/* PWA: manifest resolves, the service worker installs, and the arcade
   still works fully offline afterwards. */
const { BASE_URL, launch, assert, finish } = require('./lib');

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/');
  await page.waitForTimeout(300);

  // manifest is linked and valid
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
  assert(manifestHref === 'manifest.webmanifest', 'manifest linked');
  const manifest = await page.evaluate(async () =>
    (await fetch('manifest.webmanifest')).json());
  assert(manifest.name === 'Petbook Arcade' && manifest.icons.length >= 2, 'manifest valid');
  const iconOk = await page.evaluate(async () =>
    (await fetch('icons/icon-192.png')).ok);
  assert(iconOk, 'icons served');

  // service worker registers and activates
  const swState = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(r => r.active && r.active.state),
      new Promise(res => setTimeout(() => res('timeout'), 8000)),
    ]));
  assert(swState === 'activated' || swState === 'activating', 'service worker active, got ' + swState);
  await page.waitForTimeout(600); // let install precache settle

  // offline: hub reloads and a game still boots from cache
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForTimeout(400);
  assert((await page.title()) === 'Petbook Arcade', 'hub loads offline');
  await page.goto(BASE_URL + '/starshell.html');
  await page.waitForTimeout(500);
  const snap = await page.evaluate(() => window.__starshell && window.__starshell.snap());
  assert(snap && snap.state === 'menu', 'STARSHELL boots offline from the SW cache');
  await page.context().setOffline(false);

  await finish(browser, errors, 'pwa.test');
})().catch(e => { console.error('FAIL pwa.test:', e.message); process.exit(1); });
