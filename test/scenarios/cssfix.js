module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(400);
  await page.evaluate(() => { for (const l of document.querySelectorAll('.ivm .dlist label')) if (/more maps in the header|way home/.test(l.textContent)) l.click(); }); await sleep(800);
  await page.screenshot({ path: process.env.SHOTS + '/css-disp.png', clip: { x: 344, y: 80, width: 1156, height: 360 } });
  console.log('errors:', errs.join(' | ') || 'none');
};
