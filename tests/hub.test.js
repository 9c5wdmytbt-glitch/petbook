'use strict';
/* Arcade hub: all three LAUNCH buttons navigate to their games, with the
   LAST FLARE flagship card on top. */
const { BASE_URL, launch, assert, finish } = require('./lib');

(async () => {
  const { browser, page, errors } = await launch();
  await page.goto(BASE_URL + '/');
  await page.waitForTimeout(300);
  assert((await page.title()) === 'Petbook Arcade', 'hub title');
  const flagship = await page.textContent('.card.headline h2');
  assert(flagship === 'LAST FLARE', 'flagship headline card is LAST FLARE');

  const order = [['LAST FLARE', 0], ['STARSHELL', 1], ['TRENCHFOX', 2]];
  for (const [title, i] of order) {
    await page.tap('a.launch >> nth=' + i);
    await page.waitForTimeout(400);
    assert((await page.title()) === title, 'LAUNCH #' + i + ' opens ' + title);
    await page.goBack();
    await page.waitForTimeout(300);
  }

  await finish(browser, errors, 'hub.test');
})().catch(e => { console.error('FAIL hub.test:', e.message); process.exit(1); });
