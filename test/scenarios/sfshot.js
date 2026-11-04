module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => { app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse(); const f = app.vault.getAbstractFileByPath('Atlas/Things/Linking Your Thinking.md'); const l = app.workspace.getLeaf(false); await l.openFile(f, { state: { mode: 'preview' } }); });
  await sleep(1500);
  await page.evaluate(async () => { const l = app.workspace.getLeaf('split', 'vertical'); await l.setViewState({ type: 'graph', state: {} }); });
  await sleep(25000);
  await page.evaluate(() => { document.querySelectorAll('.graph-controls').forEach(c => c.style.display = 'none'); });
  await page.mouse.move(1210, 480); for (let q = 0; q < Number(process.env.WZ || 3); q++) { await page.mouse.wheel(0, 100); await sleep(400); } await sleep(4000);
  await shot('full');
  console.log('errors:', errs.join(' | ') || 'none');
};
