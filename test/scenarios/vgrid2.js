module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const W = +process.env.VW || 1440;
  await page.evaluate(w => require('@electron/remote').getCurrentWindow().setSize(w, 1000), W); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(ng => { const c = document.querySelector('.ivm #disppop label.drow input'); if (c.checked === ng) c.click(); }, !!process.env.NOGRID); await sleep(500);
  for (const v of (process.env.VLIST || 'Bookshelf,Mosaic,Gravity,Tesla').split(',')) {
    await page.evaluate(v => [...document.querySelectorAll('.ivm .vgrid .vg')].find(b => b.textContent === v).click(), v); await sleep(2000);
    console.log(W, v, await page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); const ivm = q('.ivm'); return JSON.stringify({ cont: ivm.width | 0, grid: getComputedStyle(document.querySelector('.ivm .vgrid')).display, tblR: q('.ivm .tbl').right | 0, tbrL: q('.ivm .tbr').left | 0, tbrR: q('.ivm .tbr').right | 0, need: (() => { const k = [...document.querySelectorAll('.ivm .tbr > *')].filter(e => e.offsetParent); let w = 0; for (const e of k) w += e.scrollWidth; return w; })(), disp: getComputedStyle(document.querySelector('.ivm #dispbtn .tbl2')).display, filt: getComputedStyle(document.querySelector('.ivm #filtbtn .tbl2')).display, firstR: (() => { const k = [...document.querySelectorAll('.ivm .tbr > *')].filter(e => e.offsetParent); return k.length ? k[0].getBoundingClientRect().left | 0 : -1; })() }); }));
  }
  await page.screenshot({ path: process.env.SHOTS + '/vg2-' + W + '.png', clip: { x: 0, y: 140, width: W, height: 80 } });
  console.log('errors:', errs.join(' | ') || 'none');
};
