module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#goposters'); document.querySelector('#goposters').click(); }); await sleep(2500);
  await shot('posters-all');
  const opts = () => page.evaluate(() => ['#pacross','#planes','#psize'].map(s => { const e = document.querySelector(s); return s + ':' + (e ? [...e.options].map(o => o.value + (o.selected ? '*' : '')).join(',') : 'none'); }).join(' | ') + ' || ' + (document.querySelector('#pimg') || {}).textContent);
  console.log('all:', await opts());
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps').map(l => l.view).find(v => v.map); v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Things/Movie')).map(f => f.path)); }); await sleep(2500);
  await page.evaluate(() => window.__ivReveal('#pacross')); await sleep(300);
  console.log('movies:', await opts()); console.log(JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps').map(l => l.view).find(v => v.map).map._posters())));
  await shot('posters-movies');
  await page.evaluate(() => { document.body.click(); const s = document.querySelector('#planes'); s.value = 'genre'; s.dispatchEvent(new Event('change')); }); await sleep(2500);
  await shot('posters-genre');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
