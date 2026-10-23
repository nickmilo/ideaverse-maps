// Autoplay → And drift a little, too: flat maps glide, globes turn; Planet Flat/Tabletop dim on a pick
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const cam = () => page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug; return v.__ivCam ? v.__ivCam() : null; });
  await page.locator('.ivm .pmaps', { hasText: 'drift' }).click(); await sleep(200);
  console.log('drift toggle on:', await page.evaluate(() => document.querySelector('.ivm #pdrift').checked));
  await q('#pplay').click(); await sleep(1500); const a = await cam(); await sleep(3000); const b = await cam(); console.log('emergence camera moved:', JSON.stringify(a), '→', JSON.stringify(b));
  await shot('apd-emer');
  await q('#pplay').click(); await sleep(500);
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goplflat').click(); await sleep(2500);
  await q('#pplay').click(); await sleep(2500); await shot('apd-flat-dim'); await q('#pplay').click(); await sleep(300);
  await q('#vmore').click(); await sleep(300); await q('#goplglobe').click(); await sleep(2500);
  await q('#pplay').click(); await sleep(1000); await shot('apd-globe-1'); await sleep(3000); await shot('apd-globe-2'); await q('#pplay').click();
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
