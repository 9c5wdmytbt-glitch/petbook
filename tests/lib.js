'use strict';
/* Shared helpers for the Petbook Arcade smoke tests. */
const { chromium } = require('playwright-core');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8123';

async function launch() {
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    // the games are fully self-contained; bypass any environment proxy so
    // the local static server is reachable
    args: ['--no-proxy-server'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  return { browser, page, errors };
}

/* Install a pointer-event sender on the page: window.__send(x, y). */
async function installPointer(page) {
  await page.evaluate(() => {
    const stage = document.getElementById('stage');
    window.__send = (x, y) => {
      for (const t of ['pointerdown', 'pointermove']) {
        stage.dispatchEvent(new PointerEvent(t, {
          pointerId: 1, isPrimary: true, clientX: x, clientY: y, bubbles: true,
        }));
      }
    };
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT: ' + msg);
}

async function finish(browser, errors, name) {
  if (errors.length) {
    console.log('CONSOLE/PAGE ERRORS:\n' + errors.join('\n'));
    throw new Error(name + ': console errors');
  }
  console.log('PASS ' + name);
  await browser.close();
}

module.exports = { BASE_URL, launch, installPointer, assert, finish };
