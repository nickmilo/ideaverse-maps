// Treemap → Layout → Subfolders
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gotreemap').click(); await sleep(2500); await shot('tm-off');
  console.log('toggle visible:', await q('#tmsubs').isVisible());
  await page.evaluate(s => __ivReveal(s), '#tmsubs'); await sleep(250); await q('#tmsubs').click(); await sleep(600); await shot('tm-on');
  console.log('pressed:', await q('#tmsubs').getAttribute('aria-pressed'));
  for (let i = 0; i < 4; i++) { await page.mouse.move(700, 600); await page.mouse.wheel(0, -250); await sleep(120); } await sleep(700); await shot('tm-on-zoom');
};
