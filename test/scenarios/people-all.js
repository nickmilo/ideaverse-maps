module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(6000); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#gopeople'); document.querySelector('#gopeople').click(); }); await sleep(1500);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/') && f.basename !== 'Films').map(f => f.path)); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  console.log(await page.evaluate(() => document.querySelector('.ivm .pplv').textContent + ' | max ' + document.querySelector('#pplctl input').max));
  await page.evaluate(() => { const r = document.querySelector('#pplctl input'); r.value = r.max; r.dispatchEvent(new Event('input')); }); await sleep(1500);
  console.log(await page.evaluate(() => document.querySelector('.ivm .pplv').textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
