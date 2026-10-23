// Autoplay → Hop between maps, too: every third step a new map, same note
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await shot('ap-bar');
  await page.evaluate(() => { const r = document.querySelector('.ivm #pint'); r.value = 2; r.dispatchEvent(new Event('input')); });
  await q('.pmaps').click(); await sleep(200); console.log('toggle on:', await page.evaluate(() => document.querySelector('.ivm #pmaps').checked));
  await q('#pplay').click();
  const seen = [];
  for (let t = 0; t < 26; t++) { await sleep(1000); const v = await page.evaluate(() => { const r = document.querySelector('.ivm'); return r.dataset.view + (r.dataset.dome === '1' ? '*' : ''); }); if (seen[seen.length - 1] !== v) seen.push(v); if (t === 13) await shot('ap-mid'); }
  console.log('views:', seen.join(' → '));
  console.log('autoplay mode still:', await page.evaluate(() => document.querySelector('.ivm #playseg button[aria-pressed="true"]')?.textContent));
  await q('#pplay').click(); await shot('ap-end');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
