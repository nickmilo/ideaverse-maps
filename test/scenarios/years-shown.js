module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const cnt = () => page.evaluate(() => document.querySelector('.ivm .mapstats, .ivm #stats').textContent.trim());
  console.log('all:', await cnt());
  await page.evaluate(() => document.querySelector('.ivm #vcur, .ivm #vseg button[data-v="emergence"]').click()); await sleep(500);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="emergence"]').click()); await sleep(500); await shot('yr-menu');
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('.ivm #yrctl input'); a.value = 2022; a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); b.value = 2024; b.dispatchEvent(new Event('input')); b.dispatchEvent(new Event('change')); }); await sleep(1500);
  console.log('2022-2024:', await cnt(), await page.evaluate(() => document.querySelector('.ivm #yrctl .yrv').textContent)); await shot('yr-menu2');
  await page.mouse.click(1500, 950); await sleep(1500); await page.mouse.move(1599, 300); await shot('yr-emergence');
  await page.evaluate(() => document.querySelector('.ivm #xseg button[data-x="ace"]').click()); await sleep(1500); console.log('ACE:', await cnt());
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="sense"]').click()); await sleep(1500); console.log('sense:', await cnt());
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="gravity"]').click()); await sleep(1500); console.log('gravity:', await cnt()); await page.evaluate(() => document.querySelector('.ivm #xseg button[data-x="time"]').click()); await sleep(1500); await page.mouse.move(1599, 300); await shot('yr-gravity');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
