module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(600);
  await page.evaluate(() => { const l = document.querySelector('.ivm #colllist'), r = l.firstElementChild; for (let i = 0; i < 40; i++) l.appendChild(r.cloneNode(true)); }); await sleep(200);
  console.log(await page.evaluate(() => { const p = document.querySelector('.ivm #filtpop').getBoundingClientRect(), l = document.querySelector('.ivm #colllist').getBoundingClientRect(), f = document.querySelector('.ivm .fcols').getBoundingClientRect(); return JSON.stringify({ pop: [p.top|0, p.bottom|0], fcols: [f.top|0, f.bottom|0], list: [l.top|0, l.bottom|0], win: innerHeight, items: document.querySelectorAll('.ivm #colllist input').length }); }));
  await shot('fcrop');
  console.log('errors:', errs.join(' | ') || 'none');
};
