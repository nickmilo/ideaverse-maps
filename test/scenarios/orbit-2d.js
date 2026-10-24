module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(300);
  console.log('wander:', await page.evaluate(() => [...document.querySelectorAll('.ivm #playseg button')].map(b => b.textContent).join('/') + ' | toggles: ' + [...document.querySelectorAll('.ivm #playbar .pmaps')].map(l => (l.hidden ? '-' : '') + l.textContent.trim()).join(' / ')));
  console.log('orbit on emergence:', await page.evaluate(() => !document.querySelector('.ivm .aniwrap[data-a=orbit]').hidden), '| earth shown:', await page.evaluate(() => getComputedStyle(document.querySelector('.ivm #driftseg .dearth')).display));
  const before = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug && 0);
  await page.locator('.ivm #dplay').click(); await sleep(400); await shot('o2-a'); await sleep(4000); await shot('o2-b');
  console.log('dplay:', await page.locator('.ivm #dplay').textContent());
  await page.locator('.ivm #dplay').click(); await sleep(300);
  await page.locator('.ivm #playseg button[data-p=map]').click(); await sleep(500); console.log('Maps mode trails shown:', await page.evaluate(() => !document.querySelector('.ivm #ptrail').closest('label').hidden));
  await page.locator('.ivm #pplay').click(); await sleep(300); await shot('o2-maps');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
