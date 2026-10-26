module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1200); };
  await shot('tb-wide');
  await page.locator('.ivm #filtbtn').first().click(); await sleep(600); await shot('tb-filter'); await page.keyboard.press('Escape'); await page.mouse.click(700, 600); await sleep(300);
  for (const w of [1000, 900, 760, 700, 600, 520, 430]) { await split(w); await shot('tb-' + w); console.log(w, await page.evaluate(() => { const r = document.querySelector('.ivm'); return [r.dataset.findmini, r.dataset.tbwrap, [...document.querySelectorAll('.ivm #vseg > button[data-v]')].filter(b => !b.hidden).length, document.querySelector('.ivm header').getBoundingClientRect().height].join(' '); })); }
  await page.keyboard.press('/'); await sleep(400); await page.keyboard.type('Home'); await sleep(600); await shot('tb-find');
  console.log('find open:', await page.evaluate(() => [document.querySelector('.ivm').dataset.findopen, !document.querySelector('.ivm #results').hidden].join(' ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
