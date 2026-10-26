module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => { const lc = document.querySelector('.ivm #legclose'); if (lc) lc.click(); const d = document.querySelector('.ivm #animdock'); const b = d && d.querySelector('button[aria-label="Tuck animations away"]'); if (b) b.click(); }); await sleep(300);
  await page.locator('.ivm #vmore').click(); await sleep(500); await page.locator('.ivm #vmorepop details > summary').first().click(); await sleep(300); await shot('cr-menu');
  await page.locator('.ivm #gocrumbs').click(); await sleep(2500); await page.keyboard.press('Escape'); await sleep(500); await shot('cr-full');
  // a short, wide pane: split the map below an editor
  await page.evaluate(async () => { const l = app.workspace.getLeavesOfType('ideaverse-maps')[0]; const nl = app.workspace.createLeafBySplit(l, 'horizontal', true); await nl.openFile(app.vault.getMarkdownFiles()[0]); nl.setDimension(78); l.setDimension(22); window.dispatchEvent(new Event('resize')); }); await sleep(2000);
  await page.locator('.ivm #zfit').click().catch(() => {}); await sleep(1000); await shot('cr-short');
  const box = await page.evaluate(() => { const c = document.querySelector('.ivm canvas').getBoundingClientRect(); return [c.left, c.top]; });
  const at = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[1]?.view.map || app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; return null; }); await page.mouse.click(box[0] + 140, box[1] + 150); await sleep(800); await shot('cr-sel'); await page.mouse.move(box[0] + 600, box[1] + 150); for (let q = 0; q < 6; q++) { await page.mouse.wheel(0, 300); await sleep(150); } await sleep(500); await shot('cr-scrolled'); console.log('sel', await page.evaluate(() => document.querySelector('.ivm aside h2')?.textContent || 'none'));
  console.log('errors:', errs.join(' | ') || 'none');
};
