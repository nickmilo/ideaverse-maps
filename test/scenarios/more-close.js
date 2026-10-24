module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.locator('.ivm #vmore').click(); await sleep(300);
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(1500);
  console.log('More closed after picking Starfield:', await page.evaluate(() => document.querySelector('.ivm #vmorepop').hidden), '| view:', await page.evaluate(() => document.querySelector('.ivm').dataset.view));
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(300);
  await page.locator('.ivm #vseg button[data-v=gravity]').click(); await sleep(1500);
  console.log('Starfield menu closed after picking Gravity:', await page.evaluate(() => document.querySelector('.ivm #mapopts').hidden));
};
