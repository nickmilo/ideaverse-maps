module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); }); await sleep(800); await shot('fs-1');
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1200);
  await page.locator('.ivm #focusmode').click(); await sleep(1500);
  console.log('focus on:', await page.evaluate(() => document.querySelector('.ivm #focusmode').getAttribute('aria-pressed')), '| bar:', await page.evaluate(() => !document.querySelector('.ivm #focusbar').hidden));
  console.log('stats right:', await page.evaluate(() => { const s = document.querySelector('.ivm .mapstats').getBoundingClientRect(), a = document.querySelector('.ivm aside').getBoundingClientRect(); return Math.round(s.right) + ' vs panel left ' + Math.round(a.left); }));
  await shot('fs-2');
  await page.locator('.ivm #focusmode').click(); await sleep(1200);
  console.log('focus off:', await page.evaluate(() => document.querySelector('.ivm #focusmode').getAttribute('aria-pressed')));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
