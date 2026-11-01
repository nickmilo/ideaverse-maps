// level counts and two notes' numbers, for comparing scoring versions
module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(4000);
  console.log('RESULT', await page.evaluate(() => { const g = app.plugins.plugins['ideaverse-maps'].graph; const c = {}; for (const d of g.nodes) if (!d.archive) c[d.level] = (c[d.level] || 0) + 1;
    const pick = t => { const d = g.nodes.find(x => x.title === t); return d ? `${t}: in ${d.body_in} out ${d.body_out} up ${d.up_in} score ${d.score} L${d.level}` : t + ' ?'; };
    return JSON.stringify(c) + ' | ' + ['Affordances', 'Jinba Ittai', 'Triangulation', 'Pace Layers'].map(pick).join(' | '); }));
};
