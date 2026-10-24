module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); }); await sleep(800);
  const cdp = await page.context().newCDPSession(page);
  for (const w of [1500, 1290, 1200, 1100, 1000, 860, 780]) { await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 700, deviceScaleFactor: 1, mobile: false }); await sleep(900);
    console.log(w, await page.evaluate(() => { const h = document.querySelector('.ivm header'); const r = h.getBoundingClientRect(); const t = document.querySelector('.ivm .tbr').getBoundingClientRect(); return `header h${Math.round(r.height)} right-edge ${Math.round(t.right)} / ${Math.round(r.right)}`; }));
    await page.screenshot({ path: `/tmp/claude-0/shots-t/tbw-${w}.png`, clip: { x: 0, y: 140, width: w, height: 70 } }); }
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1300, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(600);
  await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(400); await page.evaluate(() => document.querySelector('.ivm #vmorepop details').open = true); await sleep(300);
  await page.screenshot({ path: '/tmp/claude-0/shots-t/tbw-more.png', clip: { x: 0, y: 140, width: 900, height: 520 } });
};
