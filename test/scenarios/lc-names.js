module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(6000);
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500); await shot('nm-menu');
  for (const [j, lbl] of [[0, 'natural'], [1, 'more'], [2, 'many']]) {
    await page.evaluate(j => { if (!document.querySelector('.ivm .lcnames')) return; [...document.querySelectorAll('.ivm .lcnames button')][j].click(); }, j); await sleep(400);
    await page.keyboard.press('Escape'); await page.mouse.move(800, 990); await sleep(1200);
    console.log(lbl, await page.evaluate(() => (app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, document.querySelectorAll('.ivm .lcnames').length))); await shot('nm-' + lbl);
    await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(400); }
  console.log('errors:', errs.join(' | ') || 'none');
};
