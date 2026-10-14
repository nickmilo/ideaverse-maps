// Frames for the README's Sensemaking swirl animation: writes $SHOTS/f000.jpg… (whole window, ~17 fps). Build the GIF with test/make-gif.py.
module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => require('@electron/remote').getCurrentWindow().setSize(1600, 1000)); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const q = s => page.locator('.ivm ' + s).first();
  const V = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const run = js => page.evaluate(new Function(js));
  await q('#themeseg button[data-th="' + (process.env.TH || 'dark') + '"]').click(); await sleep(500);
  await q('#vseg button[data-v="sense"]').click(); await sleep(2500);
  await q('#tlfx button[data-f="swirl"]').click(); await q('#tlspeed button[data-p="' + (process.env.SP || 'normal') + '"]').click(); await q('#tlstep button[data-s="week"]').click();
  await run(V + '.__ivSense.set(Math.round(' + V + '.__ivSense.steps() * .78))'); await sleep(1000);
  await page.evaluate(() => document.querySelector('.ivm #legend').click()); await sleep(300);
  await q('#tlplay').click(); await sleep(300);
  const cdp = await page.context().newCDPSession(page); const fs = require('fs'); let i = 0; const t0 = Date.now();
  cdp.on('Page.screencastFrame', async f => { fs.writeFileSync(`${process.env.SHOTS}/f${String(i++).padStart(3, '0')}.jpg`, Buffer.from(f.data, 'base64')); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
  await sleep(+(process.env.DUR || 7000)); await cdp.send('Page.stopScreencast');
  console.log('frames', i, 'ms', Date.now() - t0);
  await q('#tlplay').click();
};
