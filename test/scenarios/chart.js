// Starfield → Star Chart: rings and signposts; click a signpost to hop
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await shot('chart-menu');
  await page.locator('.ivm input[name="s3d"][value="chart"]').click(); await sleep(2500); await page.keyboard.press('Escape'); await sleep(1500); await shot('chart-hubs');
  if (process.env.V2) { await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await shot('chart-menu2'); await page.locator('.ivm .chart2').click(); await sleep(2000); await page.keyboard.press('Escape'); await sleep(1500); await shot('chart2-hubs');
    console.log('orbit px', await page.evaluate(() => { const c = document.querySelector('.ivm canvas.chartorb'); if (!c) return 'none'; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) k++; return k + ' ' + c.style.left + ' ' + getComputedStyle(c).position; })); }
  await page.locator('.ivm #q').fill('Triangulation'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const dc = page.locator('.ivm #dcol'); if (await dc.isVisible()) { await dc.click(); await sleep(1200); }
  await page.evaluate(() => { const a = document.querySelector('.ivm #anitab'); const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); }); await sleep(800);
  await page.mouse.move(5, 900); await sleep(800); await shot('chart-tri');
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const cv = v.containerEl.querySelector('.ivm canvas'); const r = cv.getBoundingClientRect(); const p = v.map._at('Atlas/Things/Triangulation.md');
    for (let i = 0; i < 8; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, clientX: r.left + p[0], clientY: r.top + p[1], ctrlKey: true, bubbles: true, cancelable: true })); }); await sleep(1500);
  await page.mouse.move(5, 900); await sleep(600); await shot('chart-tri-zoom');
  const posts = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.containerEl.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  console.log('canvas', JSON.stringify(posts));
  console.log('errors:', errs.join(' | ') || 'none');
};
