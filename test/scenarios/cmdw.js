module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.evaluate(() => app.hotkeyManager.setHotkeys('workspace:toggle-pin', [{ modifiers: ['Mod', 'Shift'], key: 'E' }]));
  const st = () => page.evaluate(() => [...document.querySelectorAll('.ivm-orbs .ivm-orb')].map(b => (b.classList.contains('cur') ? '*' : '') + (b.classList.contains('pin') ? '📌' : '') + b.querySelector('.orbsr').textContent).join(' | ') + ' · editor: ' + ((document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent || 'closed') + ' · map tabs: ' + app.workspace.getLeavesOfType('ideaverse-maps').length);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000);
  await page.mouse.click(800, 600); await sleep(300);
  console.log('start', await st());
  await page.keyboard.press('Control+Shift+E'); await sleep(600); console.log('pin hotkey', await st());
  await page.keyboard.press('Control+Shift+E'); await sleep(600); console.log('unpin hotkey', await st());
  await page.evaluate(() => { const c = document.querySelector('.ivm-card-left .cm-content'); c && c.focus(); }); await sleep(300);
  console.log('cmd patched', await page.evaluate(() => String(app.commands.commands['workspace:close'].checkCallback).includes('tabCmds'))); console.log('active in card', await page.evaluate(() => { const a = document.activeElement; return !!(a && a.closest('.ivm-card-left')) + ' ' + (a && a.className); }));
  await page.keyboard.press('Control+w'); await sleep(1200); console.log('ctrl+w (focus in editor)', await st());
  await page.mouse.click(800, 600); await sleep(300);
  await page.keyboard.press('Control+w'); await sleep(1200); console.log('ctrl+w again', await st());
  console.log('errors:', errs.join(' | ') || 'none');
};
