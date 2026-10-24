module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const r1 = await page.evaluate(() => { const r = document.querySelector('.ivm header .hcol').getBoundingClientRect(); return [Math.round(r.left + r.width/2), Math.round(r.top + r.height/2)]; });
  await page.mouse.click(r1[0], r1[1]); await sleep(600);
  const r2 = await page.evaluate(() => { const r = document.querySelector('.ivm .htab').getBoundingClientRect(); return [Math.round(r.left + r.width/2), Math.round(r.top + r.height/2)]; });
  console.log('︿ at', r1, '→ ﹀ at', r2, '| header hidden:', await page.evaluate(() => document.querySelector('.ivm header').hidden));
  await shot('htab'); await page.mouse.click(r1[0], r1[1]); await sleep(600);
  console.log('same click reopens:', await page.evaluate(() => !document.querySelector('.ivm header').hidden));
};
