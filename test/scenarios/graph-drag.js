module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); });
  const g = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph());
  for (let q = 0; q < 60; q++) { const r = await g(); if (r.it >= r.its) break; await sleep(1000); }
  await sleep(1500); await page.mouse.move(1599, 300); await shot('drag-0');
  console.log('tab:', await page.evaluate(() => document.querySelector('.ivm #vcur').textContent));
  // grab the note under the hottest spot: scan for a pickable note near the center
  const b = await page.locator('.ivm canvas').first().boundingBox(); let hit = null;
  for (let r = 0; r < 300 && !hit; r += 6) for (let a = 0; a < 6.28 && !hit; a += .5) { const x = b.x + b.width / 2 + Math.cos(a) * r, y = b.y + b.height / 2 + Math.sin(a) * r; await page.mouse.move(x, y); if (await page.evaluate(() => document.querySelector('.ivm canvas').classList.contains('hot'))) hit = [x, y]; }
  console.log('grab at', hit);
  await page.mouse.down(); for (let s = 1; s <= 20; s++) { await page.mouse.move(hit[0] + s * 18, hit[1] - s * 10); await sleep(60); }
  await sleep(400); await shot('drag-mid'); await page.mouse.up(); await sleep(4000); await page.mouse.move(1599, 300); await shot('drag-after');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
