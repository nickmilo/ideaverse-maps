module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #gocso').click()); await sleep(3000); await shot('cb-none');
  await page.locator('.ivm #q').fill('Spark'); await sleep(500); await page.keyboard.press('Enter'); await sleep(2000); await shot('cb-sel');
};
