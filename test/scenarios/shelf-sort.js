// Bookshelf: Layout → Shelve by Call no. / A–Z / Created / Modified
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goshelf').click(); await sleep(2500);
  console.log('control visible:', await q('#shelfsort').isVisible());
  for (const m of ['az', 'created', 'modified', 'call']) { await q(`#shelfsort button[data-ss="${m}"]`).click(); await sleep(1600);
    for (let i = 0; i < 6; i++) { await page.mouse.move(700, 520); await page.mouse.wheel(0, -250); await sleep(120); } await sleep(700); await shot('ss-' + m); await page.evaluate(() => document.querySelector('.ivm #zfit').click()); await sleep(900); }
  await q('#vseg button[data-v="gravity"]').click(); await sleep(1200); console.log('control on Gravity:', await q('#shelfsort').isVisible());
};
