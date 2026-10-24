module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(300);
  console.log('tlall gone:', await page.evaluate(() => !document.querySelector('.ivm #tlall')));
  await page.locator('.ivm #tlplay').click(); await sleep(300); await page.locator('.ivm #pplay').click(); await sleep(1500); await shot('as-both');
  console.log('labels:', await page.evaluate(() => [...document.querySelectorAll('.ivm .aniwrap')].map(w => (w.hidden ? '-' : '') + w.dataset.a + (w.classList.contains('run') ? '•' : '')).join(' ')));
  await page.locator('.ivm #vmore').click(); await sleep(300); await page.evaluate(() => document.querySelector('.ivm #gocso').click()); await sleep(3000); await shot('as-corona');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
