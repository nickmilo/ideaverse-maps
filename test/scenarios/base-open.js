// Open note from a base: the note shows beside the base, even with a note hidden in a tab behind it
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const md = app.vault.getMarkdownFiles()[0]; await app.workspace.getLeaf('tab').openFile(md); const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(7000);
  const target = await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; return v.paths[3]; });
  await page.evaluate(p => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; v.map.openNote(p); }, target); await sleep(800);
  await page.evaluate(() => document.querySelector('.ivm-bases #dopen').click()); await sleep(1500);
  console.log('target:', target);
  console.log(await page.evaluate(() => app.workspace.getLeavesOfType('markdown').map(l => (l.view.file && l.view.file.path) + ' shown=' + (l.view.containerEl.offsetParent !== null)).join(' | ')));
  console.log('base still shown:', await page.evaluate(() => !!document.querySelector('.ivm-bases') && document.querySelector('.ivm-bases').offsetParent !== null));
  await shot('base-open');
  console.log('errors:', errs.join(' | ') || 'none');
};
