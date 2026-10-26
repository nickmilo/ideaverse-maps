module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #capbtn').click()); await sleep(300);
  await page.evaluate(() => { [...document.querySelectorAll('.ivm #cappop .seg button')].find(x => x.textContent.startsWith('60')).click(); [...document.querySelectorAll('.ivm #cappop .seg button')].find(x => x.textContent === '5 s').click(); });
  await page.mouse.move(1599, 300); await shot('capfps-menu');
  await page.evaluate(() => [...document.querySelectorAll('.ivm #cappop .caprow .chip')][1].click()); await sleep(8000);
  console.log('card:', await page.evaluate(() => { const c = document.querySelector('.ivm .capcard'); return c ? c.textContent.slice(0, 80) : 'none'; }));
  console.log('errors:', errs.join(' | ') || 'none');
};
