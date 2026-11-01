// The map reacting as you write, and links clicked in a card staying on the map
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  await pick('Pace Layers'); await page.mouse.move(5, 900); await sleep(800);
  const M = () => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map;
  const tabs = () => page.evaluate(() => app.workspace.getLeavesOfType('markdown').filter(l => l.getRoot() === app.workspace.rootSplit).length);
  console.log('errs at pick', errs.length); const t0 = await tabs();
  await page.evaluate(() => { const sc = document.querySelector('.ivm-card-left .cm-scroller'); if (sc) sc.scrollTop = sc.scrollHeight; }); await sleep(1200);
  await page.evaluate(() => { const sc = document.querySelector('.ivm-card-left .cm-scroller'); if (sc) sc.scrollTop = sc.scrollHeight; }); await sleep(800);
  // a real click on the link in the left card
  const got = await page.evaluate(() => { const els = [...document.querySelectorAll('.ivm-card-left .cm-hmd-internal-link, .ivm-card-left a.internal-link')].filter(e => /E-shaped/.test(e.textContent)); if (!els.length) return null; els[0].scrollIntoView({ block: 'center' }); const r = els[0].getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; });
  console.log('link at', JSON.stringify(got));
  if (got) { await sleep(500); const g2 = await page.evaluate(() => { const e = [...document.querySelectorAll('.ivm-card-left .cm-hmd-internal-link, .ivm-card-left a.internal-link')].find(e => /E-shaped/.test(e.textContent)); const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; }); await page.mouse.click(g2[0], g2[1]); await sleep(3500); }
  console.log('after click: E-shaped', JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note('Atlas/Things/E-shaped Understanding.md'))), 'tabs', t0, '->', await tabs(),
    'left card title', await page.evaluate(() => (document.querySelector('.ivm-card-left .cardhd') || {}).textContent));
  if (!got) { // the link isn't drawn (the editor only draws what's in view): the same path Obsidian takes on a link click
    await page.evaluate(() => { document.querySelector('.ivm-card-left .cardbody > *').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return app.workspace.openLinkText('E-shaped Understanding', 'Atlas/Things/Pace Layers.md', false); }); await sleep(3500);
    console.log('simulated: E-shaped', JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note('Atlas/Things/E-shaped Understanding.md'))), 'tabs', await tabs(), 'left', await page.evaluate(() => document.querySelector('.ivm-card-left .cardt').textContent));
    await page.evaluate(() => { document.querySelector('.ivm-card-left .cardbody > *').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return app.workspace.openLinkText('Aikido', 'Atlas/Things/E-shaped Understanding.md', 'tab'); }); await sleep(2500);
    console.log('mod: right', await page.evaluate(() => { const r = document.querySelector('.ivm-card-right'); return r.hidden ? 'hidden' : r.querySelector('.cardt').textContent; }), 'tabs', await tabs()); }
  console.log('errs after click', errs.length); await page.mouse.move(5, 900); await shot('live-linkclick');
  // live: add links to E-shaped Understanding in the file and watch the map
  const P = 'Atlas/Things/E-shaped Understanding.md', TG = ['Aikido', 'Adjacent Possible', 'Affordances', 'Accretion', 'Alchemy Deck', 'Amass', 'Anaphora', 'Adaptogens'];
  const before = await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note(p), P);
  const tb = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note('Atlas/Things/Aikido.md'));
  const orig = await page.evaluate(p => app.vault.read(app.vault.getAbstractFileByPath(p)), P);
  await page.evaluate(([p, tg]) => app.vault.process(app.vault.getAbstractFileByPath(p), t => t + '\n\nLIVETEST ' + tg.map(x => '[[' + x + ']]').join(' ') + '\n'), [P, TG]);
  await sleep(1300); await page.mouse.move(5, 900); await shot('live-flare');
  await sleep(2500);
  const after = await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note(p), P);
  const ta = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note('Atlas/Things/Aikido.md'));
  console.log('E-shaped', JSON.stringify(before), '->', JSON.stringify(after)); console.log('Aikido', JSON.stringify(tb), '->', JSON.stringify(ta));
  await page.evaluate(([p, o]) => app.vault.process(app.vault.getAbstractFileByPath(p), () => o), [P, orig]); await sleep(3500);
  console.log('restored', JSON.stringify(await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._note(p), P)));
  // tuck the left editor away and back
  await page.locator('.ivm-card-left .cardcol').click(); await sleep(1500); await page.mouse.move(5, 900); await shot('live-tucked');
  console.log('tucked: card hidden', await page.evaluate(() => document.querySelector('.ivm-card-left').hidden), 'tab', await page.evaluate(() => { const t = document.querySelector('.ivm .edtab-left'); return t && !t.hidden ? t.textContent : null; }));
  await page.locator('.ivm .edtab-left').click(); await sleep(1500); console.log('back: card hidden', await page.evaluate(() => document.querySelector('.ivm-card-left').hidden));
  console.log('errors:', errs.join(' | ') || 'none');
};
