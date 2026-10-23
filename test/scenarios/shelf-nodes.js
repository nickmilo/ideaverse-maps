// Bookshelf: click a map; its links end in nodes on top of the spines
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goshelf').click(); await sleep(2500);
  for (let i = 0; i < 5; i++) { await page.mouse.move(720, 580); await page.mouse.wheel(0, -250); await sleep(120); } await sleep(800);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const ms = (await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivShelfMaps())).filter(([x, y]) => x > 450 && x < box[2] - 100 && y > 250 && y < box[3] - 100);
  console.log('maps on screen:', ms.length);
  if (ms.length) { const m = ms[0]; await page.mouse.click(box[0] + m[0], box[1] + m[1]); await sleep(900); }
  await shot('nodes');
};
