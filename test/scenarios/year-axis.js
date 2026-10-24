// By → More… → year (and a property added in Settings)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('bases')) l.detach(); });
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.axisProps = ['year', 'rating']; await p.saveSettings(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(1000); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  console.log('options:', await page.evaluate(() => [...document.querySelectorAll('.ivm #xmore option')].map(o => o.textContent).join(' | ')));
  await page.locator('.ivm #xmore').first().selectOption('n:year'); await sleep(2500); await shot('year-axis');
  await page.locator('.ivm #xmore').first().selectOption('n:rating'); await sleep(2500); await shot('rating-axis');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
