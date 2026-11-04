module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  console.log('left editor', await page.evaluate(() => !!document.querySelector('.ivm-card-left:not([hidden])')), 'center exists', await page.evaluate(() => !!document.querySelector('.ivm-card-center')));
  const P = 'Atlas/Things/Pace Layers.md', orig = await page.evaluate(P => app.vault.read(app.vault.getAbstractFileByPath(P)), P);
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const xy = t => page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__xy(t), t);
  for (const src of ['The Long Now', 'Brian Eno']) { const a = await xy(src), b = await xy('Pace Layers'); await page.keyboard.down('Alt'); await page.mouse.move(cr.x + a[0], cr.y + a[1]); await page.mouse.down(); for (let q = 1; q <= 12; q++) { await page.mouse.move(cr.x + a[0] + (b[0] - a[0]) * q / 12, cr.y + a[1] + (b[1] - a[1]) * q / 12); await sleep(40); } await sleep(200); await page.mouse.up(); await page.keyboard.up('Alt'); await sleep(1500); console.log('after', src, JSON.stringify(a), await page.evaluate(() => [...document.querySelectorAll('.notice')].map(n => n.textContent).join(' / '))); }
  const t = await page.evaluate(P => app.vault.read(app.vault.getAbstractFileByPath(P)), P); console.log('body', JSON.stringify(t.slice(t.indexOf('---', 4) + 3, t.indexOf('---', 4) + 140)));
  await page.evaluate(([P, o]) => app.vault.modify(app.vault.getAbstractFileByPath(P), o), [P, orig]); await sleep(600);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(400); await shot('disp');
  console.log('more maps switch', await page.evaluate(() => /Show more maps/.test(document.querySelector('.ivm #disppop').textContent)), 'left-side switch', await page.evaluate(() => /left side/.test(document.querySelector('.ivm #disppop').textContent)));
  console.log('errors:', errs.join(' | ') || 'none');
};
