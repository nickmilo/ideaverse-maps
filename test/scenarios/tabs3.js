module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="lyt"]').click());
  const tabs = () => page.evaluate(() => [...document.querySelectorAll('.ivm #vseg button, .ivm #vcur')].filter(b => b.offsetParent).map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' | '));
  console.log('start:', await tabs());
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="sense"]').click()); await sleep(2500); console.log('sense:', await tabs());
  await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(400); console.log('more:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].filter(b => !b.hidden && b.offsetParent).map(b => b.textContent).join(', ')));
  await page.evaluate(() => document.querySelector('.ivm #gocsi').click()); await sleep(3000); console.log('tesla:', await tabs());
  const v = await page.evaluate(() => { const lf = app.workspace.getLeavesOfType('ideaverse-maps')[0]; const m = lf.view.map; const fs = app.vault.getMarkdownFiles().map(f => f.path); const p = fs.find(f => /Home|MOC|Map/i.test(f)) || fs[0]; m.openNote(p); return p; });
  console.log('sel', v); await sleep(2500); await page.mouse.move(1599, 300); await shot('t3-a');
  await page.mouse.move(700, 500); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(700 + i*25, 500); await sleep(20); } await page.mouse.up(); await sleep(1500);
  await page.mouse.move(1599, 300); await shot('t3-b');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
