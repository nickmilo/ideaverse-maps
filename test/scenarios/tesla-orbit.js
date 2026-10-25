module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const btns = () => page.evaluate(() => [...document.querySelectorAll('.ivm #driftseg button')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent).join(','));
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gocsi').click(); }); await sleep(2500); console.log('tesla:', await btns());
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gocso').click(); }); await sleep(2500); console.log('corona:', await btns());
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gochord').click(); }); await sleep(2500); console.log('chord:', await btns());
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gocsi').click(); }); await sleep(1500);
  await page.evaluate(() => { const b = document.querySelector('.ivm #driftseg button[data-d="lively"]'); b && b.click(); }); await sleep(3000); await page.mouse.move(1599, 300); await shot('tesla-lively');
  console.log('errors:', errs.join(' | ') || 'none');
};
