module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000);
  const names = () => page.evaluate(() => [...document.querySelectorAll('.ivm #vlist .vgo b')].map(b => b.textContent).join(' | ') + ' // groups: ' + [...document.querySelectorAll('.ivm #vlist .vgrp summary .t')].map(t => t.textContent).join(','));
  await page.locator('.ivm #viewbtn').click(); await sleep(500);
  console.log('phone opens:', await names(), '// folder:', await page.evaluate(() => app.plugins.plugins['ideaverse-maps'].settings.viewsFolder));
  // the desktop adds a view; sync writes the file
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('x/Settings/MOTI/Maps of the Ideaverse - saved views.json'); const o = JSON.parse(await app.vault.read(f)); o.views.push({ name: 'Added on desktop', view: 'stars', mode: 'time', group: 'Daily Drivers' }); await app.vault.modify(f, JSON.stringify(o)); });
  await sleep(1500); console.log('after sync:', await names()); await shot('vsync');
  console.log('errors:', errs.join(' | ') || 'none');
};
