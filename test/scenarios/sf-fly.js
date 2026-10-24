module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); });
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v=stars]').click()); await sleep(3500);
  await page.mouse.click(668, 864); await sleep(2500); await shot('sf-fly');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
