module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  const open = async () => { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500); };
  await open();
  const mins = () => page.evaluate(() => [...document.querySelectorAll('.ivm input[type=range]')].map(x => x.min + '-' + x.max).join(' '));
  console.log('before', await mins());
  await page.evaluate(() => { const i = app.plugins.plugins['ideaverse-maps']; });
  await page.locator('.ivm #filtbtn, .ivm #fbtn').first().click().catch(() => {});
  // turn mtime on through the stored pref and reload the plugin
  await page.evaluate(async () => { const l = document.querySelectorAll('.ivm label'); for (const x of l) if (/Organize by most recently modified/.test(x.textContent)) { x.querySelector('input').click(); break; } });
  await sleep(1000);
  await page.evaluate(async () => { app.workspace.detachLeavesOfType('ideaverse-maps'); await app.plugins.disablePlugin('ideaverse-maps'); await app.plugins.enablePlugin('ideaverse-maps'); }); await sleep(2000);
  await open(); console.log('reloaded with mtime', await mins());
  await page.evaluate(async () => { const l = document.querySelectorAll('.ivm label'); for (const x of l) if (/Organize by most recently modified/.test(x.textContent)) { x.querySelector('input').click(); break; } });
  await sleep(1500); console.log('after off', await mins());
  // rename a view
  await page.locator('.ivm #viewbtn').click(); await sleep(400);
  await page.locator('.ivm #vlist .vr').first().hover(); await sleep(200); await shot('v58-hover');
  await page.locator('.ivm #vlist .vr .vren').first().click(); await sleep(300); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type('Renamed view'); await shot('v58-renaming'); await page.keyboard.press('Enter'); await sleep(400);
  console.log('names:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vlist .vgo b')].map(b => b.textContent).join(' | ')));
  console.log('dialog labels left:', await page.evaluate(() => document.querySelectorAll('.ivm [role=dialog][aria-label]').length));
  await shot('v58-after');
  console.log('errors:', errs.join(' | ') || 'none');
};
