module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('0'); await sleep(1800);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(500); await shot('lce-set');
  await page.locator('.ivm .lcemo').click(); await sleep(2500); console.log('status', await page.evaluate(() => document.querySelector('.ivm .lcemost').textContent || 'ok'));
  await page.keyboard.press('Escape'); await sleep(300);
  for (let z = 0; z < 3; z++) { await page.locator('.ivm #zin').click(); await sleep(400); }
  await sleep(800); await shot('lce-on');
  console.log('errors:', errs.join(' | ') || 'none');
};
