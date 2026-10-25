module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); }); await sleep(800);
  await page.evaluate(() => { window.__ivReveal('#gr3seg'); [...document.querySelectorAll('.ivm #gr3seg button')][1].click(); }); await page.mouse.click(1500, 950); await sleep(14000);
  await page.evaluate(() => { const f = app.vault.getMarkdownFiles().find(f => f.basename === 'Garden cosmos river tide'); app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(f.path); }); await sleep(2500);
  await page.evaluate(() => { const b = document.querySelector('.ivm aside #dcol'); b && b.click(); }); await sleep(800); await page.mouse.move(1599, 300); await shot('g3-sel2');
  console.log('orbit buttons:', await page.evaluate(() => [...document.querySelectorAll('.ivm #driftseg button')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent).join(',')));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
