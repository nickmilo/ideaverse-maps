module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const cnt = () => page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.graph = null; const g = await p.getGraph(); return g.edges.filter(e => [e[0], e[1]].some(i => g.nodes[i].path.includes('Dates2'))).length + ' / total ' + g.edges.length; });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(1500);
  console.log('off:', await cnt());
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.mdLinks = true; await p.saveSettings(); });
  console.log('on:', await cnt());
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
};
