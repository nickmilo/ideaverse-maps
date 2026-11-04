// Linear Calendar shapes (0.8.172): Life in weeks, Years stacked
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  await page.locator('.ivm #vmore').first().click(); await sleep(300);
  await page.evaluate(() => { document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm #golincal').click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lchalf button')][2].click()); await sleep(2000);
  await page.mouse.move(1500, 800); await shot('sh-weeks-menu');
  await page.evaluate(() => { const i = document.querySelector('.ivm .lcborn input'); i.value = ''; i.dispatchEvent(new Event('change')); }); await sleep(2000);
  await page.keyboard.press('Escape'); await sleep(1500); await page.mouse.move(800, 990); await shot('sh-weeks-born');
  await page.evaluate(() => document.querySelector('.ivm .vcur').click()); await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.ivm .lchalf button')][3].click()); await sleep(2500);
  await page.keyboard.press('Escape'); await sleep(1500); await page.mouse.move(800, 990); await shot('sh-stack');
  await page.mouse.move(700, 500); for (let q = 0; q < 3; q++) { await page.mouse.wheel(0, -200); await sleep(150); } await sleep(1200); await shot('sh-stack-zoom');
  console.log('errors:', errs.join(' | ') || 'none');
};
