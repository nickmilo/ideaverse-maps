module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const run = async label => { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(800); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
    console.log(label, await page.evaluate(async () => { const g = await app.plugins.plugins['ideaverse-maps'].getGraph(); return g.nodes.filter(n => n.path.startsWith('Notes/Dates/')).map(n => n.title + '=' + n.date).sort().join(' | '); })); };
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.fileDates = false; delete p.settings.dateProps; await p.saveSettings(); });
  await run('default (created):');
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.dateProps = ['created', 'date created']; await p.saveSettings(); });
  await run('created, date created:');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
