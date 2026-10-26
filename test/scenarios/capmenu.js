module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #capbtn').click()); await sleep(400);
  console.log(await page.evaluate(() => { const p = document.querySelector('.ivm #cappop'); return p.clientHeight + ' / ' + p.scrollHeight; }));
  await page.mouse.move(1599, 300); await shot('capmenu');
};
