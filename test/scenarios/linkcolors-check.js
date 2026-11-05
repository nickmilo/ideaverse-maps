module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  const dump = (sel) => page.evaluate(sel => { const root = document.querySelector(sel); const out = [];
    for (const e of root.querySelectorAll('a.internal-link, .cm-hmd-internal-link, .internal-link')) { if (e.closest('.metadata-container')) continue; const t = e.querySelector('.cm-underline') || e;
      const ctx = e.closest('table, .callout, .internal-embed, .markdown-embed') ? (e.closest('table') ? 'table' : e.closest('.callout') ? 'callout' : 'embed') : 'text';
      out.push(ctx + ':' + e.textContent.trim().slice(0, 22) + '=' + (e.dataset.ivk || '-') + '/' + getComputedStyle(t).color); } return out.join(' | '); }, sel);
  // Live Preview tab
  await page.evaluate(async () => { const l = app.workspace.getLeaf('split', 'vertical'); await l.openFile(app.vault.getAbstractFileByPath('Atlas/Things/Pace Layers.md'), { active: false }); await l.setViewState({ type: 'markdown', state: { file: 'Atlas/Things/Pace Layers.md', mode: 'source', source: false } }); }); await sleep(3000);
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('markdown').find(l => !l.ivmCard); const s = l.view.containerEl.querySelector('.cm-scroller'); if (s) s.scrollTop = 99999; }); await sleep(1500);
  console.log('LP', await dump('.workspace-leaf-content[data-type="markdown"]'));
  await page.evaluate(async () => { const l = app.workspace.getLeavesOfType('markdown').find(l => !l.ivmCard); await l.setViewState({ type: 'markdown', state: { file: 'Atlas/Things/Pace Layers.md', mode: 'preview' } }); const s = l.view.containerEl.querySelector('.markdown-preview-view'); if (s) s.scrollTop = 99999; }); await sleep(2500);
  console.log('RV', await dump('.workspace-leaf-content[data-type="markdown"]'));
  await shot('rv');
  console.log('errors:', errs.join(' | ') || 'none');
};
