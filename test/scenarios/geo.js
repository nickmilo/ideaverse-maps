// ⋯ → Experimental → Geometric → Square / Hexagon / Mandala
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  for (const g of ['square', 'hex', 'mandala']) {
    await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
    if (g === 'square') await shot('geo-menu');
    await q('#gogeo' + g).click(); await sleep(2500); await shot('geo-' + g);
    console.log(g, '| view:', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| legend:', (await q('#legend').textContent()).match(/Geometric · \w+/)?.[0]);
  }
};
