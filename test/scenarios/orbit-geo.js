module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const btns = () => page.evaluate(() => [...document.querySelectorAll('.ivm #driftseg button')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent).join(','));
  for (const id of ['#gogeoocta', '#gogeoshells', '#gogeosquare']) { await page.evaluate(id => document.querySelector('.ivm ' + id).click(), id); await sleep(2500); console.log(id, await btns()); }
  await page.evaluate(() => { document.querySelector('.ivm #goplglobe').click(); }); await sleep(3000);
  console.log('planet:', await page.evaluate(() => document.querySelector('.ivm').dataset.view + ' dome=' + document.querySelector('.ivm').dataset.dome), await btns());
  await page.evaluate(() => document.querySelector('.ivm #driftseg button[data-d="lively"]').click()); await page.evaluate(() => document.querySelector('.ivm #dplay').click()); await sleep(3000);
  console.log('errors:', errs.join(' | ') || 'none');
};
