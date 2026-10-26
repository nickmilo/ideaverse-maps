module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  console.log('orb', await page.evaluate(() => document.querySelector('.ivm #themebtn').dataset.th));
  await page.locator('.ivm #themebtn').first().click(); await sleep(500); await shot('th-pop');
  await page.locator('.ivm .thpop #themeseg button[data-th="lyt"]').first().click(); await sleep(800);
  console.log('after', await page.evaluate(() => [document.querySelector('.ivm #themebtn').dataset.th, document.querySelector('.ivm #themepop').hidden].join(' ')));
  await page.locator('.ivm #themebtn').first().click(); await sleep(500); await shot('th-pop2');
  console.log('errors:', errs.join(' | ') || 'none');
};
