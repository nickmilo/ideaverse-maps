module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await sleep(1500); await page.mouse.move(5, 950); await shot('plan');
  // zoom in on the circle
  const c = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, cv = document.querySelector('.ivm #cv').getBoundingClientRect(), a = m._at('Atlas/Things/Pace Layers.md'); return [cv.left + cv.width / 2, cv.top + cv.height * .42]; });
  await page.mouse.move(c[0], c[1]); for (let q = 0; q < 0; q++) { await page.mouse.wheel(0, 300); await sleep(120); } await sleep(800);
  await page.mouse.move(5, 950); await shot('plan-zoom');
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 950); await shot('plan-sel');
  console.log('errors:', errs.join(' | ') || 'none');
};
