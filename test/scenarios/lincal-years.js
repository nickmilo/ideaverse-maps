// Linear Calendar's menu: the Years slider and Whole / Half months
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.locator('.ivm #vmore').first().click(); await sleep(300);
  await page.evaluate(() => { document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm #golincal').click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500);
  await page.mouse.move(1500, 800); await shot('lcy-menu');
  // drag: set the first handle three years back
  await page.evaluate(() => { const [a] = document.querySelectorAll('.ivm #lcyr .dual input'); a.value = String(+a.value - 3); a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); }); await sleep(1500);
  console.log('label:', await page.evaluate(() => document.querySelector('.ivm #lcyear').textContent));
  await shot('lcy-range');
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lchalf button')][1].click()); await sleep(1500);
  await page.mouse.move(1500, 800); await shot('lcy-half');
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('.ivm #lcyr .dual input'); a.value = b.value; a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #lcprev').click()); await sleep(1500);
  console.log('after ‹:', await page.evaluate(() => document.querySelector('.ivm #lcyear').textContent));
  await page.keyboard.press('Escape'); await sleep(300); await shot('lcy-half-one');
  console.log('errors:', errs.join(' | ') || 'none');
};
