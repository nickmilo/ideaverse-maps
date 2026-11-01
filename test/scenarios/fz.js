// Focus zoom: Normal by default, Z or the square button for Close-Up; Star Chart over 3D
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  await page.locator('.ivm #q').fill('Affordances'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('n'); await sleep(3000); await page.mouse.move(5, 900); await shot('fz-normal');
  await page.keyboard.press('z'); await sleep(3000); await page.mouse.move(5, 900); await shot('fz-close');
  console.log('pressed', await page.evaluate(() => document.querySelector('.ivm #fzbtn').getAttribute('aria-pressed')));
  await page.locator('.ivm #fzbtn').click(); await sleep(2500); console.log('after click', await page.evaluate(() => document.querySelector('.ivm #fzbtn').getAttribute('aria-pressed')));
  await page.keyboard.press('n'); await sleep(2500); await page.keyboard.press('z'); await sleep(2500); await page.mouse.move(5, 900); await shot('fz-nofocus-close'); await page.keyboard.press('z'); await sleep(2500); await shot('fz-nofocus-normal');
  await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await shot('fz-menu');
  await page.locator('.ivm .sfseg button[data-m="3d"]').click(); await sleep(2000); await page.locator('.ivm .chartsw').click(); await sleep(1500); await page.keyboard.press('Escape'); await sleep(1500); await page.mouse.move(5, 900); await shot('fz-chart3d');
  console.log('errors:', errs.join(' | ') || 'none');
};
