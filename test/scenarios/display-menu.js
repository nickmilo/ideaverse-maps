module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  for (const t of ['paper', 'dark']) { await page.evaluate(t => document.querySelector(`.ivm #themeseg [data-th="${t}"]`).click(), t); await sleep(300);
    await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300);
    if (t === 'dark') { await page.evaluate(() => document.querySelector('.ivm #disppop label.drow').click()); await sleep(400); }
    await page.locator('.ivm #disppop').screenshot({ path: process.env.SHOTS + '/disp-' + t + '.png' }); await page.mouse.click(1500, 950); await sleep(300); }
  console.log('showAll on:', await page.evaluate(() => document.querySelector('.ivm #alllinks').getAttribute('aria-pressed')));
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300); await page.evaluate(() => document.querySelector('.ivm #scorebtn').click()); await sleep(500);
  console.log('scoring panel:', await page.evaluate(() => !document.querySelector('.ivm #scorepanel').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
