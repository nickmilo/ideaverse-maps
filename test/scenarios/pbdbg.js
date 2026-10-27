module.exports = async ({ page, sleep }) => {
  await page.setViewportSize({ width: 430, height: 900 }); await sleep(1500);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  console.log(await page.evaluate(() => [document.body.className, document.querySelector('.ivm #viewms').parentElement.className, document.querySelector('.ivm .tbr').className].join(' || ')));
};
