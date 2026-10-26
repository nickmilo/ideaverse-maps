module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #dispbtn').first().click(); await sleep(400);
  const row = page.locator('.ivm #disppop label.drow', { hasText: 'area and projects' }).first();
  await row.click(); await sleep(700);
  console.log('on: panel', await page.evaluate(() => !document.querySelector('.ivm #effpanel').hidden), '| display open', await page.evaluate(() => !document.querySelector('.ivm #disppop').hidden));
  await shot('eff-on');
  await row.click(); await sleep(700);
  console.log('off: panel', await page.evaluate(() => !document.querySelector('.ivm #effpanel').hidden), '| display open', await page.evaluate(() => !document.querySelector('.ivm #disppop').hidden));
  await page.locator('.ivm #vmore').first().click(); await sleep(400);
  console.log('list:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > button')].map(b => b.textContent).join(', ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
