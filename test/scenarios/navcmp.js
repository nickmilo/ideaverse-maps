module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.evaluate(() => document.querySelector('.ivm #gocompass').click()); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  const st = () => page.evaluate(() => { const c = document.querySelector('.ivm-card-left:not([hidden])'); if (!c) return 'no card'; const b = c.querySelectorAll('.cardnav'); return c.querySelector('.cardt').textContent + ' back:' + !b[0].disabled + ' fwd:' + !b[1].disabled; });
  await pick('Architect & Gardener'); await pick('Idea Emergence'); await pick('Pace Layers'); console.log('now', await st());
  // click a note on the map too
  const pt = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at('Atlas/Things/E-shaped Understanding.md'));
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  if (pt) { await page.mouse.click(cvr.x + pt[0], cvr.y + pt[1]); await sleep(3500); console.log('clicked', await st()); }
  for (let q = 0; q < 4; q++) { await page.locator('.ivm-card-left .cardnav').first().click(); await sleep(3000); console.log('back', await st()); }
  console.log('errors:', errs.join(' | ') || 'none');
};
