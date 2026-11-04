// link by dragging (0.8.185)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000);
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const xy = t => page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__xy(t), t);
  const fm = () => page.evaluate(() => { const f = app.vault.getAbstractFileByPath('Atlas/Things/Pace Layers.md'); return JSON.stringify(app.metadataCache.getFileCache(f).frontmatter); });
  const drag = async (from, to, mod) => { const a = await xy(from), b = await xy(to); console.log(from, JSON.stringify(a), to, JSON.stringify(b)); if (!a || !b) return;
    if (mod) await page.keyboard.down(mod); await page.mouse.move(cr.x + a[0], cr.y + a[1]); await page.mouse.down(); await sleep(100);
    for (let q = 1; q <= 12; q++) { await page.mouse.move(cr.x + a[0] + (b[0] - a[0]) * q / 12, cr.y + a[1] + (b[1] - a[1]) * q / 12); await sleep(40); }
    await sleep(300); await shot('ld-over-' + (mod || 'none')); await page.mouse.up(); if (mod) await page.keyboard.up(mod); await sleep(1500); };
  console.log('before', await fm());
  await drag('The Long Now', 'Pace Layers', 'Alt'); console.log('after alt', await fm());
  await drag('Brian Eno', 'Pace Layers', 'Control'); console.log('after ctrl', await fm());
  // into the editor
  const ed = await page.evaluate(() => { const c = [...document.querySelectorAll('.ivm-card-left .cm-content')].find(x => x.offsetParent); if (!c) return null; const p = [...c.querySelectorAll('.cm-line')].find(l => { const r = l.getBoundingClientRect(); return r.top > 700 && r.top < 850 && l.textContent.length > 20; }); const r = p.getBoundingClientRect(); return [r.x + 80, r.y + r.height / 2]; });
  console.log('editor', JSON.stringify(ed));
  await page.evaluate(() => { window.__dl = []; for (const t of ['dragenter','dragover','drop']) document.addEventListener(t, e => { if (window.__dl.length < 400) window.__dl.push(t + ':' + (e.target.className || e.target.nodeName).toString().slice(0, 30) + ':' + e.defaultPrevented); }, true); });
  if (ed) { const a = await xy('E-shaped Understanding'); console.log('src', JSON.stringify(a)); await page.keyboard.down('Alt'); await page.mouse.move(cr.x + a[0], cr.y + a[1]); await page.mouse.down(); for (let q = 1; q <= 14; q++) { await page.mouse.move(cr.x + a[0] + (ed[0] - cr.x - a[0]) * q / 14, cr.y + a[1] + (ed[1] - cr.y - a[1]) * q / 14); await sleep(40); } await page.mouse.up(); await page.keyboard.up('Alt'); await sleep(1500);
    console.log('body has link', await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Atlas/Things/Pace Layers.md'); await new Promise(r => setTimeout(r, 2500)); const t = await app.vault.read(f); return (t.match(/E-shaped Understanding\]\]/g) || []).length; })); await shot('ld-editor'); console.log('events', JSON.stringify((await page.evaluate(() => window.__dl)).filter((x, i, a) => i === 0 || x !== a[i-1]).slice(-12))); }
  console.log('errors:', errs.join(' | ') || 'none');
};
