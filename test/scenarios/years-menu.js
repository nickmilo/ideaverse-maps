module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => window.__ivReveal('#yrctl')); await sleep(600);
  await page.locator('.ivm #mapopts').screenshot({ path: process.env.SHOTS + '/yr-pop.png' });
  console.log(await page.evaluate(() => !document.querySelector('.ivm #yrctl').hidden));
};
