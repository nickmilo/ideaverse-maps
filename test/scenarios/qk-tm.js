module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const cur = () => page.evaluate(() => document.querySelector('.ivm #vmore').textContent);
  for (const k of ['0', '-', '=', '[', ']', 'Backslash', '9']) { await page.keyboard.press(k); await sleep(1300); console.log(k, await cur()); }
  await page.keyboard.press('0'); await sleep(1500);
  console.log('group hidden', await page.evaluate(() => document.querySelector('.ivm #grpms').hidden), 'gear', await page.evaluate(() => !document.querySelector('.mapsetms').hidden));
  await page.locator('.ivm #mapsetbtn').click(); await sleep(600); await shot('tm-set');
  await page.locator('.ivm #mapopts #tmsubs').click(); await sleep(1000); console.log('subs', await page.evaluate(() => document.querySelector('.ivm #tmsubs').getAttribute('aria-pressed')));
  await page.keyboard.press('Escape'); await page.locator('.ivm #vmore').click(); await sleep(500); await shot('qk-menu');
  for (const [k, nm] of [['=', 'shelf'], ['7', 'chord'], ['8', 'corona']]) { await page.keyboard.press('Escape'); await page.keyboard.press(k); await sleep(1500); console.log(nm, 'group shown', await page.evaluate(() => !document.querySelector('.ivm #grpms').hidden));
    await page.locator('.ivm #mapsetbtn').click(); await sleep(600); await shot('set-' + nm); }
  console.log('errors:', errs.join(' | ') || 'none');
};
