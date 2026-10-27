module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  console.log('label', await page.evaluate(() => document.querySelector('.ivm #viewbtn').getAttribute('aria-label')));
  await page.keyboard.press('v'); await sleep(400); console.log('open', await page.evaluate(() => !document.querySelector('.ivm #viewpop').hidden));
  await page.keyboard.press('Escape'); await sleep(200); await page.keyboard.press('Shift+Slash'); await sleep(300);
  console.log('card has V', await page.evaluate(() => /Saved views/.test(document.querySelector('.ivm .keycard').textContent)));
  console.log('errors:', errs.join(' | ') || 'none');
};
