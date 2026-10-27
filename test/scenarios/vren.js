module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #viewbtn').click(); await sleep(400); await page.locator('.ivm #vlist .vr').nth(1).hover(); await sleep(300); await shot('vren-hover');
  console.log('errors:', errs.join(' | ') || 'none');
};
