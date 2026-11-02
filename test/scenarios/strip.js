// 0.8.38: the strip under the editor's name; the note panel tucks away in Edit mode
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  console.log('strip', await page.evaluate(() => document.querySelector('.ivm-card-left .cardstrip').textContent), '| panel hidden', await page.evaluate(() => document.querySelector('.ivm #drawer').hidden));
  await page.mouse.move(5, 900); await shot('strip');
  await page.locator('.ivm-card-left .sscore').click(); await sleep(600); await shot('strip-score'); console.log('score drop', await page.evaluate(() => document.querySelector('.ivm-card-left .carddrop').textContent.slice(0, 200))); await page.locator('.ivm-card-left .sdem .sbe').click(); await sleep(600); await shot('strip-below');
  console.log('rows', await page.evaluate(() => document.querySelectorAll('.ivm-card-left .sdr').length));
  await page.locator('.ivm-card-left .sdr').nth(1).click(); await sleep(3500); console.log('after row click', await page.evaluate(() => document.querySelector('.ivm-card-left .cardt').textContent), await page.evaluate(() => document.querySelector('.ivm-card-left .cardstrip').textContent));
  await page.locator('.ivm-card-left .cardx').click(); await sleep(1500); console.log('closed editor; panel hidden', await page.evaluate(() => document.querySelector('.ivm #drawer').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
