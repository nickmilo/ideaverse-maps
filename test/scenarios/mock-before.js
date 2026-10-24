module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const b = document.querySelector('.ivm #themeseg button[data-th=dark]'); b && b.click(); }); await sleep(800);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d && d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(500);
  await shot('before-emergence');
  await page.evaluate(() => document.querySelector('.ivm #gocso').click()); await sleep(3000); await shot('before-corona');
};
