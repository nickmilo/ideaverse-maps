module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); console.log('view', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view()));
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  for (const nm of ['Pace Layers', 'LYT Book Home']) { const t0 = Date.now(); await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => { document.activeElement && document.activeElement.blur(); const x = document.querySelector('.ivm #dx'); if (x) x.click(); }); await sleep(1500); await page.mouse.move(5, 950); await shot('kall-' + nm.split(' ')[0]); }
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header [data-tip]')].find(x => /settings$/.test(x.dataset.tip)); b.click(); }); await sleep(500);
  console.log('gear', await page.evaluate(() => [...document.querySelectorAll('.ivm .kdany > *')].filter(x => !x.hidden).map(x => x.textContent.trim()).join(' | ')));
  await page.evaluate(() => document.querySelectorAll('.ivm .kdany input')[0].click()); await sleep(2500); await shot('kall-capped');
  console.log('errors:', errs.join(' | ') || 'none');
};
