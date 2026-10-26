module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('Shift+Slash'); await sleep(600); await shot('kc-open'); console.log('open', await page.evaluate(() => !document.querySelector('.ivm .keycard').hidden));
  await page.keyboard.press('Escape'); await sleep(300); console.log('esc', await page.evaluate(() => document.querySelector('.ivm .keycard').hidden));
  console.log('hints', await page.evaluate(() => ['#dplay', '#pplay', '#tlplay', '#follownote', '#filtbtn', '#focusmode', '#anitab'].map(s => document.querySelector('.ivm ' + s)?.getAttribute('aria-label')).join(' | ')));
  await page.keyboard.press('o'); await sleep(400); console.log('orbit label', await page.evaluate(() => document.querySelector('.ivm #dplay').getAttribute('aria-label'))); await page.keyboard.press('o');
  await page.locator('.ivm #dispbtn').click(); await sleep(400); await shot('kc-display'); await page.locator('.ivm .kbrow').click(); await sleep(400); console.log('from display', await page.evaluate(() => !document.querySelector('.ivm .keycard').hidden));
  await page.mouse.click(300, 900); await sleep(300); console.log('click away', await page.evaluate(() => document.querySelector('.ivm .keycard').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
