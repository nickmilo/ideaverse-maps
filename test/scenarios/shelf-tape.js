// Bookshelf → Subfolder: tape under each group, hover outlines it; root notes lead the Root / + shelf; leaning books don't block upright ones
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const dbg = () => 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goshelf').click(); await sleep(2500);
  await q('#shelfsort button[data-ss="folder"]').click(); await sleep(1500);
  await shot('tape-fit');
  for (let i = 0; i < 5; i++) { await page.mouse.move(720, 580); await page.mouse.wheel(0, -250); await sleep(120); } await sleep(800);
  const tapes = await page.evaluate(`${dbg()}.__ivTapes()`); console.log('tapes:', tapes.length, tapes.slice(0, 6).map(t => t.label + ':' + t.n).join(', '));
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const on = tapes.flatMap(t => t.at.map(a => [t.label, a])).find(([, [x, y]]) => x > 20 && x < box[2] - 20 && y > 20 && y < box[3] - 20);
  if (on) { await page.mouse.move(box[0] + on[1][0], box[1] + on[1][1]); await sleep(500); console.log('hovering', on[0], '→ tip:', await page.evaluate(() => document.querySelector('.ivm-tip')?.textContent)); }
  await shot('tape-hover');
};
