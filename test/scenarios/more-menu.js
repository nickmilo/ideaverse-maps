module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  for (const t of ['dark', 'paper']) { await page.evaluate(t => document.querySelector(`.ivm #themeseg [data-th="${t}"]`).click(), t); await sleep(400);
    await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(300); await page.evaluate(() => { const d = document.querySelector('.ivm #vmorepop details'); d && (d.open = true); }); await page.hover('.ivm #gotreemap', { timeout: 3000 }).catch(() => {}); await sleep(300);
    await page.locator('.ivm #vmorepop').screenshot({ path: process.env.SHOTS + '/more-' + t + '.png' }); await page.keyboard.press('Escape'); await page.mouse.click(1500, 900); await sleep(500); }
};
