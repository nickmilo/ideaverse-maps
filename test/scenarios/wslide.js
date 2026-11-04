module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(500);
  const set = async v => { await page.evaluate(v => { const r = document.querySelector('.ivm .mtslide input'); r.value = String(v); r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }, v); await sleep(1600); };
  for (const [v, n] of [[9, 'quarter'], [13, 'ytd'], [2, '2w']]) { await set(v); console.log(n, await page.evaluate(() => document.querySelector('.ivm .mtslide .mtv').textContent)); if (n === 'quarter') await shot('ws-menu'); }
  await page.keyboard.press('Escape'); await page.mouse.move(800, 990); await sleep(800); await shot('ws-2w');
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(400); await set(9); await page.keyboard.press('Escape'); await page.mouse.move(800, 990); await sleep(800); await shot('ws-quarter');
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(400); await set(14); console.log('all', await page.evaluate(() => document.querySelector('.ivm .mtslide .mtv').textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
