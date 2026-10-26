module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const nv = () => page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; return document.querySelector('.ivm #filtbtn').textContent + ' | yrs ' + document.querySelector('.ivm #yrv0').textContent; });
  await page.locator('.ivm #filtbtn').click(); await sleep(800); await shot('fn-open');
  console.log('cols', await page.evaluate(() => [...document.querySelectorAll('.ivm .fhb')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')).join(' ')));
  console.log('mocs listed', await page.evaluate(() => document.querySelectorAll('.ivm .mcol label.bqv').length), 'props listed', await page.evaluate(() => [...document.querySelectorAll('.ivm .pcol details summary .t')].map(x => x.textContent).slice(0, 12).join(',')));
  await page.locator('.ivm .mcol label.bqv input').first().click(); await sleep(1200);
  console.log('moc1', await page.evaluate(() => document.querySelector('.ivm .mcol .bqn').textContent), await nv());
  await page.locator('.ivm .mcol .mdeg button', { hasText: '2 steps' }).click(); await sleep(1200);
  console.log('moc2', await page.evaluate(() => document.querySelector('.ivm .mcol .bqn').textContent)); await shot('fn-moc'); await page.locator('.ivm .mcol .mdeg button', { hasText: '1 step' }).click(); await sleep(400); await page.keyboard.press('Escape'); await sleep(1500); await shot('fn-mocmap'); await page.locator('.ivm #filtbtn').click(); await sleep(600);
  await page.locator('.ivm .mcol .facts .chip').click(); await sleep(800);
  const det = page.locator('.ivm .pcol details').first(); await det.locator('summary').click(); await sleep(300);
  await det.locator('label.bqv input').first().click(); await sleep(1200);
  console.log('prop', await page.evaluate(() => document.querySelector('.ivm .pcol .bqn').textContent + ' via ' + document.querySelector('.ivm .pcol details[open] summary .t').textContent + '=' + document.querySelector('.ivm .pcol details[open] label.bqv .t').textContent));
  await shot('fn-prop'); await page.locator('.ivm .pcol .facts .chip').click(); await sleep(800);
  console.log('before mt', await nv()); await page.locator('.ivm #bymt').click({ force: true }); await sleep(1500); console.log('after mt', await nv()); await shot('fn-mt');
  console.log('errors:', errs.join(' | ') || 'none');
};
