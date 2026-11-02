module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.evaluate(() => document.querySelector('.ivm #gocompass').click()); await sleep(2500);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (const lv of ['Natural', 'Max']) { await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editopts .seg button', { hasText: lv }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(400);
    await page.mouse.move(5, 950); await sleep(1500); console.log(lv, await page.evaluate(() => [...document.querySelectorAll('.ivm-pv .pvt')].map(e => e.textContent).join(' | '))); await shot('cmppv-' + lv.toLowerCase()); }
  console.log('errors:', errs.join(' | ') || 'none');
};
