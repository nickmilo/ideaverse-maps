module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 950); await sleep(1000); await shot('g0');
  for (let r = 0; r < 4; r++) { const txt = await page.evaluate(() => (document.querySelector('.ivm .ckgame .ckgtx') || {}).textContent); console.log('Q:', txt);
    await page.keyboard.press(r % 2 ? '2' : '1'); await sleep(1500); await shot('g' + (r + 1) + 'a'); console.log('A:', await page.evaluate(() => document.querySelector('.ivm .ckgame .ckghd').textContent)); await sleep(9000); await shot('g' + (r + 1) + 'b'); console.log('now at', await page.evaluate(() => document.querySelector('.ivm .ckgame .ckghd').textContent)); }
  console.log('errors:', errs.join(' | ') || 'none');
};
