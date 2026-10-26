module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const st = () => page.evaluate(() => [document.querySelector('.ivm #vmore').textContent, !document.querySelector('.ivm #vmorepop').hidden, (document.querySelector('.ivm #vmorepop .chip.on') || {}).textContent].join(' | '));
  await page.locator('.ivm #vmore').click(); await sleep(500);
  for (const id of ['#gogravity', '#goshelf', '.vfoldb[data-v="stars"]', '#golincal']) { await page.locator('.ivm #vmorepop ' + id).click(); await sleep(1500); console.log(id, await st()); }
  await shot('stay'); await page.mouse.click(900, 600); await sleep(500); console.log('after click away', await st());
  await page.keyboard.press('5'); await sleep(1200); console.log('key 5', await st());
  console.log('errors:', errs.join(' | ') || 'none');
};
