// The scan cache: second open reads no notes and gives the same map
module.exports = async ({ page, sleep }) => {
  const t0 = Date.now(); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 180000 }); const first = Date.now() - t0; await sleep(1500);
  const sig = () => page.evaluate(() => { const g = app.plugins.plugins['ideaverse-maps'].graph; return g.nodes.length + ':' + g.nodes.reduce((a, n) => a + n.level*n.score, 0).toFixed(3) + ':' + g.edges.length; });
  const s1 = await sig();
  const has = await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; return await app.vault.adapter.exists(p.cachePath); });
  const t1 = Date.now(); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(300);
  await page.waitForSelector('.ivm canvas', { timeout: 180000 }); const second = Date.now() - t1; await sleep(1000);
  console.log('cache file:', has, '| first open ms', first, '| rescan ms', second, '| same map:', s1 === await sig(), s1);
};
