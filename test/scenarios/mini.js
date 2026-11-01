// Starfield's overview map: shows where you are; click it to move there
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000); await shot('mini-all');
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('n'); await sleep(3000);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const cv = v.containerEl.querySelector('.ivm canvas'); const r = cv.getBoundingClientRect(); const p = v.map._at('Atlas/Things/Pace Layers.md');
    for (let i = 0; i < 12; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, clientX: r.left + p[0], clientY: r.top + p[1], ctrlKey: true, bubbles: true, cancelable: true })); }); await sleep(1500);
  await page.mouse.move(5, 900); await shot('mini-focus');
  const b = await page.locator('.ivm canvas.minimap').boundingBox(); console.log('mini', JSON.stringify(b));
  if (b) { await page.mouse.click(b.x + b.width * .2, b.y + b.height * .7); await sleep(1200); await page.mouse.move(5, 900); await shot('mini-jump'); }
  console.log('errors:', errs.join(' | ') || 'none');
};
