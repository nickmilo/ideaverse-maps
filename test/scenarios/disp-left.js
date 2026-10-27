module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.screenshot({ path: process.env.SHOTS + '/dl-bar.png', clip: { x: 344, y: 80, width: 1156, height: 45 } });
  await page.locator('.ivm #dispbtn').click(); await sleep(500); await shot('dl-open'); await page.keyboard.press('Escape'); await page.locator('.ivm #viewbtn').click(); await sleep(500); await shot('dl-saved');
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1200); };
  await page.keyboard.press('Escape'); for (const w of [800, 600]) { await split(w); await page.screenshot({ path: process.env.SHOTS + '/dl-' + w + '.png', clip: { x: 344, y: 80, width: w, height: 90 } }); }
  console.log('errors:', errs.join(' | ') || 'none');
};
