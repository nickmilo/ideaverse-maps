// A base switched to the Maps of the Ideaverse view: the map shows only the base's notes
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000); await shot('base-map');
  const r = await page.evaluate(() => { const el = document.querySelector('.ivm-bases .ivm'); const p = app.plugins.plugins['ideaverse-maps']; const v = [...(p.basesViews || [])][0];
    return { mounted: !!el, views: p.basesViews ? p.basesViews.size : -1, scope: v && v.paths ? v.paths.length : null, counts: document.querySelector('.ivm-bases #ncount, .ivm-bases .counts')?.textContent }; });
  console.log(JSON.stringify(r));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); const t = await app.vault.read(f); await app.vault.modify(f, t.replace('Atlas/Maps', 'Atlas/People')); });
  await sleep(3500); await shot('base-map-2');
  console.log('after filter change:', await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; return v.paths.length; }), '| counts:', await page.evaluate(() => document.querySelector('.ivm-bases header')?.innerText.match(/[\d,]+ notes/)?.[0]));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); const t = await app.vault.read(f); await app.vault.modify(f, t.replace('Atlas/People', 'Atlas/Maps')); });
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
