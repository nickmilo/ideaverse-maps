module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #filtbtn').first().click(); await sleep(800); await shot('fc-open');
  const h = () => page.evaluate(() => { const r = document.querySelector('.ivm #filtpop').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
  console.log('height all open', await h()); const pos = () => page.evaluate(() => [...document.querySelectorAll('.ivm .fheads .fhb')].map(b => Math.round(b.getBoundingClientRect().left)).join(','));
  for (const t of ['Years', 'Folders', 'Collections']) { await page.locator('.ivm .fheads .fhb', { hasText: t }).first().click(); await sleep(300); console.log('after hiding ' + t, await h(), 'switch spots', await pos(), '| popover open', await page.evaluate(() => !document.querySelector('.ivm #filtpop').hidden)); }
  await shot('fc-shut'); await page.locator('.ivm .fheads .fhb', { hasText: 'Bases' }).first().click(); await sleep(300); console.log('all folded', await h()); await shot('fc-all');
  console.log('errors:', errs.join(' | ') || 'none');
};
