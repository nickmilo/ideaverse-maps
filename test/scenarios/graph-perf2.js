module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  console.log(await page.evaluate(async () => { const g = await app.plugins.plugins['ideaverse-maps'].getGraph(); return 'nodes ' + g.nodes.length + ' edges ' + g.edges.length; }));
  // frame rate on Gravity for reference
  const fps = () => page.evaluate(() => new Promise(r => { let c = 0; const t = performance.now(); const f = () => { c++; if (performance.now() - t < 2000) requestAnimationFrame(f); else r(c / 2); }; requestAnimationFrame(f); }));
  console.log('idle fps', await fps());
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); });
  for (let q = 0; q < 4; q++) console.log('graph fps', await fps(), await page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph())));
};
