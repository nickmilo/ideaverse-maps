module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => { const lc = document.querySelector('.ivm #legclose'); if (lc) lc.click(); const d = document.querySelector('.ivm #animdock'); const b = d && d.querySelector('button[aria-label="Tuck animations away"]'); if (b) b.click(); }); await sleep(300);
  await page.locator('.ivm #filtbtn').click(); await sleep(600);
  if (await page.evaluate(() => document.querySelector('.ivm #yrall').checked)) { await page.locator('.ivm #yrall').click({ force: true }); await sleep(500); }
  if (!(await page.evaluate(() => document.querySelector('.ivm #bymt').checked))) { await page.locator('.ivm #bymt').click({ force: true }); await sleep(800); }
  for (const w of ['Week', 'Day']) { await page.locator('.ivm .mtwin button', { hasText: w }).click(); await sleep(1300); await page.keyboard.press('Escape'); await sleep(900);
    console.log(w, await page.evaluate(() => document.querySelector('.ivm #stats, .ivm .ncount')?.textContent || [...document.querySelectorAll('.ivm *')].find(e => /notes/.test(e.textContent) && e.children.length === 0)?.textContent)); await shot('cap-' + w); await page.locator('.ivm #filtbtn').click(); await sleep(500); }
  console.log('errors:', errs.join(' | ') || 'none');
};
