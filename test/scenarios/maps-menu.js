module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1200); };
  const info = () => page.evaluate(() => { const mo = document.querySelector('.ivm #mapopts'), mp = document.querySelector('.ivm #vmorepop');
    return { btn: document.querySelector('.ivm #vmore').textContent, menu: !mp.hidden, on: (mp.querySelector('.chip.on') || {}).textContent, mo: !mo.hidden, inline: mo.classList.contains('moin'),
      icons: [...mp.querySelectorAll('.chip .mic')].filter(s => !s.querySelector('svg')).map(s => s.parentElement.textContent), n: mp.querySelectorAll('.chip .mic svg').length }; });
  await shot('mm-bar');
  await page.locator('.ivm #vmore').click(); await sleep(600); await shot('mm-emergence'); console.log('emergence', JSON.stringify(await info()));
  await page.keyboard.press('Escape'); await sleep(300);
  await page.screenshot({ path: process.env.SHOTS + '/mm-btn.png', clip: { x: 340, y: 80, width: 340, height: 45 } }); await page.keyboard.press('3'); await sleep(1500); console.log('key3', await page.evaluate(() => document.querySelector('.ivm #vmore').textContent));
  await page.locator('.ivm #vmore').click(); await sleep(600); await shot('mm-stars'); console.log('stars', JSON.stringify(await info()));
  await page.locator('.ivm #vmorepop #goshelf').click(); await sleep(1500);
  await page.locator('.ivm #vmore').click(); await sleep(600); await shot('mm-shelf'); console.log('shelf', JSON.stringify(await info()));
  await page.keyboard.press('Escape'); await sleep(300);
  await page.keyboard.press('1'); await sleep(1500);
  await split(560); await shot('mm-narrowbar'); await page.locator('.ivm #vmore').click({ force: true }); await sleep(600); await shot('mm-narrow'); console.log('narrow', JSON.stringify(await info()));
  await page.keyboard.press('Escape'); await split(420); await page.locator('.ivm #vmore').click({ force: true }); await sleep(600); await shot('mm-inline'); console.log('inline', JSON.stringify(await info()));
  console.log('errors:', errs.join(' | ') || 'none');
};
