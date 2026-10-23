// Corona / Tesla → Layout → Bands toggles the bands between kinds
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); await q('#mexp > summary').click(); await sleep(200);
  await q('#gocso').click(); await sleep(2500);
  console.log('Bands visible on Corona:', await q('#csbands').isVisible(), '| pressed:', await q('#csbands').getAttribute('aria-pressed'));
  await shot('bands-on'); await q('#csbands').click(); await sleep(500); await shot('bands-off');
  await q('#vmore').click(); await sleep(300); await q('#gocsi').click(); await sleep(2500); await shot('tesla-off');
  console.log('Tesla Bands pressed:', await q('#csbands').getAttribute('aria-pressed'));
  await q('#vmore').click(); await sleep(300); await q('#gochord').click(); await sleep(2000); console.log('Bands on flat Chord:', await q('#csbands').isVisible());
};
