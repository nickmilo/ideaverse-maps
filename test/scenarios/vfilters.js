module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => { app.plugins.plugins['ideaverse-maps'].settings.viewsFolder = '/'; });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const st = () => page.evaluate(() => [document.querySelector('.ivm #yrv0').textContent, 'bymt=' + document.querySelector('.ivm #bymt').checked, 'mocs=' + (document.querySelector('.ivm .mcol .bqn') || {}).textContent, 'badge=' + document.querySelector('.ivm #filtbtn').textContent, document.querySelector('.ivm .ncount, .ivm #stats')?.textContent || [...document.querySelectorAll('.ivm *')].find(e => /notes/.test(e.textContent) && e.children.length === 0)?.textContent].join(' | '));
  const save = async nm => { await page.locator('.ivm #viewbtn').click(); await sleep(300); await page.locator('.ivm #vname').fill(nm); await page.keyboard.press('Enter'); await sleep(300); await page.keyboard.press('Escape'); };
  // A: years 2020–2024
  await page.locator('.ivm #filtbtn').click(); await sleep(400);
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('.ivm #ycol .dual input'); a.value = '2020'; a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); b.value = '2024'; b.dispatchEvent(new Event('input')); b.dispatchEvent(new Event('change')); }); await sleep(600);
  await page.keyboard.press('Escape'); await save('A years'); console.log('A', await st());
  // B: modified, last week, one MOC
  await page.locator('.ivm #filtbtn').click(); await sleep(400); await page.locator('.ivm #bymt').click({ force: true }); await sleep(500); await page.locator('.ivm .mtwin button', { hasText: 'Week' }).click(); await sleep(500);
  await page.locator('.ivm .mcol label.bqv input').first().click(); await sleep(600); await page.keyboard.press('Escape'); await save('B recent'); console.log('B', await st());
  for (const nm of ['A years', 'B recent', 'A years']) { await page.locator('.ivm #viewbtn').click(); await sleep(300); await page.locator('.ivm #vlist .vr', { hasText: nm }).locator('.vgo').click(); await sleep(1500); console.log('->', nm, await st()); }
  console.log('errors:', errs.join(' | ') || 'none');
};
