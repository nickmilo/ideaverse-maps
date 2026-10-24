module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Films.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(7000);
  await shot('films-rows');
  await page.evaluate(() => document.querySelector('.ivm-bases #vcur').click()); await sleep(500);
  await page.evaluate(() => { const s = document.querySelector('.ivm-bases #planes'); s.value = 'genre'; s.dispatchEvent(new Event('change')); }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm-bases #pmode [data-pm="mosaic"]').click()); await sleep(1500);
  await page.evaluate(() => { const s = document.querySelector('.ivm-bases #psize'); s.value = 'rank'; s.dispatchEvent(new Event('change')); }); await sleep(2500);
  await shot('mosaic-menu');
  await page.evaluate(() => document.body.click()); await sleep(4000); await shot('mosaic');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
