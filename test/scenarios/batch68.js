module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  const M = () => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map;
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  // Kandinsky drag
  const p0 = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at('Atlas/Maps/Habits Map.md'));
  console.log('habits at', JSON.stringify(p0));
  if (p0) { await page.mouse.move(cvr.x + p0[0], cvr.y + p0[1]); await page.mouse.down(); await page.mouse.move(cvr.x + p0[0] + 120, cvr.y + p0[1] + 80, { steps: 8 }); await sleep(300); await page.mouse.move(5, 950).catch(() => {}); }
  await shot('k-drag'); await page.mouse.up(); await sleep(250); await shot('k-spring'); await sleep(1500); await shot('k-home');
  // double-click in Composition
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header [data-tip]')].find(x => /settings$/.test(x.dataset.tip)); b.click(); }); await sleep(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm .kdany .seg button')].find(x => x.textContent === 'Composition'); b.click(); }); await sleep(2500); await page.mouse.click(5, 950); await sleep(300);
  const cand = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; for (const p of ['Atlas/Maps/Habits Map.md', 'Atlas/Things/Idea Emergence.md', 'Atlas/Maps/Concepts Map.md']) { const a = m._at(p); if (a && a[0] > 300 && a[0] < 1400 && a[1] > 50 && a[1] < 850) return [p, a]; } return null; });
  console.log('dbl target', JSON.stringify(cand)); if (cand) { await page.mouse.dblclick(cvr.x + cand[1][0], cvr.y + cand[1][1]); await sleep(3000); } await page.mouse.move(5, 950); await shot('k-dbl');
  // hover tooltip
  await page.keyboard.press('1'); await sleep(3000);
  const pt = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at('Atlas/Things/Pace Layers.md'));
  if (pt) { await page.mouse.move(cvr.x + pt[0], cvr.y + pt[1]); await sleep(800); }
  console.log('tip', await page.evaluate(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.innerText.replace(/\n/g, ' ⏎ ') + ' | h=' + Math.round(t.getBoundingClientRect().height) : 'hidden'; }));
  if (pt) { await page.screenshot({ path: process.env.SHOTS + '/tip.png', clip: { x: cvr.x + pt[0] - 60, y: cvr.y + pt[1] - 40, width: 520, height: 110 } }); }
  // editors on another map (Treemap)
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300); await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(500);
  await page.evaluate(() => document.querySelector('.ivm #gotreemap').click()); await sleep(3000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  console.log('treemap editor', await page.evaluate(() => (document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent || 'none'));
  await page.mouse.move(5, 950); await shot('treemap-editor');
  // pinned orb click
  await page.locator('.ivm-card-left .cardpin').click(); await sleep(400);
  await page.keyboard.down('Shift'); await page.locator('.ivm #q').fill('Triangulation'); await sleep(700); await page.keyboard.press('Enter'); await page.keyboard.up('Shift'); await sleep(3000);
  console.log('orbs', await page.evaluate(() => [...document.querySelectorAll('.ivm .ivm-orb')].map(o => o.dataset.name + (o.classList.contains('cur') ? '*' : '') + (o.classList.contains('pin') ? '📌' : '')).join(', ')));
  await page.evaluate(() => { const o = [...document.querySelectorAll('.ivm .ivm-orb')].find(x => x.dataset.name === 'Pace Layers'); if (o) o.click(); }); await sleep(2500);
  console.log('after', await page.evaluate(() => [(document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent, (document.querySelector('.ivm-card-right:not([hidden]) .cardt') || {}).textContent || '-'].join(' | ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
