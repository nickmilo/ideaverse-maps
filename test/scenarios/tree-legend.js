module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="paper"]').click());
  await page.evaluate(() => { window.__ivReveal('#gotree'); document.querySelector('#gotree').click(); }); await sleep(2500);
  await page.evaluate(() => { const L = document.querySelector('.ivm #legend'); if (L.classList.contains('collapsed')) document.querySelector('.ivm #legtab').click(); }); await sleep(500);
  await sleep(800); await page.screenshot({ path: process.env.SHOTS + '/tree-legend.png', clip: { x: 0, y: 450, width: 520, height: 550 } });
  console.log('yrall', await page.evaluate(() => { window.__ivReveal('#yrctl'); return document.querySelector('.ivm #yrall').checked; }));
  console.log('errors:', errs.join(' | ') || 'none');
};
