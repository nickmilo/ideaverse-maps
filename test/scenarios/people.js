module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { window.__ivReveal('#gopeople'); document.querySelector('#gopeople').click(); }); await sleep(1500);
  await page.mouse.move(1599, 300); await shot('people-vault');
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/') && f.basename !== 'Films').map(f => f.path)); }); await sleep(2500);
  await page.mouse.move(1599, 300); await shot('people');
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(500); await shot('people-menu'); await page.mouse.click(1500, 950); await sleep(500);
  const b = await page.locator('.ivm canvas').first().boundingBox(); await page.mouse.move(b.x + b.width * .5, b.y + b.height * .5); for (let q = 0; q < 4; q++) { await page.mouse.wheel(0, -120); await sleep(200); } await sleep(2500);
  await page.mouse.move(1599, 300); await shot('people-zoom');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
