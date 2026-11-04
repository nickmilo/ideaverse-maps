// a map inside a note (0.8.171): ```moti code block and ![[x.moti]]
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (/Maps of the Ideaverse/.test(m.text())) console.log('console:', m.text()); });
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  console.log('registry:', await page.evaluate(() => !!(app.embedRegistry && app.embedRegistry.registerExtension)));
  for (const mode of ['preview']) {
    await page.evaluate(async (mode) => { const f = app.vault.getAbstractFileByPath('+/MOTI embed test.md'); const leaf = app.workspace.getLeaf(false); await leaf.openFile(f, { state: { mode } }); }, mode);
    await sleep(20000); await shot('embed-' + mode);
    const n = await page.evaluate(() => [...document.querySelectorAll('.workspace-leaf.mod-active .ivm-embed')].map(e => [e.getBoundingClientRect().height, !!e.querySelector('canvas'), !!e.querySelector('.ivm-embed-veil')]));
    console.log(mode, JSON.stringify(n));
  }
  await page.evaluate(() => { const v = document.querySelector('.workspace-leaf.mod-active .ivm-embed-veil'); v && v.click(); }); await sleep(800);
  await page.evaluate(() => { const c = document.querySelector('.workspace-leaf.mod-active .ivm-embed'); c && c.scrollIntoView(); }); await sleep(1500); await shot('embed-clicked');
  await page.evaluate(() => { const c = [...document.querySelectorAll('.workspace-leaf.mod-active .ivm-embed')].pop(); c && c.scrollIntoView(); }); await sleep(8000); await shot('embed-file');
  console.log('errors:', errs.join(' | ') || 'none');
};
