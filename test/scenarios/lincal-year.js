// Linear Calendar's year layer (0.8.170): theme, Recall, Reflect, glow
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  await page.locator('.ivm #vmore').first().click(); await sleep(300);
  await page.evaluate(() => { document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm #golincal').click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lchalf button')][1].click()); await sleep(1500);
  await page.mouse.move(1500, 800); await shot('ly-menu');
  await page.keyboard.press('Escape'); await sleep(2500); await page.mouse.move(800, 990); await sleep(500); await shot('ly-base');
  const m = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._lcy());
  const H = await m(); console.log('hits', JSON.stringify(H.map(h => [h[4], h[5]])));
  const r = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const go = async (k, v) => { const h = H.find(q => q[4] === k && (v == null || q[5] === v)); if (!h) return false; await page.mouse.move(r.x + h[0] + h[2] / 2, r.y + h[1] + h[3] / 2); await sleep(700); return true; };
  if (await go('m', 2)) await shot('ly-books');
  if (await go('m', 0)) await shot('ly-daily');
  if (await go('n')) await shot('ly-review');
  if (await go('x')) { await page.mouse.down(); await page.mouse.up(); await sleep(500); await shot('ly-extra'); }
  console.log('errors:', errs.join(' | ') || 'none');
};
