module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000);
  const p = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, a = m._at('Home.md'), r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left + a[0], r.top + a[1]]; });
  await page.mouse.move(p[0], p[1]); await page.keyboard.down('Meta'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Meta'); await sleep(1500);
  console.log(await page.evaluate(() => { const ws = app.workspace; return ws.getLeavesOfType('markdown').map(l => (l.view.file && l.view.file.path) + ' left=' + (l.getRoot() === ws.leftSplit)).join(' | ') + ' | map shown=' + (document.querySelector('.ivm canvas').offsetParent !== null); }));
  await shot('cmd-click2');
  console.log('errors:', errs.join(' | ') || 'none');
};
