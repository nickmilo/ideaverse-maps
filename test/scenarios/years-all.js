module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.fileDates = false; await p.saveSettings(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(1500);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const cnt = () => page.evaluate(() => document.querySelector('.ivm #stats').textContent.trim());
  console.log('default (all years, no undated):', await cnt());
  await page.evaluate(() => window.__ivReveal('#yrctl')); await sleep(300);
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('.ivm #yrctl input'); a.value = 2022; a.dispatchEvent(new Event('change')); b.value = 2024; b.dispatchEvent(new Event('change')); }); await sleep(1500);
  console.log('2022-2024:', await cnt());
  await page.evaluate(() => document.querySelector('.ivm #yrall').click()); await sleep(2000); console.log('outside shown:', await cnt());
  await page.locator('.ivm #mapopts').screenshot({ path: process.env.SHOTS + '/yr-pop2.png' });
  await page.mouse.click(1500, 950); await sleep(1500); await page.mouse.move(1599, 300); await shot('yr-all-em');
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="gravity"]').click()); await sleep(2000); await page.mouse.move(1599, 300); await shot('yr-all-grav');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
