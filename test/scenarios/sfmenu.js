// the tighter Starfield menu, in 2D and Star Chart
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(500); await shot('sfm-2d');
  await page.locator('.ivm .sfseg button[data-m="chart"]').click(); await sleep(1500); await shot('sfm-chart');
  await page.locator('.ivm .chxbox .chx').nth(0).click(); await page.locator('.ivm .chxbox .chx').nth(1).click(); await sleep(1000); await shot('sfm-chart-on');
  await page.locator('.ivm .sfseg button[data-m="3d"]').click(); await sleep(1500); await shot('sfm-3d');
  console.log('mini hidden:', await page.evaluate(() => document.querySelector('.ivm canvas.minimap').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
