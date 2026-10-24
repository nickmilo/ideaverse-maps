module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); });
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v=stars]').click()); await sleep(3000); await shot('sf-2d');
  await page.locator('.ivm #q').fill('Home'); await sleep(400); await page.keyboard.press('Enter'); await sleep(2500); await shot('sf-2d-sel');
  await page.keyboard.press('Escape'); await sleep(500);
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(400); await shot('sf-menu');
  await page.evaluate(() => document.querySelector('.ivm .sglow button[data-g=bright]').click()); await sleep(800); await shot('sf-bright-menu'); await page.keyboard.press('Escape'); await sleep(500); await shot('sf-bright');
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(300); await page.evaluate(() => document.querySelector('.ivm .sglow button[data-g=soft]').click()); await page.keyboard.press('Escape');
};
