module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="paper"]').click());
  await page.evaluate(() => { window.__ivReveal('#gotree'); document.querySelector('#gotree').click(); }); await sleep(2500); await page.mouse.move(1599, 300); await shot('tree-plain');
  // a far leaf: the visible note highest up the canopy
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const fs = app.vault.getMarkdownFiles(); const f = fs.find(f => f.path.startsWith('Notes/')) || fs[5]; v.map.openNote(f.path); }); await sleep(2500);
  await page.evaluate(() => { const b = document.querySelector('.ivm aside #dcol'); b && b.click(); }); await sleep(800); await page.evaluate(() => document.querySelector('.ivm #zfit').click()); await sleep(1500);
  await page.mouse.move(1599, 300); await shot('tree-sel');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
