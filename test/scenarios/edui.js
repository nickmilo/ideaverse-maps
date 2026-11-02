// 0.8.29–0.8.31: menus above the editors, resize by dragging the edge, header click tucks away
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  // a menu over the editor
  await page.keyboard.press('f'); await sleep(1000); await shot('ui-filter-over');
  const top = await page.evaluate(() => { const p = [...document.querySelectorAll('.ivm header *')].filter(x => x.getBoundingClientRect().height > 200 && getComputedStyle(x).position === 'absolute').pop(); if (!p) return 'no pop'; const r = p.getBoundingClientRect(); const el = document.elementFromPoint(r.x + 40, r.y + 120); return el && (el.closest('.ivm-card') ? 'CARD on top' : 'menu on top'); });
  console.log('filter vs card:', top); await page.keyboard.press('f'); await sleep(500);
  // resize
  const w0 = await page.evaluate(() => document.querySelector('.ivm-card-left').getBoundingClientRect().width);
  const g = await page.evaluate(() => { const r = document.querySelector('.ivm-card-left .cardgrip').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.move(g[0], g[1]); await page.mouse.down(); await page.mouse.move(g[0] + 80, g[1], { steps: 6 }); await page.mouse.move(g[0] + 160, g[1], { steps: 6 }); await page.mouse.up(); await sleep(800);
  const w1 = await page.evaluate(() => document.querySelector('.ivm-card-left').getBoundingClientRect().width); console.log('width', w0, '->', w1);
  await page.mouse.move(5, 900); await shot('ui-wider');
  // header click tucks away
  const h = await page.evaluate(() => { const r = document.querySelector('.ivm-card-left .cardt').getBoundingClientRect(); return [r.x + 10, r.y + r.height / 2]; });
  await page.mouse.click(h[0], h[1]); await sleep(1000); console.log('after header click hidden:', await page.evaluate(() => document.querySelector('.ivm-card-left').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
