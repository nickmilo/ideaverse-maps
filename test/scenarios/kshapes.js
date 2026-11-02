module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header [data-tip]')].find(x => /settings$/.test(x.dataset.tip)); b.click(); }); await sleep(500);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('.ivm .kdany .arnrow')].map(r => (r.hidden ? '(hidden)' : '') + r.querySelector('.eol').textContent).join(' | '));
  console.log('rows', await rows());
  const cnt = async lab => { await page.evaluate(l => { const b = [...document.querySelectorAll('.ivm .kdany .seg button')].find(x => x.textContent === l); b.click(); }, lab); await sleep(2000); return page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; return m._view(); }); };
  await cnt('24'); await shot('kshapes-24'); await cnt('96'); await shot('kshapes-96');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm .kdany .seg button')].find(x => x.textContent === 'Squares'); b.click(); }); await sleep(800); console.log('rows squares', await rows());
  console.log('errors:', errs.join(' | ') || 'none');
};
