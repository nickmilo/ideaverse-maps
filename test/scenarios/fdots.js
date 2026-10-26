module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const live = () => page.evaluate(() => [...document.querySelectorAll('.ivm .fhb.live')].map(b => b.textContent).join(',') || '(none)');
  await page.locator('.ivm #filtbtn').click(); await sleep(600); console.log('start', await live());
  await page.locator('.ivm .mcol label.bqv input').first().click(); await sleep(800); console.log('moc', await live());
  await page.evaluate(() => { const r = document.querySelector('.ivm #ycol input[type=range]'); r.value = String(+r.max - 2); r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }); await sleep(800); console.log('years', await live());
  await page.locator('.ivm #foldlist input[type=checkbox]').first().click(); await sleep(800); console.log('folder', await live());
  await shot('fdots');
  console.log('errors:', errs.join(' | ') || 'none');
};
