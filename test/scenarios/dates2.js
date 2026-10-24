module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.fileDates = false; await p.saveSettings(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(1500);
  console.log(await page.evaluate(async () => { const g = await app.plugins.plugins['ideaverse-maps'].getGraph(); const ns = g.nodes.filter(n => n.path.startsWith('Notes/Dates2/')); const id = new Map(g.nodes.map((n, i) => [i, n.path]));
    return ns.map(n => n.title + '=' + n.date).join(' | ') + ' || edges: ' + g.edges.filter(e => { const a = g.nodes[e.s ?? e[0] ?? e.source], b = g.nodes[e.t ?? e[1] ?? e.target]; return (a && a.path.includes('Dates2')) || (b && b.path.includes('Dates2')); }).length + ' sample: ' + JSON.stringify(g.edges[0]); }));
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
};
