// Geometric → Octahedron (3D): drag to turn, click a note, drift
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gogeoocta').click(); await sleep(2500); await shot('octa-1');
  console.log('legend:', (await q('#legend').textContent()).match(/Geometric · [^:]+/)?.[0], '| drift bar:', await q('#driftbar').isVisible());
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const cx = box[0] + 400 + (box[2] - 400)/2, cy = box[1] + box[3]/2;
  await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 14; i++) { await page.mouse.move(cx + i*12, cy + i*4); await sleep(16); } await page.mouse.up(); await sleep(600); await shot('octa-2');
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall()); if (lh.length) { await page.mouse.click(box[0] + lh[0][0] + 4, box[1] + lh[0][1] + 6); await sleep(1500); }
  await shot('octa-sel');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
