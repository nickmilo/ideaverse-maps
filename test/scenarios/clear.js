// Starfield → Galaxy glow: Clear versus Soft
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); }); await sleep(600);
  const glow = async g => { await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await page.locator(`.ivm .sglow button[data-g="${g}"]`).click(); await sleep(1500); await page.keyboard.press('Escape'); await sleep(1200); };
  const zoom = n => page.evaluate(n => { const cv = document.querySelector('.ivm canvas'); const r = cv.getBoundingClientRect(); for (let i = 0; i < n; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, clientX: r.left + r.width*.62, clientY: r.top + r.height*.55, ctrlKey: true, bubbles: true, cancelable: true })); }, n);
  await glow('soft'); await page.mouse.move(5, 900); await shot('soft'); await zoom(6); await sleep(1200); await shot('soft-zoom');
  await glow('clear'); await page.mouse.move(5, 900); await sleep(800); await shot('clear-zoom');
  await page.evaluate(() => document.querySelector('.ivm #zfit').click()); await sleep(2500); await page.mouse.move(5, 900); await shot('clear');
  await page.evaluate(() => { const t = document.querySelector('.ivm #legtab'); t && t.click(); }); await sleep(800); await shot('clear-legend');
  await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await page.locator('.ivm input[name="s3d"][value="3d"]').click(); await sleep(3000); await page.keyboard.press('Escape'); await sleep(1500); await page.mouse.move(5, 900); await shot('clear-3d');
  console.log('errors:', errs.join(' | ') || 'none');
};
