module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(6000);
  await page.evaluate(() => { const h = document.querySelector('.ivm-bases'); h.dataset.ivmv = '0.0.1'; h.querySelector('.thslot').remove(); });   // pretend an older version drew it
  await page.evaluate(async () => { await app.plugins.disablePlugin('ideaverse-maps'); await app.plugins.enablePlugin('ideaverse-maps'); }); await sleep(7000);
  console.log('base redrawn:', await page.evaluate(() => { const h = document.querySelector('.ivm-bases'); return h && h.dataset.ivmv; }), '| themes in bar:', await page.evaluate(() => !!document.querySelector('.ivm-bases .thslot #themeseg')));
  await shot('base-redrawn');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
