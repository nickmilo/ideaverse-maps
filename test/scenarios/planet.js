// PKM Planet (experimental): the map on a table, settlements, arcs on click
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gopltable').click(); await sleep(2500); await page.evaluate(() => document.querySelector('.ivm #legend').click()); await page.mouse.move(5,500); await sleep(500); await shot('planet');
  await q('#q').click(); await q('#q').fill('Garden cosmos river tide'); await sleep(300); await page.keyboard.press('Enter'); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm aside #dcol')?.click()); await sleep(1200); await page.mouse.move(5,500); await shot('planet-note');
  for (let i = 0; i < 4; i++) { await page.mouse.move(900, 500); await page.mouse.wheel(0, -300); await sleep(200); } await sleep(800); await shot('planet-zoom');
};
