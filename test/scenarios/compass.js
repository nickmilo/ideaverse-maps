// 0.8.32: Compass
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' < ')));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.evaluate(() => document.querySelector('.ivm #gocompass').click()); await sleep(3000);
  console.log('view', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view()));
  await page.mouse.move(5, 900); await shot('cmp-default');
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 900); await sleep(800); await shot('cmp-pace');
  await page.evaluate(() => { const i = document.querySelector('.ivm .cmpany input'); i.click(); }); await sleep(4000); await page.mouse.move(5, 900); await sleep(800); await shot('cmp-relevance');
  // pin, then click a nearby note: the centre stays, the note opens as the support note
  await page.locator('.ivm-card-left .cardpin').click(); await sleep(400);
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const t = await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; for (const p of ['Atlas/Things/E-shaped Understanding.md', 'Atlas/Things/Triangulation.md', 'Atlas/Things/Affordances.md']) { const a = v._at(p); if (a && a[0] > 450 && a[0] < 1000 && a[1] > 40 && a[1] < 800) return [p, a]; } return null; });
  console.log('target', JSON.stringify(t)); if (t) { await page.mouse.click(cvr.x + t[1][0], cvr.y + t[1][1]); await sleep(4000); }
  console.log('after', await page.evaluate(() => [(document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent, (document.querySelector('.ivm-card-right:not([hidden]) .cardt') || {}).textContent].join(' | ')));
  await page.mouse.move(5, 900); await shot('cmp-pinned');
  console.log('errors:', errs.join(' | ') || 'none');
};
