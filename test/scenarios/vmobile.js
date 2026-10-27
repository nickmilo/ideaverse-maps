module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { app.emulateMobile(true); }); await sleep(3000);
  await page.setViewportSize({ width: 460, height: 900 }); await sleep(1000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  console.log('body mobile', await page.evaluate(() => document.body.classList.contains('is-mobile')));
  await page.locator('.ivm #viewbtn').click(); await sleep(500); await page.screenshot({ path: process.env.SHOTS + '/vm-1.png', clip: { x: 0, y: 0, width: 460, height: 520 } });
  await page.locator('.ivm .vgedit').click(); await sleep(400); await page.screenshot({ path: process.env.SHOTS + '/vm-2.png', clip: { x: 0, y: 0, width: 460, height: 620 } });
  console.log('errors:', errs.join(' | ') || 'none');
};
