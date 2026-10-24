module.exports = async ({ page, sleep }) => {
  const j = await page.evaluate(async () => { const g = await app.plugins.plugins['ideaverse-maps'].getGraph(); return JSON.stringify({ p: g.nodes.map(n => n.path), lv: g.nodes.map(n => n.level), e: g.edges.map(e => [e[0], e[1]]) }); });
  require('fs').writeFileSync(process.env.OUT, j); console.log('dumped', j.length);
};
