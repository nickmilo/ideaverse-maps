module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Movies.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000);
  const st = () => page.evaluate(() => { const r = document.querySelector('.ivm-bases'); const q = s => r.querySelector(s); return JSON.stringify({ vcur: q('#vcur')?.hidden, vcurTxt: q('#vcur')?.textContent, mo: q('#mapopts')?.hidden, pc: q('#postctl')?.hidden, lay: q('#laygrp')?.hidden, kids: [...q('#laygrp').children].filter(e => !e.hidden).map(e => e.id || e.className) }); });
  console.log('before', await st());
  await page.evaluate(() => { const r = document.querySelector('.ivm-bases'); r.querySelector('#vcur').click(); }); await sleep(800);
  console.log('after', await st()); await shot('pmenu');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
