module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); console.log('view', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view()));
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await sleep(1500); await page.mouse.move(5, 950); await shot('kand-48');
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 950); await shot('kand-links');
  await page.evaluate(() => { const b = document.querySelector('.ivm #themeseg button[data-th="lyt"]'); if (b) b.click(); }); await sleep(1500); await page.mouse.move(5, 950); await shot('kand-dark');
  console.log('errors:', errs.join(' | ') || 'none');
};
