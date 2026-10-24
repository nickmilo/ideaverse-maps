module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#goposters'); document.querySelector('#goposters').click(); }); await sleep(1500);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps').map(l => l.view).find(v => v.map); v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Things/Movie')).map(f => f.path)); }); await sleep(1500);
  const P = () => page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps').map(l => l.view).find(v => v.map).map; return m._posters().cur; });
  await page.evaluate(() => window.__ivReveal('#pacross')); await sleep(400); await shot('rng-menu');
  console.log(JSON.stringify(await P()), await page.evaluate(() => [...document.querySelectorAll('#postctl .prng, #postctl .plchips')].map(e => e.id + (e.hidden ? ':hidden' : ':' + e.querySelectorAll('i,button').length)).join(' ')));
  // drag the across slider's low end up to 1990
  await page.evaluate(() => { const a = document.querySelector('#rng-across input'); a.value = 1990; a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); }); await sleep(1500);
  // switch off a lane
  await page.evaluate(() => document.querySelector('#rng-lanes .pchip').click()); await sleep(1500);
  await page.evaluate(() => window.__ivReveal('#pacross')); await sleep(400);
  await shot('rng-after');
  console.log('labels', await page.evaluate(() => [...document.querySelectorAll('#postctl .srange span')].map(e => e.textContent).join(',')));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
