module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(500);
  const set = (a, b) => page.evaluate(([a, b]) => { const [x, y] = document.querySelectorAll('.ivm #yrctl input'); x.value = a; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); y.value = b; y.dispatchEvent(new Event('input', { bubbles: true })); y.dispatchEvent(new Event('change', { bubbles: true })); }, [a, b]);
  let i = 0;
  for (const [a, b] of [[2020, 2026], [2010, 2024], [2018, 2019], [2021, 2021]]) { await set(a, b); await sleep(700);
    await page.locator('.ivm .yrsec').screenshot({ path: process.env.SHOTS + '/yr' + (i++) + '.png' }); }
  console.log('errors:', errs.join(' | ') || 'none');
};
