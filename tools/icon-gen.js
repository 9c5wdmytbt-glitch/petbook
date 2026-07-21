const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-proxy-server'] });
  const ctx = await browser.newContext({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 });
  const draw = (size) => `
    <body style="margin:0"><canvas id="c" width="${size}" height="${size}"></canvas><script>
    const c = document.getElementById('c'), x = c.getContext('2d'), S = ${size};
    // ground
    const bg = x.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, '#0a0a1e'); bg.addColorStop(1, '#04040c');
    x.fillStyle = bg; x.fillRect(0, 0, S, S);
    // faint stars
    for (let i = 0; i < 40; i++) {
      x.globalAlpha = 0.25 + Math.abs(Math.sin(i * 7.3)) * 0.4;
      x.fillStyle = '#fff';
      const sx = (i * 137.5) % S, sy = (i * 89.7) % S;
      x.fillRect(sx, sy, S * 0.006, S * 0.006);
    }
    x.globalAlpha = 1;
    // flare burst: layered glow + four-point star
    const cx = S / 2, cy = S * 0.42;
    const g1 = x.createRadialGradient(cx, cy, 0, cx, cy, S * 0.36);
    g1.addColorStop(0, 'rgba(255,246,214,0.95)');
    g1.addColorStop(0.4, 'rgba(255,214,120,0.5)');
    g1.addColorStop(1, 'rgba(255,180,80,0)');
    x.fillStyle = g1; x.beginPath(); x.arc(cx, cy, S * 0.36, 0, 7); x.fill();
    x.fillStyle = '#fff6d8';
    const R = S * 0.16, w = S * 0.035;
    x.beginPath();
    x.moveTo(cx, cy - R); x.lineTo(cx + w, cy - w); x.lineTo(cx + R, cy);
    x.lineTo(cx + w, cy + w); x.lineTo(cx, cy + R); x.lineTo(cx - w, cy + w);
    x.lineTo(cx - R, cy); x.lineTo(cx - w, cy - w);
    x.closePath(); x.fill();
    // fox head silhouette below: wedge with two ears
    const fy = S * 0.74, fw = S * 0.30;
    x.fillStyle = '#c96f2f';
    x.beginPath();
    x.moveTo(cx - fw, fy - S * 0.10);           // left ear base
    x.lineTo(cx - fw * 0.72, fy - S * 0.22);    // left ear tip
    x.lineTo(cx - fw * 0.4, fy - S * 0.10);
    x.lineTo(cx + fw * 0.4, fy - S * 0.10);
    x.lineTo(cx + fw * 0.72, fy - S * 0.22);    // right ear tip
    x.lineTo(cx + fw, fy - S * 0.10);
    x.lineTo(cx, fy + S * 0.16);                // muzzle point
    x.closePath(); x.fill();
    </script></body>`;
  for (const [size, name] of [[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png']]) {
    const page = await ctx.newPage();     // fresh page per icon: reusing one
    await page.setContent(draw(size));    // page left later canvases blank
    await page.waitForTimeout(200);
    const el = await page.$('#c');
    await el.screenshot({ path: __dirname + '/../icons/' + name });
    await page.close();
  }
  await browser.close();
  console.log('icons written');
})().catch(e => { console.error(e); process.exit(1); });
