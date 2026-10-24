// Tablet (iPad / Android tablet size), mobile emulation: map, Bookshelf Index, Planet globe
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(true)); await sleep(4000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await shot('tab-1');
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goplglobe').click(); await sleep(3500); await shot('tab-globe');
  console.log('body:', await page.evaluate(() => document.body.className.split(' ').filter(c => /mobile|phone|tablet/.test(c)).join(' ')), '| errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
