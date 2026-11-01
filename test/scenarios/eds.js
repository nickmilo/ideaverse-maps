// Edit mode: centre card with opacity, left editor, ⌘-click right editor, hub previews
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500); await page.evaluate(() => document.querySelector('.ivm #themeseg button[data-th="lyt"]').click()); await sleep(800);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts button', { hasText: 'Map' }).click(); await sleep(200);
  await page.locator('.ivm .editopts .eosw', { hasText: 'Hub previews' }).click(); await sleep(300); await shot('eds-menu'); await page.locator('.ivm #dispbtn').click(); await sleep(1200);
  await page.mouse.move(5, 900); await shot('eds-previews');
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  await pick('Pace Layers'); await page.mouse.move(5, 900); await sleep(600); await shot('eds-center');
  // ⌘-click a linked note
  const pt = await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const r = v.containerEl.querySelector('.ivm canvas').getBoundingClientRect(); const a = v.map._at('Atlas/Things/Triangulation.md'); return a ? [r.left + a[0], r.top + a[1]] : null; });
  console.log('tri at', JSON.stringify(pt));
  if (pt) { await page.keyboard.down('Control'); await page.mouse.click(pt[0], pt[1]); await page.keyboard.up('Control'); await sleep(3000); await page.mouse.move(5, 900); await shot('eds-right'); }
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(3000);
  await page.mouse.move(5, 900); await shot('eds-left');
  console.log('rects', await page.evaluate(() => [...document.querySelectorAll('.ivm-card-left, .ivm-card-left .cardhd, .ivm canvas, .ivm header')].map(e => e.className.slice(0,20) + ':' + JSON.stringify(e.getBoundingClientRect().toJSON(), ['top','height']) + getComputedStyle(e).zIndex).join(' | ')));
  console.log('state', await page.evaluate(() => [...document.querySelectorAll('.ivm-card:not(.ivm-pv)')].map(e => e.className.replace('ivm-card ', '') + ':' + (e.hidden ? 'hidden' : 'open')).join(' ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
