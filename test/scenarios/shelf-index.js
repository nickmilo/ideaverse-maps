module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('9'); await sleep(1500); await page.locator('.ivm #mapsetbtn').click(); await sleep(500);
  await page.screenshot({ path: process.env.SHOTS + '/idx-off.png', clip: { x: 340, y: 80, width: 700, height: 260 } });
  await page.locator('.ivm #mapopts .mini').click(); await sleep(700); console.log('panel open', await page.evaluate(() => !document.querySelector('.ivm #callpanel').hidden));
  await page.locator('.ivm #mapsetbtn').click().catch(() => {}); await sleep(400); if (await page.evaluate(() => document.querySelector('.ivm #mapopts').hidden)) { await page.locator('.ivm #mapsetbtn').click(); await sleep(400); }
  await shot('idx-on'); console.log('switch on', await page.evaluate(() => document.querySelector('.ivm #mapopts .mini input').checked));
  await page.locator('.ivm #cpx').click(); await sleep(400); console.log('after close', await page.evaluate(() => document.querySelector('.ivm #mapopts .mini input').checked));
  await page.keyboard.press('1'); await sleep(1200); console.log('emergence row hidden', await page.evaluate(() => document.querySelector('.ivm #mapopts .mini').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
