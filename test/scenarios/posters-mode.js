module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack||'').split('\n').slice(1,4).join(' < ')));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Movies.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(6000);
  const r = () => document.querySelector('.ivm-bases');
  await page.evaluate(() => document.querySelector('.ivm-bases #vcur').click()); await sleep(600); await shot('mode-rows');
  await page.evaluate(() => document.querySelector('.ivm-bases #pmode [data-pm="scatter"]').click()); await sleep(1500);
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ivm-bases #postctl > *')].filter(e => !e.hidden).map(e => (e.className) + (e.querySelector('select') ? '=' + e.querySelector('select').value : '')))));
  if (await page.evaluate(() => document.querySelector('.ivm-bases #mapopts').hidden)) await page.evaluate(() => document.querySelector('.ivm-bases #vcur').click()); await sleep(500);
  await shot('mode-scatter');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
