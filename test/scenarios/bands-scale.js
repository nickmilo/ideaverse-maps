module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(6000);
  await page.evaluate(() => { const r = document.querySelector('.ivm-bases .ivm'); r.querySelector('#gocsi').click(); }); await sleep(3500);
  await shot('bands-base-tesla');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
