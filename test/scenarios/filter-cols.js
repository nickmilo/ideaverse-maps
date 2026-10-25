module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  for (const t of ['paper']) { await page.evaluate(t => document.querySelector(`.ivm #themeseg [data-th="${t}"]`).click(), t); }
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(500);
  // drill into a folder, uncheck one, check a collection: the panel stays open
  await page.evaluate(() => { const b = document.querySelector('.ivm #foldlist .fsub'); b && b.click(); }); await sleep(400);
  await page.evaluate(() => { const c = document.querySelectorAll('.ivm #foldlist input[type=checkbox]:not([data-sub])')[1]; c.click(); }); await sleep(800);
  await page.evaluate(() => { const c = document.querySelector('.ivm #colllist input'); c && c.click(); }); await sleep(800);
  console.log('open after clicks:', await page.evaluate(() => !document.querySelector('.ivm #filtpop').hidden), await page.evaluate(() => document.querySelector('.ivm #stats').textContent));
  await page.locator('.ivm #filtpop').screenshot({ path: process.env.SHOTS + '/filter-cols.png' });
  console.log('errors:', errs.join(' | ') || 'none');
};
