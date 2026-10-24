module.exports = async ({ page, sleep }) => {
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Films.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(7000);
  console.log(JSON.stringify(await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const p = v.map._posters(); return { paths: v.paths.length, sample: v.paths.slice(0, 3), p }; })));
};
