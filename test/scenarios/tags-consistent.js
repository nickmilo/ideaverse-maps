module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  const where = () => page.evaluate(() => { const vis = el => el && !el.hidden && el.offsetParent !== null; const g = document.querySelector('.ivm #grppop'); const m = document.querySelector('.ivm #mapopts');
    const secs = g ? [...g.querySelectorAll('.gsec')].filter(w => !w.hidden).map(w => w.querySelector('.pt').textContent) : [];
    return 'group:[' + secs.join(', ') + '] groupval:' + (document.querySelector('.ivm #grpbtn b') || {}).textContent + ' | menu: nest=' + !!(m && m.querySelector('#tmtags .tagnest') && !document.querySelector('.ivm #tmtags').hidden); });
  for (const [go, by] of [['#gotreemap', '#tmby button[data-tb="tags"]'], ['#goshelf', '#shelfsort button[data-ss="tag"]'], ['#gochord', '#chordby button[data-cb="tags"]']]) {
    await page.evaluate(g => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm ' + g).click(); }, go); await sleep(2000);
    await page.evaluate(b => document.querySelector('.ivm ' + b).click(), by); await sleep(1500);
    console.log(go, await where());
  }
  // treemap nested on
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gotreemap').click(); }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  await page.evaluate(() => { const c = document.querySelector('.ivm #tmtags .tagnest input'); if (!c.checked) c.click(); }); await sleep(2500);
  console.log('treemap nested:', await where()); await page.mouse.move(1599, 300); await shot('tm-nest');
  await page.evaluate(() => { document.querySelector('.ivm #grpbtn').click(); }); await sleep(400); await shot('tm-group');
  console.log('errors:', errs.join(' | ') || 'none');
};
