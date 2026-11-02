module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  console.log('view', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view()));
  await page.mouse.move(5, 950); await shot('board-light');
  await page.evaluate(() => { const b = document.querySelector('.ivm #themeseg button[data-th="lyt"]'); if (b) b.click(); }); await sleep(1500); await page.mouse.move(5, 950); await shot('board-dark');
  const pt = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at('Atlas/Things/Pace Layers.md')); const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  if (pt) { await page.mouse.click(cvr.x + pt[0] + 20, cvr.y + pt[1] + 20); await sleep(2500); } console.log('picked', await page.evaluate(() => { const d = document.querySelector('.ivm #drawer h1, .ivm #drawer h2'); return d ? d.textContent : '-'; }));
  await page.mouse.move(5, 950); await shot('board-picked');
  console.log('errors:', errs.join(' | ') || 'none');
};
