module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => require('@electron/remote').getCurrentWindow().setSize(1700, 1000)); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click()); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300); await page.evaluate(() => document.querySelector('.ivm #disppop label.drow').click()); await sleep(500);
  await page.screenshot({ path: process.env.SHOTS + '/vgrid-disp.png', clip: { x: 0, y: 150, width: 1700, height: 260 } });
  await page.mouse.click(1200, 900); await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .vgrid .vg')].find(b => b.textContent === 'Mosaic').click()); await sleep(2000);
  await page.screenshot({ path: process.env.SHOTS + '/vgrid-on.png', clip: { x: 0, y: 150, width: 1700, height: 60 } });
  console.log('grid shown:', await page.evaluate(() => getComputedStyle(document.querySelector('.ivm .vgrid')).display), 'view', await page.evaluate(() => document.querySelector('.ivm').dataset.view));
  console.log('errors:', errs.join(' | ') || 'none');
};
