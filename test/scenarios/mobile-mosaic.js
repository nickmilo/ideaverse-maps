module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(true)); await sleep(4000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); }); await sleep(500); await shot('mob-more');
  await page.evaluate(() => document.querySelector('.ivm #goposters').click()); await sleep(2000);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/') && f.basename !== 'Films').map(f => f.path)); }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(600); await shot('mob-menu');
  await page.evaluate(() => document.querySelector('.ivm #pmode [data-pm="mosaic"]').click()); await sleep(1500);
  await page.evaluate(() => { const s = document.querySelector('.ivm #planes'); s.value = 'genre'; s.dispatchEvent(new Event('change')); }); await sleep(1500);
  await shot('mob-menu2'); await page.evaluate(() => document.querySelector('.ivm canvas').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await page.evaluate(() => document.body.click()); await sleep(4000); await shot('mob-mosaic');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
