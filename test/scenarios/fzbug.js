module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  const cam = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._cam().k.toFixed(3));
  console.log('fit', await cam());
  for (const nm of ['Collecting does not solve the anxieties', 'Gall\'s Law', 'Triangulation', 'Idea Emergence']) {
    await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(2000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('z'); await sleep(2200); const a = await cam(); await page.keyboard.press('z'); await sleep(2200); const b = await cam(); console.log(nm, 'close', a, 'normal', b); }
  await page.keyboard.press('z'); await sleep(2000); await page.mouse.move(5, 900); await shot('fzb');
  console.log('errors:', errs.join(' | ') || 'none');
};
