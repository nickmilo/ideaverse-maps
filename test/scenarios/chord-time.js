// Chord → Layout → Folders | Time (also on Corona and Tesla)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); await q('#mexp > summary').click(); await sleep(200);
  await q('#gochord').click(); await sleep(2500);
  console.log('switch visible:', await q('#chordby').isVisible());
  await page.evaluate(s => __ivReveal(s), '#chordby'); await sleep(250); await q('#chordby button[data-cb="time"]').click(); await sleep(2500); await shot('chord-time');
  await q('#vmore').click(); await sleep(300); await q('#gocso').click(); await sleep(2500); await shot('corona-time');
  await page.evaluate(s => __ivReveal(s), '#chordby'); await sleep(250); await q('#chordby button[data-cb="folders"]').click(); await sleep(2000); await shot('corona-folders');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
