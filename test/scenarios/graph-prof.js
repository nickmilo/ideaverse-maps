module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); }); await sleep(3000);
  const cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  await sleep(6000); const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = profile.timeDeltas; 
  profile.samples.forEach((id, k) => { const n = byId.get(id); const key = n.callFrame.functionName + ':' + n.callFrame.lineNumber; self.set(key, (self.get(key) || 0) + (dt[k] || 0)); });
  console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ' ' + (v / 1000).toFixed(0) + 'ms').join('\n'));
};
