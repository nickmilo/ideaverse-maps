// newsletter gallery: each shot = a map, a theme, a few touches; screenshots of the map pane only
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(3000);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 600000 }); await sleep(8000);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); }); await sleep(1500);
  const R = '.ivm';
  await page.addStyleTag({ content: '.notice-container{display:none !important}' });
  const theme = t => page.evaluate(t => { const b = document.querySelector(`.ivm #themeseg button[data-th="${t}"]`); b && b.click(); }, t);
  const clean = async (legend, anim) => page.evaluate(([legend, anim]) => {
    const lg = document.querySelector('.ivm #legend'), lt = document.querySelector('.ivm #legtab');
    const open = lg && !lg.classList.contains('collapsed');
    if (open !== legend) { if (open) lg.click(); else lt && lt.click(); }
    const ad = document.querySelector('.ivm #animdock'); const aOpen = ad && !ad.hidden && !ad.classList.contains('collapsed');
    if (aOpen !== anim) { const at = document.querySelector('.ivm #anitab'); if (aOpen) { const x = ad.querySelector('.dockx, .legx, button[aria-label*="Tuck"], button[aria-label*="Hide"]'); if (x) x.click(); else ad.click(); } else at && at.click(); }
  }, [legend, anim]);
  // a gear item: radios always; a switch only when it isn't already on (sel "!x" turns it off)
  const gear = async sel => { await page.locator('.ivm #mapsetbtn').click(); await sleep(400);
    if (sel) { const off = sel.startsWith('!'); const q = '.ivm ' + (off ? sel.slice(1) : sel); const want = !off;
      const on = await page.evaluate(q => { const el = document.querySelector(q); if (!el) return null; const i = el.matches('input') ? el : el.querySelector('input'); return i ? (i.type === 'radio' ? false : i.checked) : null; }, q);
      if (on !== want) { await page.locator(q).first().click(); await sleep(1800); } }
    await page.keyboard.press('Escape'); await sleep(300); };
  const pick = async name => { await page.locator('.ivm #q').fill(name); await sleep(700); await page.keyboard.press('Enter'); await sleep(1500); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.evaluate(() => { const q = document.querySelector('.ivm #q'); if (q) q.value = ''; }); await sleep(300); };
  const go = async s => {
    if (s.key) { await page.keyboard.press(s.key); } else if (s.btn) { await page.evaluate(id => document.querySelector('.ivm #' + id).click(), s.btn); }
    await sleep(s.wait || 3000);
  };
  const SH = JSON.parse(process.env.GAL);
  for (const s of SH) {
    try {
      await page.keyboard.press('Escape'); await sleep(200);
      if (!s.sel) await page.evaluate(() => { for (const t of ['Close', 'Clear']) for (const b of document.querySelectorAll('.ivm button')) if (b.textContent.trim() === t && b.getBoundingClientRect().width > 0 && !b.closest('.mspop')) b.click(); });
      await go(s); await theme(s.theme); await sleep(600);
      for (const g of s.gear || []) await gear(g);
      for (const k of s.keys || []) { await page.keyboard.press(k); await sleep(500); }
      if (s.js) await page.evaluate(s.js);
      if (s.sel) await pick(s.sel);
      await clean(!!s.legend, !!s.anim);
      for (let z = 0; z < (s.zin || 0); z++) { await page.locator('.ivm #zin').click(); await sleep(350); }
      if (s.click) { await page.mouse.click(s.click[0], s.click[1]); }
      await sleep(s.settle || 2500); await page.mouse.move(5, 940);
      if (s.open) { await page.locator('.ivm ' + s.open).click(); await sleep(700); }
      await page.locator(R).first().screenshot({ path: require('path').join(process.env.SHOTS, s.name + '.png') }); console.log('shot', s.name);
      if (s.open) { await page.keyboard.press('Escape'); await sleep(300); }
      if (s.after) for (const k of s.after) { await page.keyboard.press(k); await sleep(400); }
    } catch (e) { console.log('FAIL', s.name, e.message.split('\n')[0]); await page.keyboard.press('Escape'); }
  }
  console.log('errors:', errs.join(' | ') || 'none');
};
