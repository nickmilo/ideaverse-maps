// Corona: a selected note keeps all its links as the globe turns (far-side ones dashed)
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gocso').click(); await sleep(2500);
  await q('#q').click(); await q('#q').fill('Garden cosmos river tide'); await sleep(300); await page.keyboard.press('Enter'); await sleep(2000); await shot('cl-1');
  const b = await q('canvas').boundingBox(); await page.mouse.move(b.x + 900, b.y + 120); await page.mouse.down(); await page.mouse.move(b.x + 1300, b.y + 160, { steps: 10 }); await page.mouse.up(); await sleep(800); await shot('cl-2');
};
