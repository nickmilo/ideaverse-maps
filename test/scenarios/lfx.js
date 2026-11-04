module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(500); await shot('disp');
  for (const [j, fx] of [[1, 'spark'], [2, 'thread'], [3, 'bloom']]) {
    await page.evaluate(j => [...document.querySelectorAll('.ivm .lfxrow .seg button')][j].click(), j);
    for (const t of [500, 1000, 1700]) { await sleep(t === 500 ? 500 : t === 1000 ? 500 : 700); await page.screenshot({ path: process.env.SHOTS + `/${fx}-${t}.png` }); }
    await sleep(1200); }
  await page.keyboard.press('Escape');
  // starship: hop between notes with contrails on
  for (const q of ['Stewart Brand', 'The Long Now']) { await page.locator('.ivm #q').fill(q); await sleep(600); await page.keyboard.press('Enter'); await sleep(700); }
  await page.screenshot({ path: process.env.SHOTS + '/ship.png' });
  console.log('errors:', errs.join(' | ') || 'none');
};
