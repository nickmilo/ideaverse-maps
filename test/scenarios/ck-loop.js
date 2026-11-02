module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(560, 300); await shot('l0');
  await page.keyboard.down('q'); await sleep(1800); await page.keyboard.up('q'); await sleep(200); await shot('l1');
  await page.keyboard.down('q'); await sleep(1800); await page.keyboard.up('q'); await sleep(200); await shot('l2');
  await page.keyboard.down('a'); await sleep(800); await page.keyboard.up('a'); await sleep(200); await shot('l3');
  await page.keyboard.press(' '); await sleep(2500); await shot('l4');
  console.log('errors:', errs.join(' | ') || 'none');
};
