// Filter by base: our reading of each test base's filter vs Obsidian's own result for the same base
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(2500);
  await shot('bq-filter');
  const bases = await page.evaluate(() => app.vault.getFiles().filter(f => f.extension === 'base' && f.path.startsWith('Bases/')).map(f => f.path).sort());
  for (const b of bases) {
    const theirs = await page.evaluate(async b => { const p = app.plugins.plugins['ideaverse-maps']; p.basesViews.clear && 0; const leaf = app.workspace.getLeaf('tab'); await leaf.openFile(app.vault.getAbstractFileByPath(b));
      for (let t = 0; t < 100; t++) { await new Promise(r => setTimeout(r, 200)); const v = [...p.basesViews].find(v => v.hostEl && v.hostEl.isConnected && v.paths && v.map); if (v) { const out = v.paths.filter(x => x.endsWith('.md')); leaf.detach(); return out; } } leaf.detach(); return null; }, b);
    const ours = await page.evaluate(async b => { const q = app.plugins.plugins['ideaverse-maps'].baseQ; q.back = null; const r = await q.readBase(b); const v = r.views[0]; if (v.err) return { err: v.err }; try { return [...q.run(v, null)]; } catch (e) { return { err: String(e.what || e.message) }; } }, b);
    if (!theirs) { console.log(b, 'obsidian gave nothing'); continue; }
    if (ours.err) { console.log(b, 'OURS ERR', ours.err, '| obsidian', theirs.length); continue; }
    const T = new Set(theirs), O = new Set(ours), miss = theirs.filter(x => !O.has(x)), extra = ours.filter(x => !T.has(x));
    console.log((miss.length || extra.length ? 'DIFF ' : 'same ') + b, '| obsidian', theirs.length, '| ours', ours.length, miss.length ? '| missing e.g. ' + miss.slice(0, 2).join(', ') : '', extra.length ? '| extra e.g. ' + extra.slice(0, 2).join(', ') : '');
  }
  console.log('errors:', errs.join(' | ') || 'none');
};
