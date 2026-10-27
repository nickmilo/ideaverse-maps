module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000); await shot('reopen');
  console.log('view', await page.evaluate(() => document.querySelector('.ivm').dataset.view || document.querySelector('.ivm [data-view]')?.dataset.view));
  console.log('errors:', errs.join(' | ') || 'none');
};
