module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2000);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const crop = async nm => { const r = await page.evaluate(() => document.querySelector('.ivm-card-left .cardhd').getBoundingClientRect().toJSON()); await page.screenshot({ path: process.env.SHOTS + '/' + nm + '.png', clip: { x: r.x, y: r.y, width: r.width, height: r.height + 30 } }); };
  await crop('pin-off'); await page.locator('.ivm-card-left .cardpin').click(); await sleep(600); await page.mouse.move(800, 600); await crop('pin-on');
};
