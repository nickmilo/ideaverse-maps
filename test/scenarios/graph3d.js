module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(300); await page.locator('.ivm #mapopts').screenshot({ path: process.env.SHOTS + '/g3-menu.png' });
  await page.evaluate(() => [...document.querySelectorAll('.ivm #gr3seg button')][1].click()); await page.mouse.click(1500, 950);
  const g = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph());
  const t0 = Date.now(); for (let q = 0; q < 90; q++) { const r = await g(); if (r.it >= r.its && r.key.startsWith('3d')) break; await sleep(1000); } console.log('settled 3D in', Date.now() - t0, JSON.stringify(await g()));
  await sleep(1500); await page.mouse.move(1599, 300); await shot('g3-a');
  const b = await page.locator('.ivm canvas').first().boundingBox(); await page.mouse.move(b.x + 300, b.y + 400); await page.mouse.down(); for (let s = 0; s < 20; s++) { await page.mouse.move(b.x + 300 + s * 15, b.y + 400 + s * 4); await sleep(40); } await page.mouse.up(); await sleep(800);
  await page.mouse.move(1599, 300); await shot('g3-b');
  await page.evaluate(() => { const f = app.vault.getMarkdownFiles().find(f => f.basename === 'Garden cosmos river tide'); app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(f.path); }); await sleep(2500); await page.evaluate(() => { const b = document.querySelector('.ivm aside #dcol'); b && b.click(); }); await sleep(800); await page.mouse.move(1599, 300); await shot('g3-sel');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
