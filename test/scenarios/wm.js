module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500); await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); }); await sleep(1500); await shot('wm-emergence');
  for (const v of ['gravity', 'sense']) { await page.evaluate(v => document.querySelector(`.ivm #vseg button[data-v=${v}]`).click(), v); await sleep(2200); await shot('wm-' + v); }
  await page.evaluate(() => document.querySelector('.ivm #themeseg button:first-child').click()); await sleep(600); await shot('wm-light');
  await page.evaluate(() => document.querySelector('.ivm #themeseg button[data-th=dark]').click());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
