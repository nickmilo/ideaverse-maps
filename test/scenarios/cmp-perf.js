module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('2023-03 - Trip to England'); await sleep(900); await page.keyboard.press('Enter'); await sleep(5000);
  console.log('previews', await page.evaluate(() => document.querySelectorAll('.ivm-pvl .ivm-pv').length));
  const run = async (lbl) => {
    await page.evaluate(() => { window.__fr = []; let last = performance.now(); const f = () => { const t = performance.now(); window.__fr.push(t - last); last = t; if (window.__fr.length < 400) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await page.mouse.move(1000, 500); await page.mouse.down(); for (let q = 0; q < 60; q++) { await page.mouse.move(1000 + 4 * Math.sin(q / 4) * 30, 500 + q % 7); await sleep(30); } await page.mouse.up(); await sleep(300);
    const r = await page.evaluate(() => { const a = window.__fr.slice(2).sort((x, y) => x - y); return [a.length, +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1), +a[Math.floor(a.length * .95)].toFixed(1)]; });
    console.log(lbl, 'frames/mean ms/p95 ms', JSON.stringify(r)); };
  await run('natural');
  await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; }); 
  const t0 = await page.evaluate(() => { const t = performance.now(); for (let q = 0; q < 20; q++) window.__ivTime && 0; return performance.now() - t; });
  console.log('render ms', await page.evaluate(() => { const d = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug || {}; return d.__ivTime ? [d.__ivTime('draw'), d.__ivTime('draw'), d.__ivTime('draw')] : 'n/a'; }));
};
