module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  for (const id of ['spiral','lifeline','quincunx','tree','skyline','planet']) {
    const ok = await page.evaluate(id => { const b = document.querySelector('.ivm #go' + id); if (!b) return false; b.click(); return true; }, id); if (!ok) { console.log(id, 'no button'); continue; }
    await sleep(2500); await page.keyboard.press('Escape'); await sleep(300);
    const g = page.locator('.ivm #mapsetbtn'); if (!(await g.isVisible())) { console.log(id, 'no gear'); continue; }
    await g.click(); await sleep(400); const sw = page.locator('.ivm #emoany .emosw');
    if (!(await sw.isVisible())) { console.log(id, 'no switch'); await page.keyboard.press('Escape'); continue; }
    await sw.click(); await sleep(2000); await page.keyboard.press('Escape'); await sleep(1200); await shot('emo-' + id); console.log(id, 'shot');
  }
  console.log('errors:', errs.join(' | ') || 'none');
};
