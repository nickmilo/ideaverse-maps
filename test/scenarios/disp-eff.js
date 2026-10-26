module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(400); await shot('disp');
  await page.evaluate(() => document.querySelector('.ivm #effbtn').click()); await sleep(600);
  console.log('panel open:', await page.evaluate(() => !document.querySelector('.ivm #effpanel').hidden), '| display closed:', await page.evaluate(() => document.querySelector('.ivm #disppop').hidden));
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(400); await shot('filt');
  console.log('errors:', errs.join(' | ') || 'none');
};
