'use strict';
/* Arcade hub: both LAUNCH buttons navigate to their games. */
const { BASE_URL, launch, assert, finish } = require('./lib');

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/');
  await page.waitForTimeout(300);
  assert((await page.title()) === 'Petbook Arcade', 'hub title');

  await page.tap('a.launch >> nth=0');
  await page.waitForTimeout(400);
  assert((await page.title()) === 'NOVA', 'first LAUNCH opens NOVA');
  await page.goBack();
  await page.waitForTimeout(300);

  await page.tap('a.launch >> nth=1');
  await page.waitForTimeout(400);
  assert((await page.title()) === 'Pac-Man', 'second LAUNCH opens Pac-Man');

  await finish(browser, errors, 'hub.test');
})().catch(e => { console.error('FAIL hub.test:', e.message); process.exit(1); });
