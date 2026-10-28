// newsletter gallery: each shot = a map, a theme, a few touches; screenshots of the map pane only
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(3000);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) { console.log('retry open', t); } }
  await sleep(8000);
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
      await page.evaluate(() => { const t = document.querySelector('.ivm .htab'); if (t && !t.hidden) t.click(); }); await sleep(300);
      if (!s.sel) await page.evaluate(() => { for (const t of ['Close', 'Clear']) for (const b of document.querySelectorAll('.ivm button')) if (b.textContent.trim() === t && b.getBoundingClientRect().width > 0 && !b.closest('.mspop')) b.click(); });
      await go(s); await theme(s.theme); await sleep(600);
      await page.evaluate(want => { for (const l of document.querySelectorAll('.ivm label.pmaps.drow')) if (/Show the way home/.test(l.textContent)) { const i = l.querySelector('input'); if (i.checked !== want) i.click(); } }, !!s.bacon);
      for (const g of s.gear || []) await gear(g);
      for (const k of s.keys || []) { await page.keyboard.press(k); await sleep(500); }
      for (let z = 0; z < (s.zin || 0); z++) { await page.locator('.ivm #zin').click(); await sleep(350); }
      if (s.js) await page.evaluate(s.js);
      if (s.sel) await pick(s.sel);
      // select by clicking the note where it sits (a click never zooms, unlike Find)
      if (s.clickSel) { const pt = await page.evaluate(p => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const cv = v.containerEl.querySelector('.ivm canvas'); const r = cv.getBoundingClientRect(); const a = v.map._at(p); return a ? [r.left + a[0], r.top + a[1]] : null; }, s.clickSel);
        if (pt) { await page.mouse.click(pt[0], pt[1]); await sleep(1500); } else console.log('no point for', s.clickSel); }
      await clean(!!s.legend, !!s.anim);
      for (const c of s.clicks || []) { await page.evaluate(q => { const b = document.querySelector('.ivm ' + q); b && b.click(); }, c); await sleep(900); }
      if (s.fit) { await page.evaluate(() => document.querySelector('.ivm #zfit').click()); await sleep(2500); }
      // fine zoom: wheel steps at the canvas center, or at a note (s.wz = {n, d, at})
      if (s.wz) { await page.evaluate(w => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const cv = v.containerEl.querySelector('.ivm canvas'); const r = cv.getBoundingClientRect();
          let x = r.left + r.width / 2, y = r.top + r.height / 2; if (w.at) { const p = v.map._at(w.at); if (p) { x = r.left + p[0]; y = r.top + p[1]; } } if (w.f) { x = r.left + r.width * w.f[0]; y = r.top + r.height * w.f[1]; }
          for (let i = 0; i < w.n; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: w.d, clientX: x, clientY: y, ctrlKey: true, bubbles: true, cancelable: true })); }, s.wz); await sleep(1200); }
      if (s.click) { await page.mouse.click(s.click[0], s.click[1]); }
      for (const k of s.play || []) { await page.keyboard.press(k); await sleep(300); }
      await sleep(s.settle || 2500); await page.mouse.move(5, 940);
      if (s.open) { await page.locator('.ivm ' + s.open).click(); await sleep(700); }
      await page.locator(R).first().screenshot({ path: require('path').join(process.env.SHOTS, s.name + '.png') }); console.log('shot', s.name);
      // a burst of stills while something plays (Timelapse): s.burst = ms between shots
      for (let b = 0; b < (s.burst || []).length; b++) { await sleep(s.burst[b]); await page.locator(R).first().screenshot({ path: require('path').join(process.env.SHOTS, s.name + '-' + (b + 1) + '.png') }); console.log('shot', s.name + '-' + (b + 1)); }
      if (s.stop) for (const k of s.stop) { await page.keyboard.press(k); await sleep(400); }
      if (s.open) { await page.keyboard.press('Escape'); await sleep(300); }
      if (s.after) for (const k of s.after) { await page.keyboard.press(k); await sleep(400); }
    } catch (e) { console.log('FAIL', s.name, e.message.split('\n')[0]); await page.keyboard.press('Escape'); }
  }
  console.log('errors:', errs.join(' | ') || 'none');
};
