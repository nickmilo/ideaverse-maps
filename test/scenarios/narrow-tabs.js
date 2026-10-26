// A narrow map: tabs that don't fit fold into More maps; widening the tab keeps the map centered; the areas switch in Display
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const state = () => page.evaluate(() => ({ tabs: [...document.querySelectorAll('.ivm #vseg > button[data-v]')].filter(b => !b.hidden && b.offsetParent).map(b => b.dataset.v).join(','), more: document.querySelector('.ivm #vmore').textContent, fold: [...document.querySelectorAll('.ivm .vfold button')].map(b => b.textContent).join(','), w: document.querySelector('.ivm canvas').clientWidth }));
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1200); };
  console.log('wide', JSON.stringify(await state()));
  await split(780); console.log('780', JSON.stringify(await state())); await shot('nt-780');
  await split(640); console.log('640', JSON.stringify(await state()));
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm #golincal').click(); }); await sleep(1500);
  for (const w of [640, 520, 430]) { await split(w); console.log('lincal ' + w, JSON.stringify(await state())); await shot('nt-lc-' + w); }
  await split(640);
  await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(500); await shot('nt-640-more'); await page.keyboard.press('Escape');
  // centering: the middle of the map stays in the middle as the tab widens
  const mid = () => page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, a = m._scr('Home.md'), w = document.querySelector('.ivm canvas').clientWidth; return [Math.round(a[0] - w / 2), Math.round(w)]; });
  const m1 = await mid(); await split(1100); const m2 = await mid(); console.log('Home from centre at 640:', m1, 'at 1100:', m2);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(400); await shot('nt-disp');
  console.log('disp rows:', await page.evaluate(() => [...document.querySelectorAll('.ivm #disppop .drow')].filter(l => !l.hidden).map(l => l.textContent).join(' | ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
