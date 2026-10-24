module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Movies.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000); await shot('posters-base');
  console.log(JSON.stringify(await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; let bi = v.baseInfo(); return { paths: v.paths && v.paths.length, sort: bi.sort, order: bi.order, groups: bi.groups && bi.groups.size, p: v.map._posters() }; })));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
