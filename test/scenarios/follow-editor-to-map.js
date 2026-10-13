module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#follownote').click(); await sleep(300);
  // open a note in a split beside the map, then switch notes the way a user would
  await page.evaluate(async () => { const leaf = app.workspace.getLeaf('split', 'vertical'); await leaf.openFile(app.vault.getAbstractFileByPath('Atlas/Maps/' + app.vault.getMarkdownFiles().find(f => f.path.startsWith('Atlas/Maps/')).name)); });
  await sleep(1500);
  const sel = () => page.evaluate(() => { const h = document.querySelector('.ivm aside h2'); return h && !h.closest('aside').hidden ? h.textContent : null; });
  console.log('after open 1:', await page.evaluate(() => app.workspace.getActiveFile().basename), '| map shows:', await sel());
  await page.evaluate(async () => { const f = app.vault.getMarkdownFiles().find(f => f.path.startsWith('Notes/')); await app.workspace.getLeavesOfType('markdown')[0].openFile(f); });
  await sleep(1500);
  console.log('after open 2:', await page.evaluate(() => app.workspace.getActiveFile().basename), '| map shows:', await sel());
  await shot('follow');
};
