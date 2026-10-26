module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #vmore').click(); await sleep(500);
  await page.locator('.ivm #vmorepop #gograph').hover(); await sleep(1500); await shot('notip');
  console.log('labels left:', await page.evaluate(() => document.querySelectorAll('.ivm #vmorepop [aria-label], .ivm #vmorepop [title]').length), 'tooltip shown:', await page.evaluate(() => !!document.querySelector('.tooltip')));
  console.log('errors:', errs.join(' | ') || 'none');
};
