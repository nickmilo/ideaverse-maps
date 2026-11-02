module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.evaluate(() => document.querySelector('.ivm #gocompass').click()); await sleep(2500);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  const st = () => page.evaluate(() => { const c = document.querySelector('.ivm-card-left:not([hidden])'); if (!c) return 'no card'; const b = c.querySelectorAll('.cardnav'); return c.querySelector('.cardt').textContent + ' back:' + !b[0].disabled + ' fwd:' + !b[1].disabled; });
  await pick('Architect & Gardener'); await pick('Idea Emergence'); await pick('Pace Layers');
  for (let q = 0; q < 2; q++) { await page.locator('.ivm-card-left .cardnav').first().click(); await sleep(2500); } console.log('all back', await st());
  // the trail: click Pace Layers in the trail (the note just ahead twice) — then forward/back state
  await page.locator('.ivm-card-left .cardnav').nth(1).click(); await sleep(2500); console.log('forward', await st());
  await page.locator('.ivm-card-left .cardnav').nth(1).click(); await sleep(2500); console.log('forward', await st());
  console.log('open icon', await page.evaluate(() => !!document.querySelector('.ivm-card-left .cardopen svg')));
  await page.locator('.ivm-card-left .sscore').click(); await sleep(500); await page.locator('.ivm-card-left .sdem .sbe').click(); await sleep(600);
  console.log('details hidden', await page.evaluate(() => document.querySelector('.ivm-card-left .sddet').hidden), 'rows visible', await page.evaluate(() => { const r = document.querySelector('.ivm-card-left .sdsub .sdr'); const d = document.querySelector('.ivm-card-left .carddrop').getBoundingClientRect(); return !!r && r.getBoundingClientRect().bottom < d.bottom; }));
  await shot('b51-drop');
  // Compass relevance, then push
  const gear = async () => page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header [data-tip]')].find(x => /settings$/.test(x.dataset.tip)); b.click(); });
  await gear(); await sleep(500); await page.evaluate(() => document.querySelector('.ivm .cmpany input').click()); await sleep(3500); await page.mouse.move(800, 950); await shot('b51-rel');
  await page.evaluate(() => document.querySelectorAll('.ivm .cmpany input')[1].click()); await sleep(3500); await shot('b51-push');
  console.log('errors:', errs.join(' | ') || 'none');
};
