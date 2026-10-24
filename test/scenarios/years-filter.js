module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(400);
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('.ivm #yrctl input'); a.value = 2022; a.dispatchEvent(new Event('change')); }); await sleep(1500);
  await page.evaluate(() => { if (document.querySelector('.ivm #filtpop').hidden) document.querySelector('.ivm #filtbtn').click(); }); await sleep(400);
  await page.locator('.ivm #filtpop').screenshot({ path: process.env.SHOTS + '/filter-years.png' });
  console.log('badge', await page.evaluate(() => document.querySelector('.ivm #filtbtn .tbadge').textContent), 'stats', await page.evaluate(() => document.querySelector('.ivm #stats').textContent));
  await page.mouse.click(1500, 950); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="emergence"]').click()); await sleep(400);
  console.log('emergence menu has years:', await page.evaluate(() => !!document.querySelector('.ivm #mapopts #yrctl')));
  console.log('errors:', errs.join(' | ') || 'none');
};
