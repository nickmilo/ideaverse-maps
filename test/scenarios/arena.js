// 0.8.41: Arena
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  const M = () => page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; return v.map ? v.map._view() : 'NO MAP'; });
  console.log('started on', await M());
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.evaluate(() => document.querySelector('.ivm #goarena').click()); await sleep(3000); console.log('view', await M());
  await page.mouse.move(5, 900); await shot('arena-start');
  // fill two empty slots with the picker
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  for (const nm of ['Triangulation', 'Pace Layers', 'E-shaped Understanding', 'Affordances']) {
    const pt = await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; return v._arenaEmpty ? v._arenaEmpty() : null; });
    if (!pt) { console.log('no empty slot point'); break; }
    await page.mouse.click(cvr.x + pt[0], cvr.y + pt[1]); await sleep(900);
    const modal = await page.evaluate(() => !!document.querySelector('.prompt'));
    if (!modal) { console.log('no picker for', nm); break; }
    await page.keyboard.type(nm); await sleep(500); await page.keyboard.press('Enter'); await sleep(2500); }
  await page.mouse.move(5, 900); await shot('arena-filled');
  // now in Edit mode, pinned: the note at the centre
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Sensemaking MOC'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.locator('.ivm-card-left .cardpin').click(); await sleep(2500); await page.mouse.move(5, 900); await shot('arena-edit');
  console.log('labels', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._arenaList()));
  console.log('errors:', errs.join(' | ') || 'none');
};
