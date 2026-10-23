// Chord (flat and sphere): switching folders off closes the ring up, so the remaining kinds fill all 360°
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const open = async id => { await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); } await q(id).click(); await sleep(2500); };
  await open('#gochord'); await shot('cf-all');
  await q('#foldbtn').click(); await sleep(300);
  for (const nm of ['Calendar', 'Efforts']) await page.locator('.ivm #foldlist label', { hasText: nm }).first().locator('input').uncheck();
  await page.keyboard.press('Escape'); await page.evaluate(() => document.body.click()); await sleep(2000); await shot('cf-atlas');
  await open('#gocsi'); await shot('cf-sphere');
};
