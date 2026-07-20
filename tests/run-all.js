'use strict';
/* Starts the static server (own process), then runs every *.test.js in
   sequence against it. */
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const PORT = Number(process.env.PORT || 8123);

const server = spawn(process.execPath, [path.join(__dirname, 'serve.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'inherit'],
});

let started = false;
server.stdout.on('data', chunk => {
  if (started || !String(chunk).includes('READY')) return;
  started = true;
  const base = 'http://127.0.0.1:' + PORT;
  console.log('serving repo at', base);
  const tests = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
  let failed = 0;
  for (const t of tests) {
    console.log('--- ' + t + ' ---');
    const r = spawnSync(process.execPath, [path.join(__dirname, t)], {
      stdio: 'inherit',
      env: { ...process.env, BASE_URL: base },
    });
    if (r.status !== 0) failed++;
  }
  server.kill();
  console.log(failed ? 'FAILED: ' + failed + ' test file(s)' : 'ALL TESTS PASSED');
  process.exit(failed ? 1 : 0);
});

setTimeout(() => {
  if (!started) { console.error('server failed to start'); server.kill(); process.exit(1); }
}, 5000);
