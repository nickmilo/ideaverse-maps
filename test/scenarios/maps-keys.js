module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const cur = () => page.evaluate(() => document.querySelector('.ivm #vmore').textContent);
  for (const k of ['5', '1', '9', '0', '2']) { await page.keyboard.press(k); await sleep(250); console.log(k, await cur()); await sleep(1000); }
  await page.locator('.ivm #vmore').click(); await sleep(500);
  console.log('hints', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop .mkey')].map(x => x.textContent).join(',')));
  console.log('errors:', errs.join(' | ') || 'none');
};
