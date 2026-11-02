// Cockpit: open on it, search a note, fly forward, lock + autopilot into a panel, F/R, back
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); console.log('view', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view()));
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await sleep(1500); await page.mouse.move(800, 400); await shot('ck-start');
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(800, 400); await sleep(800); await shot('ck-pace');
  await page.keyboard.down('w'); await sleep(900); await page.keyboard.up('w'); await sleep(200); await shot('ck-forward');
  await page.keyboard.press('f'); await sleep(400); await shot('ck-inonly'); await page.keyboard.press('f');
  await page.keyboard.press('Tab'); await sleep(200); await page.keyboard.press(' '); await sleep(1200); await shot('ck-auto');
  await sleep(5000); await shot('ck-arrived');
  console.log('sel after', await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; return m._sel ? m._sel() : document.querySelector('.ivm').dataset.view; }));
  await page.keyboard.press('b'); await sleep(2000); await shot('ck-back');
  console.log('errors:', errs.join(' | ') || 'none');
};
