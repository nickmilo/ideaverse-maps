module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1200); };
  await shot('tb-wide');
  await page.locator('.ivm #filtbtn').first().click(); await sleep(600); await shot('tb-filter'); await page.keyboard.press('Escape'); await page.mouse.click(700, 600); await sleep(300);
  for (const w of [900, 700, 520]) { await split(w); await shot('tb-' + w); }
  console.log('errors:', errs.join(' | ') || 'none');
};
