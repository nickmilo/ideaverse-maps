module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  const st = () => page.evaluate(() => { const r = document.querySelector('#yrreset'); return { hidden: r.hidden, yrs: document.querySelector('#yrv0').textContent, rec: document.querySelector('.mtwin .mtv').textContent }; });
  await page.evaluate(() => document.querySelector('.ivm [aria-label*="Filter"], .ivm #filt, .ivm #fbtn') && 0);
  console.log('start', JSON.stringify(await st()));
  await page.locator('.ivm #filtbtn').click(); await sleep(400);
  const r = await page.evaluate(() => { const s = document.querySelector('.mtwin input'); s.value = '3'; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); return 1; }); await sleep(800);
  console.log('narrowed', JSON.stringify(await st())); 
  const box = await page.evaluate(() => { const r = document.querySelector('#ycol').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  await page.screenshot({ path: process.env.SHOTS + '/yr-on.png', clip: { x: box[0] - 10, y: box[1] - 10, width: box[2] + 20, height: Math.min(box[3] + 20, 260) } });
  await page.evaluate(() => document.querySelector('#yrreset').click()); await sleep(800);
  console.log('reset', JSON.stringify(await st()));
  console.log('errors:', errs.join(' | ') || 'none');
};
