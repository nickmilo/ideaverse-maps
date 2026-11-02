// 0.8.48: previews Fewer / Natural / Max with one governor
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await shot('pv-menu'); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (const lv of ['Natural', 'Max', 'Fewer']) { await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editopts .seg button', { hasText: lv }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(400);
    await page.mouse.move(5, 900); await sleep(1500); console.log(lv, await page.evaluate(() => document.querySelectorAll('.ivm-pv').length)); await shot('pv-' + lv.toLowerCase()); }
  console.log('errors:', errs.join(' | ') || 'none');
};
