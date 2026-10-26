module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1200); };
  const cur = () => page.evaluate(() => document.querySelector('.ivm #vmore').textContent);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(600); await shot('ms-set'); await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ivm #vmore').click(); await sleep(600); await shot('ms-menu'); await page.keyboard.press('Escape'); await sleep(300);
  for (const k of ['5', '9', '1']) { await page.keyboard.press(k); await sleep(1500); console.log(k, await cur()); }
  await page.keyboard.press('1'); await page.keyboard.press('2'); await sleep(1500); console.log('12', await cur());
  await page.keyboard.press('1'); await page.keyboard.press('4'); await sleep(1500); console.log('14', await cur(), await page.evaluate(() => !document.querySelector('.mapsetms').hidden));
  await page.keyboard.press('7'); await sleep(1500); console.log('7', await cur(), 'gear', await page.evaluate(() => !document.querySelector('.mapsetms').hidden));
  await page.keyboard.press('1'); await sleep(1500);
  await page.locator('.ivm #dispbtn, .ivm #dibtn').first().click().catch(() => {}); await sleep(400);
  await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm label')].find(x => /more maps in the header/.test(x.textContent)); l.click(); }); await sleep(800); await page.keyboard.press('Escape'); await sleep(400);
  for (const w of [1250, 1000, 800]) { await split(w); await shot('ms-grid-' + w); console.log(w, await page.evaluate(() => { const r = document.querySelector('.ivm'); return [r.dataset.vgrid, r.dataset.vgoff, getComputedStyle(document.querySelector('.ivm .vgrid')).display, document.querySelector('.ivm header').getBoundingClientRect().height].join(' '); })); }
  console.log('errors:', errs.join(' | ') || 'none');
};
