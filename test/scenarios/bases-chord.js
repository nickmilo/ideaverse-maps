// Chord by Time inside a base
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(1500); await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('bases')) l.detach(); });
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(5000);
  const q = s => page.locator('.ivm-bases ' + s + ':visible').first();
  await q('#vmore').click(); await sleep(300); await q('#mexp > summary').click(); await sleep(200); await q('#gochord').click(); await sleep(2500);
  await q('#chordby button[data-cb="time"]').click(); await sleep(2500); await shot('base-chord-time');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
