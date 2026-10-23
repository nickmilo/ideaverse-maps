// PKM Planet → Globe: near side, turn to the far side, select a note
module.exports = async ({ page, sleep, shot }) => {
  page.on('console', m => { if (/globe|WebGL|error/i.test(m.text())) console.log('PAGE:', m.text().slice(0, 300)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goplanet').click(); await sleep(3500);
  console.log('seg visible:', await q('#planetseg').isVisible(), '| globe pressed:', await q('#planetseg button[data-pg="globe"]').getAttribute('aria-pressed'));
  console.log('legend:', (await q('#legend').textContent()).match(/PKM Planet[^.]*\./)?.[0], (await q('#legend').textContent()).match(/; [\d,]+ here|none here yet/)?.[0]);
  await shot('globe-front');
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const cx = box[0] + 400 + (box[2] - 400)/2, cy = box[1] + box[3]/2;
  await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(cx + i*13, cy); await sleep(16); } await page.mouse.up(); await sleep(600); await shot('globe-side');
  await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(cx + i*13.2, cy); await sleep(16); } await page.mouse.up(); await sleep(600); await shot('globe-back');
  // click the biggest note on the near side after turning back
  await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(cx - i*26, cy); await sleep(16); } await page.mouse.up(); await sleep(600);
  const m = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivTopVis()); console.log('clicking:', m && m[2]);
  if (m) { await page.mouse.click(box[0] + m[0], box[1] + m[1]); await sleep(1200); }
  await shot('globe-sel');
  await q('#planetseg button[data-pg="table"]').click(); await sleep(1800); await shot('globe-table');
};
