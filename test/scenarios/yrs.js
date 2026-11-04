module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(500);
  await page.evaluate(() => { const c = [...document.querySelectorAll('.ivm #filtpop *')].find(x => x.children.length <= 2 && /^\s*•?\s*Years\s*[▸▾▼►]?\s*$/i.test(x.textContent) && x.offsetParent); c && !document.querySelector('.ivm .mtslide').offsetParent && c.click(); }); await sleep(500);
  await shot('yrs-w8');
  console.log('slider', await page.evaluate(() => { const r = document.querySelector('.ivm .mtslide input'); return r.value + '/' + r.max + ' ' + document.querySelector('.ivm .mtslide .mtv').textContent; }));
  await page.evaluate(() => { const [a] = document.querySelector('.ivm .prng.yrdim, .ivm #filtpop .prng').querySelectorAll('.dual input'); a.value = String(+a.value - 1); a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); }); await sleep(800);
  console.log('after years touch', await page.evaluate(() => document.querySelector('.ivm .mtslide .mtv').textContent + ' dim=' + document.querySelector('.ivm .prng').classList.contains('yrdim')));
  await shot('yrs-all');
  console.log('errors:', errs.join(' | ') || 'none');
};
