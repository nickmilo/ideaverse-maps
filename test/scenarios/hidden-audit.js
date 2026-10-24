// Elements marked hidden that still show (CSS display overriding the hidden attribute), across maps
module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d && d.hidden) document.querySelector('.ivm #anitab').click(); });
  const found = new Map();
  const scan = async tag => { const r = await page.evaluate(() => [...document.querySelectorAll('.ivm [hidden]')].filter(e => { const b = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && b.width > 0 && b.height > 0; }).map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + ' «' + (e.textContent || '').trim().slice(0, 30) + '»'));
    for (const x of r) { if (!found.has(x)) found.set(x, []); found.get(x).push(tag); } };
  const ids = ['', 'gochord', 'gocso', 'gocsi', 'gotreemap', 'goshelf', 'gogeosquare', 'gogeoocta', 'gogeoshells', 'golincal', 'gospiral', 'golifeline', 'goplflat', 'goplglobe', 'gotree', 'goskyline'];
  for (const v of ['emergence', 'gravity', 'stars', 'sense']) { await page.evaluate(v => { const b = [...document.querySelectorAll('.ivm #vseg button, .ivm [data-v]')].find(b => b.dataset.v === v); b && b.click(); }, v); await sleep(1800);
    for (const m of ['random', 'thread', 'map']) { await page.evaluate(m => document.querySelector(`.ivm #playseg button[data-p=${m}]`).click(), m); await sleep(200); await scan(v + '/' + m); } }
  for (const id of ids.slice(1)) { await page.evaluate(id => { const b = document.querySelector('.ivm #' + id); b && b.click(); }, id); await sleep(1800); await scan(id); }
  for (const [k, v] of found) console.log('SHOWN BUT HIDDEN:', k, '→', v.length > 6 ? v.slice(0, 6).join(',') + ` …(${v.length})` : v.join(','));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
