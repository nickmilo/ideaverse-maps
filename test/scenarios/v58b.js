module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('\\'); await sleep(2500);
  const pressed = () => page.evaluate(() => { const b = [...document.querySelectorAll('.ivm #pmode button')].find(x => x.getAttribute('aria-pressed') === 'true' || x.classList.contains('on')); return b ? b.dataset.pm : '?'; });
  await page.locator('.ivm #mapsetbtn').click(); await sleep(500);
  await page.locator('.ivm #pmode button[data-pm="mosaic"]').click(); await sleep(1500); console.log('now', await pressed());
  await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ivm #viewbtn').click(); await sleep(300); await page.locator('.ivm #vname').fill('Movies mosaic'); await page.locator('.ivm #vsave').click(); await sleep(800); await page.keyboard.press('Enter'); await sleep(800); console.log('list', await page.evaluate(() => [...document.querySelectorAll('.ivm #vlist .vgo b')].map(b => b.textContent).join('|'))); await shot('saved'); await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(500); await page.locator('.ivm #pmode button[data-pm="rows"]').click(); await sleep(1500); console.log('switched', await pressed()); await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ivm #viewbtn').click(); await sleep(300); await page.locator('.ivm #vlist .vgo', { hasText: 'Movies mosaic' }).click(); await sleep(2500);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(500); console.log('restored', await pressed()); await shot('v58b'); 
  await page.mouse.move(400, 300); await page.mouse.move(420, 320); await sleep(800);
  console.log('tooltips', await page.evaluate(() => document.querySelectorAll('.tooltip').length), 'menu labels', await page.evaluate(() => document.querySelectorAll('.ivm #mapopts[aria-label]').length));
  console.log('errors:', errs.join(' | ') || 'none');
};
