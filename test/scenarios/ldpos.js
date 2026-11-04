module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000);
  const P = 'Atlas/Things/Pace Layers.md', orig = await page.evaluate(P => app.vault.read(app.vault.getAbstractFileByPath(P)), P);
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const xy = t => page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__xy(t), t);
  for (const [j, mode] of [[1, 'top'], [2, 'bullet'], [3, 'bottom']]) {
    await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(400);
    await page.evaluate(j => { const r = [...document.querySelectorAll('.ivm #disppop .eorow')].find(x => /-drop/.test(x.textContent)); [...r.querySelectorAll('button')][j].click(); }, j); await sleep(200);
    if (mode === 'top') await shot('disp-ldpos');
    await page.keyboard.press('Escape'); await page.mouse.click(cr.x + 700, cr.y + 120); await sleep(400);
    await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500);
    const a = await xy('The Long Now'), b = await xy('Pace Layers');
    await page.keyboard.down('Alt'); await page.mouse.move(cr.x + a[0], cr.y + a[1]); await page.mouse.down(); for (let q = 1; q <= 12; q++) { await page.mouse.move(cr.x + a[0] + (b[0] - a[0]) * q / 12, cr.y + a[1] + (b[1] - a[1]) * q / 12); await sleep(40); }
    await sleep(300); if (mode === 'bullet') await shot('ld-hint-bullet'); await page.mouse.up(); await page.keyboard.up('Alt'); await sleep(1500);
    const t = await page.evaluate(P => app.vault.read(app.vault.getAbstractFileByPath(P)), P); const body = t.slice(t.indexOf('---', 4) + 3);
    console.log(mode, JSON.stringify(body.slice(0, 70)), '…', JSON.stringify(body.slice(-60)));
    await page.evaluate(([P, o]) => app.vault.modify(app.vault.getAbstractFileByPath(P), o), [P, orig]); await sleep(800); }
  console.log('errors:', errs.join(' | ') || 'none');
};
