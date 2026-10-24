module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  const opts = sel => page.evaluate(sel => [...document.querySelectorAll(sel + ' #xmore option')].map(o => o.textContent).join(' | '), sel);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  console.log('main:', await opts('.workspace-leaf-content[data-type=ideaverse-maps]'));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000); console.log('base:', await opts('.ivm-bases'));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(5000);
  console.log('base after rescan:', await opts('.ivm-bases'));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
