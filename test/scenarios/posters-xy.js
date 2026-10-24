module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#goposters'); document.querySelector('#goposters').click(); }); await sleep(1500);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps').map(l => l.view).find(v => v.map); v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Things/Movie')).map(f => f.path)); }); await sleep(1500);
  const set = (id, v) => page.evaluate(([id, v]) => { const s = document.querySelector(id); s.value = v; s.dispatchEvent(new Event('change')); }, [id, v]);
  await set('#pacross', 'rating'); await sleep(800); await set('#pheight', 'score'); await sleep(2000);
  await page.evaluate(() => window.__ivReveal('#pheight')); await sleep(300); await shot('xy-menu');
  console.log(JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps').map(l => l.view).find(v => v.map).map._posters().cur)));
  await page.evaluate(() => document.body.click()); await sleep(1500); await shot('xy');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
