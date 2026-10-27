module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #viewbtn').click(); await sleep(500); await page.mouse.move(10, 900); await sleep(300); await shot('vs-open');
  console.log(await page.evaluate(() => [...document.querySelectorAll('.ivm #vlist > *')].map(e => e.tagName === 'DETAILS' ? '[' + e.querySelector('summary .t').textContent + '] ' + [...e.querySelectorAll('.vr b')].map(b => b.textContent).join(', ') : e.textContent).join(' | ')));
  await page.locator('.ivm #vlist .vr', { hasText: 'Space-Time' }).locator('.vgo').click(); await sleep(1500);
  console.log('map', await page.evaluate(() => document.querySelector('.ivm #vmore').textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
