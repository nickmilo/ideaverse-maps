// Link colors: no menu; up yellow, related purple, other properties slate
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  console.log('menu gone:', await page.evaluate(() => !document.querySelector('.ivm #lcolbtn')));
  await page.locator('.ivm input[type=search], .ivm #q').first().fill('Home'); await sleep(600); await page.keyboard.press('Enter'); await sleep(2000);
  await shot('link-colors');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
