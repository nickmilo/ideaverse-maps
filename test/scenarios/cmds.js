// 0.8.27: Open note in Emergence / Starfield
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 6).join(' < ')));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(4000); await page.keyboard.press('1'); await sleep(1500);
  await page.evaluate(() => app.workspace.getLeaf('tab').openFile(app.vault.getAbstractFileByPath('Atlas/Things/Pace Layers.md'))); await sleep(1500);
  const has = await page.evaluate(() => Object.keys(app.commands.commands).filter(c => c.startsWith('ideaverse-maps:open-in')));
  console.log('commands', JSON.stringify(has));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open-in-starfield'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(9000);
  const st = () => page.evaluate(() => ({ view: app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view(), left: (() => { const c = document.querySelector('.ivm-card-left'); return c && !c.hidden ? c.querySelector('.cardt').textContent : 'hidden'; })(), focus: !!(document.activeElement && document.activeElement.closest('.ivm-card-left')) }));
  console.log('starfield', JSON.stringify(await st())); await page.mouse.move(5, 900); await shot('cmd-stars');
  await page.evaluate(() => app.workspace.getLeaf('tab').openFile(app.vault.getAbstractFileByPath('Atlas/Things/E-shaped Understanding.md'))); await sleep(1500);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open-in-emergence')); await sleep(5000);
  console.log('emergence', JSON.stringify(await st())); await page.mouse.move(5, 900); await shot('cmd-emergence');
  console.log('errors:', errs.join(' | ') || 'none');
};
