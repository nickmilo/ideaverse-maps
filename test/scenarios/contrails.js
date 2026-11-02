module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .drow', { hasText: 'Contrails' }).click(); await sleep(300); await page.locator('.ivm .ctrrk').click(); await sleep(200); await shot('ctr-menu'); await page.locator('.ivm #dispbtn').click(); await sleep(500);
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const click = async p => { const a = await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at(p), p); if (!a) return; await page.mouse.click(cvr.x + a[0], cvr.y + a[1]); };
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(600); await page.keyboard.press('Enter'); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  for (const nm of ['Habits Map', 'Concepts Map', 'Workshops']) { await pick(nm); await sleep(3200); }
  await page.mouse.move(5, 950); await pick('Pace Layers'); for (const ms of [150, 250, 250, 250]) { await sleep(ms); await shot('ctr-f' + ms + Math.random().toString(36).slice(2, 4)); } await sleep(2500); await shot('ctr-after');
  await page.keyboard.press('1'); await sleep(3000); await shot('ctr-emergence');
  console.log('errors:', errs.join(' | ') || 'none');
};
