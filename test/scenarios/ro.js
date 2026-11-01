// readouts on dark cards, zoom buttons, LYT mark
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await page.locator('.ivm .chartsw').click(); await sleep(800); await page.locator('.ivm .chxbox .chx').nth(1).click(); await sleep(800); await page.keyboard.press('Escape'); await sleep(1500);
  await page.mouse.move(5, 900); await shot('ro-hubs');
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 900); await sleep(800); await shot('ro-pace');
  await page.keyboard.press('z'); await sleep(2500); await page.mouse.move(5, 900); await shot('ro-pace-close');
  console.log('errors:', errs.join(' | ') || 'none');
};
