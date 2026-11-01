module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (const [k, nm] of [['1','emergence'],['5','gravity'],['6','graph'],['4','sense'],['2','ideaverse'],['[','chord'],['0','lincal']]) {
    await page.keyboard.press(k); await sleep(3000); const vis = await page.evaluate(() => !document.querySelector('.ivm #fzbtn').hidden);
    if (!vis) { console.log(nm, 'no button'); continue; }
    await page.keyboard.press('z'); await sleep(2500); await page.mouse.move(5, 900); await shot('fz-' + nm); await page.keyboard.press('z'); await sleep(1500); console.log(nm, 'ok'); }
  console.log('errors:', errs.join(' | ') || 'none');
};
