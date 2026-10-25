module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gograph').click(); }); await sleep(9000);
  const spread = () => page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph(); return JSON.stringify(m); });
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(600);
  console.log('shown:', await page.evaluate(() => { const g = document.querySelector('.ivm #gfctl'); return g && !g.hidden && g.offsetParent !== null; }));
  await page.mouse.move(1599, 300); await shot('gf-menu'); console.log('def', await spread());
  await page.evaluate(() => { const r = document.querySelector('.ivm #gfctl input'); r.value = '0.02'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(6000);
  await page.mouse.click(1000, 950); await sleep(300); await page.mouse.move(1599, 300); await shot('gf-low'); console.log('low', await spread());
  await page.evaluate(() => { const r = document.querySelectorAll('.ivm #gfctl input')[0]; r.value = '0.6'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(6000);
  await page.mouse.move(1599, 300); await shot('gf-high'); console.log('high', await spread());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
