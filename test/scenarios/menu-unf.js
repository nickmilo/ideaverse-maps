module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  await page.locator('.ivm #vmore').click(); await sleep(400);
  for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(120); }
  console.log(await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop details details > summary')].map(s => s.textContent.trim()).join(' / ')));
  await shot('menu');
};
