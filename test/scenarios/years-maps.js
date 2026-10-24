module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const cnt = () => page.evaluate(() => document.querySelector('.ivm #stats').textContent.trim());
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="gravity"]').click()); await sleep(1500);
  await page.locator('.ivm header').first().screenshot({ path: process.env.SHOTS + '/tabs.png' });
  await page.evaluate(() => window.__ivReveal('#yrctl')); await sleep(300);
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('.ivm #yrctl input'); a.value = 2022; a.dispatchEvent(new Event('change')); b.value = 2024; b.dispatchEvent(new Event('change')); }); await sleep(1500);
  console.log('gravity', await cnt());
  for (const v of ['sense']) { await page.evaluate(v => document.querySelector(`.ivm #vseg button[data-v="${v}"]`).click(), v); await sleep(1500); console.log(v, await cnt()); await page.evaluate(v => document.querySelector(`.ivm #vseg button[data-v="${v}"]`).click(), v); await sleep(500); await page.locator('.ivm #mapopts').screenshot({ path: process.env.SHOTS + '/sense-menu.png' }); await page.mouse.click(1500, 950); await sleep(300); }
  for (const id of ['#gograph', '#gotreemap', '#gochord', '#goposters']) { await page.evaluate(id => { window.__ivReveal(id); document.querySelector(id).click(); }, id); await sleep(2500); console.log(id, await cnt(), 'menu has years:', await page.evaluate(() => { window.__ivReveal && document.querySelector('.ivm #vcur').click(); return !document.querySelector('.ivm #yrctl').hidden; })); await page.mouse.click(1500, 950); await sleep(300); }
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
