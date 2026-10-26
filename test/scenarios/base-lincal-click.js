// A base on Linear Calendar, zoomed in, Sync on: clicking a note keeps the zoom
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000);
  await page.evaluate(() => { const b = document.querySelector('.ivm-bases #vmore'); b.click(); });
  await sleep(300); await page.evaluate(() => { document.querySelectorAll('.ivm-bases #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm-bases #golincal').click(); }); await sleep(2500);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm-bases canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  for (let z = 0; z < 4; z++) { await page.mouse.move(box[0] + box[2] / 2, box[1] + box[3] / 2); await page.mouse.wheel(0, -300); await sleep(300); } await sleep(800);
  await page.evaluate(() => { const f = document.querySelector('.ivm-bases #follownote'); if (f.getAttribute('aria-pressed') !== 'true') f.click(); });
  const V = () => page.evaluate(() => [...app.plugins.plugins['ideaverse-maps'].basesViews][0]);
  const target = await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; for (const p of v.paths) { const a = v.map._at(p); const r = document.querySelector('.ivm-bases canvas').getBoundingClientRect(); if (a && a[0] > 60 && a[0] < r.width - 60 && a[1] > 60 && a[1] < r.height - 60) return p; } });
  const before = await page.evaluate(p => [...app.plugins.plugins['ideaverse-maps'].basesViews][0].map._at(p).map(Math.round), target);
  await shot('blc-before');

  console.log('mobile?', await page.evaluate(() => [app.isMobile, document.body.classList.contains('is-mobile'), window.innerWidth]));
  await page.mouse.click(box[0] + before[0], box[1] + before[1]); await sleep(2500); console.log('--- touch');
  // a note touched when it opens (a plugin writing a property)
  await page.evaluate(async p => { const f = app.vault.getAbstractFileByPath(p); await app.fileManager.processFrontMatter(f, fm => { fm.touched = 1; }); }, target); await sleep(2500);
  const after = await page.evaluate(p => [...app.plugins.plugins['ideaverse-maps'].basesViews][0].map._at(p).map(Math.round), target);
  console.log('target', target, 'before', before, 'after', after);
  await shot('blc-after');
  console.log('errors:', errs.join(' | ') || 'none');
};
