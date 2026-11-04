module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(6000);
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lchalf button')].find(b => /30/.test(b.textContent)).click()); await sleep(2500); await shot('d30-menu');
  for (const [j, lbl] of [[2, 'weeks'], [0, 'line'], [1, 'half']]) {
    await page.evaluate(j => [...document.querySelectorAll('.ivm .lc30 button')][j].click(), j); await sleep(2200);
    await page.keyboard.press('Escape'); await page.mouse.move(800, 990); await sleep(1000); await shot('d30-' + lbl);
    await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(400); }
  console.log('errors:', errs.join(' | ') || 'none');
};
