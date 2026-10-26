module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  for (const [k, nm] of [['7', 'treemap'], ['9', 'shelf'], ['-', 'chord'], ['=', 'corona'], ['3', 'stars']]) { await page.keyboard.press('Escape'); await page.keyboard.press(k); await sleep(1500);
    await page.locator('.ivm #mapsetbtn').click(); await sleep(600); await page.screenshot({ path: process.env.SHOTS + '/gs-' + nm + '.png', clip: { x: 340, y: 80, width: 700, height: 300 } }); }
  await page.keyboard.press('Escape'); await page.keyboard.press('7'); await sleep(1200); await page.locator('.ivm #mapsetbtn').click(); await sleep(500);
  await page.locator('.ivm #mapopts .swrow button', { hasText: 'On' }).first().click(); await sleep(800); console.log('tmsubs', await page.evaluate(() => document.querySelector('.ivm #tmsubs').getAttribute('aria-pressed')));
  console.log('errors:', errs.join(' | ') || 'none');
};
