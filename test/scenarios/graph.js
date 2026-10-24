module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { const b = document.querySelector('.ivm #themeseg [data-th="dark"]'); b && b.click(); }); await sleep(500);
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); });
  const g = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph());
  const t0 = Date.now(); for (let q = 0; q < 120; q++) { const r = await g(); if (r.it >= r.its) break; await sleep(1000); } console.log('settled in', Date.now() - t0, 'ms', JSON.stringify(await g()));
  await sleep(2500); await shot('graph');
  await page.evaluate(() => { const q = document.querySelector('.ivm #q'); q.value = 'Home'; q.dispatchEvent(new Event('input')); }); await sleep(500); await page.keyboard.press('Enter'); await sleep(2500);
  await shot('graph-sel');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
