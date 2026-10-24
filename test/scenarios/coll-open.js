module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.locator('.ivm #filtbtn').click(); await sleep(300); await page.locator('.ivm #collbtn').click(); await sleep(500);
  console.log('filter open:', await page.evaluate(() => !document.querySelector('.ivm #filtpop').hidden), '| collections open:', await page.evaluate(() => !document.querySelector('.ivm #collpop').hidden));
  await shot('coll-open');
};
