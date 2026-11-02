// pinned main editor keeps its note even when the pick is open in another tab
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2000);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  const pick = async (nm, shift) => { await page.locator('.ivm #q').fill(nm); await sleep(700); if (shift) await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); if (shift) await page.keyboard.up('Shift'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  const st = () => page.evaluate(() => [(document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent, (document.querySelector('.ivm-card-right:not([hidden]) .cardt') || {}).textContent || '-', [...document.querySelectorAll('.ivm .ivm-orb')].map(o => o.dataset.name + (o.classList.contains('cur') ? '*' : '') + (o.classList.contains('pin') ? '📌' : '')).join(',')].join(' | '));
  await pick('Triangulation'); 
  // make a second tab with Pace Layers: shift-click on the map
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  await pick('Pace Layers'); console.log('two notes, one tab', await st());
  // open Triangulation as a new tab via the orb route: TABS has only Pace Layers now; use the strip list with shift
  await page.locator('.ivm-card-left .cardstrip .spill', { hasText: 'related' }).click(); await sleep(400);
  await page.keyboard.down('Shift'); await page.locator('.ivm-card-left .sdr').first().click(); await page.keyboard.up('Shift'); await sleep(3000); console.log('shift → new tab', await st());
  // go back to the Pace Layers orb, pin it, then pick the note open in the other tab
  await page.locator('.ivm .ivm-orb', { hasText: 'Pace Layers' }).click(); await sleep(3000); await page.locator('.ivm-card-left .cardpin').click(); await sleep(500); console.log('pinned', await st());
  await pick('Idea Emergence Levels'); console.log('pick the other tab\'s note', await st());
  console.log('errors:', errs.join(' | ') || 'none');
};
