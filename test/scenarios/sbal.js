// Scoring → Balance levels by vault size
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('1'); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #scorebtn').click()); await sleep(800);
  const counts = () => page.evaluate(() => document.querySelector('.ivm #pcounts').textContent);
  console.log('off', await counts()); await shot('sbal-off');
  await page.locator('.ivm .sbal .mini').click(); await sleep(2500); console.log('on', await counts()); await shot('sbal-on');
  await page.locator('.ivm .sbal .mini').click(); await sleep(1500); console.log('off again', await counts());
  console.log('errors:', errs.join(' | ') || 'none');
};
