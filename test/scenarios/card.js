// Edit mode: the card under the picked note, with a real Live Preview editor; typing saves
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500); await page.evaluate(() => document.querySelector('.ivm #themeseg button[data-th="lyt"]').click()); await sleep(800);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300); await page.keyboard.press('Escape');
  await page.locator('.ivm #q').fill(process.env.NOTE || 'Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 900); await sleep(800); await shot('card-open');
  if (process.env.MAPTH) { await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editopts button', { hasText: 'Map' }).click(); await sleep(300); await shot('card-menu'); await page.locator('.ivm #dispbtn').click(); await sleep(600); await page.mouse.move(5, 900); await shot('card-mapth'); }
  console.log('card', await page.evaluate(() => { const c = document.querySelector('.ivm-card'); return JSON.stringify({ hidden: c.hidden, cm: !!c.querySelector('.cm-editor'), lp: !!c.querySelector('.is-live-preview'), text: (c.querySelector('.cm-content') || {}).textContent ? c.querySelector('.cm-content').textContent.slice(0, 80) : null, layoutHasIt: JSON.stringify(app.workspace.getLayout()).includes('Pace Layers') && false }); }));
  // type a line at the end
  if (process.env.TYPE) { await page.locator('.ivm-card .cm-content').click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.type('\nTyped in the card [[Triangulation]]'); await sleep(5000); console.log('inLayout', await page.evaluate(() => JSON.stringify(app.workspace.getLayout()).includes('Pace Layers')));
    console.log('saved', await page.evaluate(async p => { const f = app.vault.getAbstractFileByPath(p); return (await app.vault.read(f)).slice(-60); }, process.env.FILE)); await shot('card-typed'); }
  await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.locator('.ivm canvas').first().click({ position: { x: 5, y: 5 } }).catch(() => {}); await sleep(500); await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0]; app.workspace.setActiveLeaf(v, { focus: true }); }); await page.keyboard.press('1'); await sleep(2000); await page.locator('.ivm #q').fill(process.env.NOTE || 'Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.mouse.move(5, 900); await shot('card-emergence');
  console.log('errors:', errs.join(' | ') || 'none');
};
