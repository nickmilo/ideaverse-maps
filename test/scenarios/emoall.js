module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  for (const [key, nm] of [['2','ideaverse'],['3','stars'],['5','gravity'],['6','graph'],['7','treemap'],['8','mosaic'],['9','shelf'],['-','tesla'],['=','corona'],['[','chord']]) {
    await page.keyboard.press(key); await sleep(2500);
    const g = page.locator('.ivm #mapsetbtn'); if (!(await g.isVisible())) { console.log(nm, 'no gear'); continue; }
    await g.click(); await sleep(400); const sw = page.locator('.ivm #emoany .emosw');
    if (!(await sw.isVisible())) { console.log(nm, 'no switch'); await page.keyboard.press('Escape'); continue; }
    await sw.click(); await sleep(2000); await page.keyboard.press('Escape'); await sleep(1200); await shot('emo-' + nm); console.log(nm, 'shot');
  }
  console.log('errors:', errs.join(' | ') || 'none');
};
