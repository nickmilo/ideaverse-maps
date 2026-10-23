// Autoplay → Map + And explore trails as you go: map hop, then two-thirds in, a linked note
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  console.log('trail toggle hidden on Thread:', await page.evaluate(() => document.querySelector('.ivm #ptrail').closest('label').hidden));
  await page.evaluate(() => { const r = document.querySelector('.ivm #pint'); r.value = 3; r.dispatchEvent(new Event('input')); });
  await q('#playseg button[data-p="map"]').click(); await sleep(300);
  await page.locator('.ivm .pmaps', { hasText: 'trails' }).click(); await sleep(200);
  const log = []; let last = '';
  for (let t = 0; t < 40; t++) { await sleep(500); const s_ = await page.evaluate(() => document.querySelector('.ivm').dataset.view + ' | ' + (document.querySelector('.ivm .drawer h1, .ivm #dtitle, .ivm .np h1')?.textContent || app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivCam().sel)); if (s_ !== last) { log.push((t*0.5).toFixed(1) + 's ' + s_); last = s_; } if (t === 20) await shot('trail-mid'); }
  console.log(log.join('\n'));
  await q('#pplay').click();
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
