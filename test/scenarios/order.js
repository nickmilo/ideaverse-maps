module.exports = async ({ page, sleep, shot }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #vmore').click(); await sleep(600); await shot('order');
  console.log(await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].map(c => c.textContent).join(' | ')));
  await page.keyboard.press('Escape'); for (const k of ['-', '[', ']', 'Backslash']) { await page.keyboard.press(k); await sleep(1300); console.log(k, await page.evaluate(() => document.querySelector('.ivm #vmore').textContent)); }
};
