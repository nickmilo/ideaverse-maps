module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(300);
  const st = () => page.evaluate(() => `${[...document.querySelectorAll('.ivm #playseg button')].map(b => b.textContent).join('/')} pplay=${document.querySelector('.ivm #pplay').textContent} trailsToggle=${!document.querySelector('.ivm #ptrail').closest('label').hidden}`);
  for (const m of ['thread', 'map', 'random']) { await page.locator(`.ivm #playseg button[data-p=${m}]`).first().click(); await sleep(500); console.log(m, await st()); }
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
