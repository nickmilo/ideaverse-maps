module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.locator('.ivm #filtbtn').click(); await sleep(300); await page.locator('.ivm #foldbtn').click(); await sleep(300);
  const r = await page.evaluate(() => { const b = document.querySelector('.ivm #foldbtn').getBoundingClientRect(); return [b.right + 30, b.top + b.height/2]; });
  await page.mouse.click(r[0], r[1]); await sleep(300);
  console.log('folders closed:', await page.evaluate(() => document.querySelector('.ivm #foldpop').hidden), '| filter still open:', await page.evaluate(() => !document.querySelector('.ivm #filtpop').hidden));
  await page.locator('.ivm #collbtn').click(); await sleep(300); const r2 = await page.evaluate(() => { const b = document.querySelector('.ivm #collbtn').getBoundingClientRect(); return [b.right + 20, b.top + b.height/2]; });
  await page.mouse.click(r2[0], r2[1]); await sleep(300);
  console.log('collections closed:', await page.evaluate(() => document.querySelector('.ivm #collpop').hidden));
};
