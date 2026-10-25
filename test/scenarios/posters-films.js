module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Films.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000); await page.mouse.move(1599, 300); await shot('posters-films');
  console.log(JSON.stringify(await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const r = v.hostEl.querySelector('.ivm'); return { view: r.dataset.view, cur: v.map._posters().cur }; })));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
