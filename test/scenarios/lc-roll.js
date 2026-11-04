module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(6000);
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lchalf button')].find(b => /30/.test(b.textContent)).click()); await sleep(600);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lc30 button')][2].click()); await sleep(2200);
  await page.keyboard.press('Escape'); await page.mouse.move(800, 500); await sleep(800); await shot('roll-0');
  await page.mouse.wheel(0, -100); await sleep(350); await shot('roll-mid'); await sleep(1500); await shot('roll-1');
  for (let q = 0; q < 3; q++) { await page.mouse.wheel(0, -100); await sleep(200); } await sleep(1800); await shot('roll-4');
  for (let q = 0; q < 6; q++) { await page.mouse.wheel(0, 100); await sleep(150); } await sleep(1800); await shot('roll-back');
  console.log('errors:', errs.join(' | ') || 'none');
};
