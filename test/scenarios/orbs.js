// 0.8.28: tabs as orbs, pin, Shift-click
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' < ')));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await shot('orb-menu'); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const M = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.map';
  const at = p => page.evaluate(([p, M]) => eval(M)._at(p), [p, M]);
  const state = () => page.evaluate(() => ({ orbs: [...document.querySelectorAll('.ivm .ivm-orb')].map(o => o.dataset.name + (o.classList.contains('cur') ? '*' : '') + (o.classList.contains('pin') ? '📌' : '')), left: (document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent || '-', right: (document.querySelector('.ivm-card-right:not([hidden]) .cardt') || {}).textContent || '-' }));
  console.log('1 pick', JSON.stringify(await state()));
  const tri = await at('Atlas/Things/Triangulation.md'); console.log('tri', JSON.stringify(tri));
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const clickNote = async (p, mod) => { const a = await at(p); if (!a) return false; if (mod) await page.keyboard.down(mod); await page.mouse.click(cvr.x + a[0], cvr.y + a[1]); if (mod) await page.keyboard.up(mod); await sleep(3000); return true; };
  await clickNote('Atlas/Things/Triangulation.md', 'Shift'); console.log('2 shift-click', JSON.stringify(await state()));
  await page.locator('.ivm-card-left .cardpin').click(); await sleep(500); console.log('3 pinned', JSON.stringify(await state()));
  const e = await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; return ['Atlas/Things/E-shaped Understanding.md', 'Atlas/Things/Pace Layers.md', 'Atlas/Things/Affordances.md'].find(p => { const a = v._at(p); return a && a[0] > 650 && a[0] < 1000 && a[1] > 60 && a[1] < 820; }); });
  console.log('plain target', e); if (e) await clickNote(e); console.log('4 plain click while pinned', JSON.stringify(await state()));
  await page.mouse.move(5, 900); await shot('orb-pinned');
  // shift-click a link in the left editor (properties or text)
  const lk = await page.evaluate(() => { const a = [...document.querySelectorAll('.ivm-card-left [data-href], .ivm-card-left .cm-hmd-internal-link')].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.top > 150 && r.bottom < 950; }); if (!a) return null; const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, a.textContent]; });
  console.log('link', JSON.stringify(lk)); if (lk) { await page.keyboard.down('Shift'); await page.mouse.click(lk[0], lk[1]); await page.keyboard.up('Shift'); await sleep(3000); }
  console.log('5 shift-click link', JSON.stringify(await state()), 'tabs', await page.evaluate(() => app.workspace.getLeavesOfType('markdown').length));
  await page.locator('.ivm .editopts', { hasText: '' }).count();
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editopts .eosw', { hasText: 'orb names' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.mouse.move(5, 900); await shot('orb-names');
  await page.locator('.ivm .ivm-orb').first().click(); await sleep(3000); console.log('6 orb 1', JSON.stringify(await state()));
  const names = () => page.evaluate(() => [...document.querySelectorAll('.ivm .ivm-orb')].map(o => o.dataset.name + (o.classList.contains('cur') ? '*' : '')).join(', '));
  console.log('7 before drag', await names());
  const r = await page.evaluate(() => [...document.querySelectorAll('.ivm .ivm-orb')].map(o => { const b = o.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }));
  if (r.length >= 3) { await page.mouse.move(r[0][0], r[0][1]); await page.mouse.down(); await page.mouse.move(r[0][0] + 20, r[0][1], { steps: 4 }); await page.mouse.move(r[2][0] + 15, r[2][1], { steps: 6 }); await page.mouse.up(); await sleep(800); }
  console.log('8 after drag', await names(), '| left', await page.evaluate(() => (document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
