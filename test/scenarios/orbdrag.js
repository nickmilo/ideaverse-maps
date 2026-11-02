// 0.8.34: drag orbs to reorder
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  const names = () => page.evaluate(() => [...document.querySelectorAll('.ivm .ivm-orb')].map(o => o.dataset.name + (o.classList.contains('cur') ? '*' : '')).join(', '));
  console.log('before', await names());
  const r = await page.evaluate(() => [...document.querySelectorAll('.ivm .ivm-orb')].map(o => { const b = o.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }));
  if (r.length >= 3) { await page.mouse.move(r[0][0], r[0][1]); await page.mouse.down(); await page.mouse.move(r[0][0] + 20, r[0][1], { steps: 4 }); await page.mouse.move(r[2][0] + 15, r[2][1], { steps: 6 }); await page.mouse.up(); await sleep(800); }
  console.log('after', await names(), 'left', await page.evaluate(() => (document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
