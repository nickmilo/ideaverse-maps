module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #arrbtn').first().click(); await sleep(500); await shot('arr');
  console.log('order:', await page.evaluate(() => [...document.querySelector('.ivm header .tbl').children].map(e => e.id || e.className).join(' | ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
