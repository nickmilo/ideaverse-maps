module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (!d.classList.contains('collapsed')) d.querySelector('.acol').click(); }); await sleep(300);
  await page.evaluate(() => { const l = document.querySelector('.ivm #legend'); if (!l.classList.contains('collapsed')) l.click(); }); await sleep(500);
  await shot('at-both-tucked');
  await page.locator('.ivm #legtab').click(); await sleep(600); await shot('at-legend-open');
  await page.locator('.ivm #anitab').click(); await sleep(400); await page.locator('.ivm #animdock .anitabs button[data-a=wander]').click(); await page.locator('.ivm #pplay').click(); await sleep(300);
  const r = await page.evaluate(() => document.querySelector('.ivm #animdock .anihead').getBoundingClientRect()); await page.mouse.click(r.right - 60, r.bottom + 60 > 0 ? r.top + 3 : 0); await sleep(300);
  console.log('tucked by empty click:', await page.evaluate(() => document.querySelector('.ivm #animdock').hidden));
  await page.locator('.ivm #anitab').click(); await sleep(300); await page.evaluate(() => document.querySelector('.ivm #animdock').dispatchEvent(new MouseEvent('click', {bubbles: true}))); await sleep(300); await sleep(400); await shot('at-running');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
