// Autoplay → Map: same note, a new map each step; globe turns notes to face you
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await page.evaluate(() => { const r = document.querySelector('.ivm #pint'); r.value = 3; r.dispatchEvent(new Event('input')); });
  await q('#playseg button[data-p="map"]').click(); await sleep(400);
  console.log('hop toggle hidden in Map mode:', await page.evaluate(() => document.querySelector('.ivm #pmaps').closest('label').hidden));
  const seen = []; const note = () => page.evaluate(() => document.querySelector('.ivm-tip, .ivm .drawer h2, .ivm #ntitle')?.textContent || '');
  for (let t = 0; t < 24; t++) { await sleep(1000); const v = await page.evaluate(() => document.querySelector('.ivm').dataset.view); if (seen[seen.length - 1] !== v) seen.push(v); if (t === 10) await shot('mm-mid'); }
  console.log('views:', seen.join(' → '));
  console.log('trail length (same note → 1):', await page.locator('.ivm #trail button, .ivm .trail button').count());
  await q('#pplay').click(); await sleep(300);
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goplglobe').click(); await sleep(2500);
  await q('#playseg button[data-p="thread"]').click(); await sleep(5000); await shot('mm-globe');
  console.log('globe zoom k:', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivCam()));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
