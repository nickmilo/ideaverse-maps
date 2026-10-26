// The scan cache lives in IndexedDB, not in the plugin folder; an old scan-cache.json moves over and is removed
module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; await app.vault.adapter.write(p.manifest.dir + '/scan-cache.json', JSON.stringify({ v: 1, files: {} })); });
  const t0 = Date.now(); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); console.log('first open ms', Date.now() - t0); await sleep(2000);
  console.log(await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; const f = await app.vault.adapter.exists(p.manifest.dir + '/scan-cache.json'); const s = await p.idbGet('scan-cache'); return 'file left: ' + f + ' | idb bytes: ' + (s ? s.length : 0); }));
  // a fresh scan from the cache
  const t1 = await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.graph = null; p.cacheData = null; const t = performance.now(); await p.getGraph(() => {}); return Math.round(performance.now() - t); });
  console.log('rescan from cache ms', t1);
  console.log('errors:', errs.join(' | ') || 'none');
};
