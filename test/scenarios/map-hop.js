module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(300);
  const st = () => page.evaluate(() => { const h = document.querySelector('.ivm #pmaps'); return `checked=${h.checked} disabled=${h.disabled} visible=${!h.closest('label').hidden}`; });
  await page.locator('.ivm #playseg button[data-p=map]').click(); await sleep(800); console.log('map:', await st()); await shot('mh-map');
  await page.locator('.ivm #playseg button[data-p=thread]').click(); await sleep(500); console.log('thread:', await st());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
