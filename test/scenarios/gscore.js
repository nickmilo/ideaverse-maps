module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('5'); await sleep(2000);
  await page.locator('.ivm #arrbtn').click(); await sleep(400); await shot('gs-menu');
  await page.locator('.ivm #arrpop .orow', { hasText: 'Link score' }).click(); await sleep(2500); await shot('gs-on');
  console.log('errors:', errs.join(' | ') || 'none');
};
