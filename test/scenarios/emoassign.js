module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(400); await shot('ea-disp');
  await page.locator('.ivm .emolink').click(); await sleep(400); await shot('ea-page');
  await page.locator('.ivm .emorow .emob').nth(1).click(); await sleep(400); await shot('ea-pick');
  await page.locator('.ivm .emog').nth(10).click(); await sleep(400);
  await page.locator('.ivm .emorow .fsub').first().click(); await sleep(400); await shot('ea-tree');
  await page.locator('.ivm .emoimp').click(); await sleep(2500); console.log('import:', await page.locator('.ivm .emost').textContent()); await shot('ea-import');
  console.log('file emojis:', await page.evaluate(() => JSON.stringify(Object.keys(document.querySelectorAll('.ivm .emob.on')).length)));
  await page.locator('.ivm .emoback').click(); await sleep(300); await shot('ea-back');
  await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await page.locator('.ivm .ememo').click(); await sleep(2000); await page.keyboard.press('Escape'); await sleep(800); await shot('ea-emer');
  await page.keyboard.press('0'); await sleep(1800); await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await page.locator('.ivm .lcemo:not(.ememo)').click(); await sleep(2000); await page.keyboard.press('Escape');
  for (let z = 0; z < 3; z++) { await page.locator('.ivm #zin').click(); await sleep(400); } await sleep(800); await shot('ea-lc');
  console.log('errors:', errs.join(' | ') || 'none');
};
