module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const keys = (process.env.KEYS || '1,2,3,4,5,6,7,8,9,0,-,=,[,Backslash').split(',');
  for (const k of keys) { await page.keyboard.press('Escape'); await page.keyboard.press(k); await sleep(2500);
    const nm = await page.evaluate(() => document.querySelector('.ivm #vmore').textContent.trim());
    for (let i = 0; i < 3; i++) { await page.locator('.ivm #zout').click(); await sleep(150); }
    await page.mouse.move(800, 500); await page.mouse.down(); await page.mouse.move(500, 300, { steps: 5 }); await page.mouse.up(); await sleep(600);
    await page.locator('.ivm #zfit').click(); await sleep(1500);
    await page.screenshot({ path: process.env.SHOTS + '/fit-' + nm.replace(/\W+/g, '') + '.png', scale: 'css' }); console.log('shot', nm); }
  console.log('errors:', errs.join(' | ') || 'none');
};
