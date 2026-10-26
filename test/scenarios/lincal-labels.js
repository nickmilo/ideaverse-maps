// Linear Calendar: the note you're on and the one under the pointer both keep a readable name (one moves to the other side of its dot)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.locator('.ivm #vmore').first().click(); await sleep(300);
  await page.evaluate(() => { document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm #golincal').click(); }); await sleep(2500);
  for (let z = 0; z < 3; z++) { await page.mouse.move(700, 550); await page.mouse.wheel(0, -400); await sleep(300); } await sleep(800);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const pair = await page.evaluate(([w, h]) => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; const ps = app.vault.getMarkdownFiles().map(f => [f.path, m._scr(f.path)]).filter(([, a]) => a && a[2] && a[0] > 80 && a[0] < w - 400 && a[1] > 80 && a[1] < h - 80);
    for (const [p, a] of ps) for (const [q, b] of ps) if (p !== q && Math.abs(a[1] - b[1]) < 3 && b[0] - a[0] > 12 && b[0] - a[0] < 70) return [[p, a], [q, b]]; return null; }, [box[2], box[3]]);
  console.log('pair', JSON.stringify(pair));
  if (pair) { await page.mouse.click(box[0] + pair[0][1][0], box[1] + pair[0][1][1]); await sleep(1200);
    const b = await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at(p), pair[1][0]);
    await page.mouse.move(box[0] + b[0], box[1] + b[1]); await sleep(800); }
  await shot('lincal-labels');
  console.log('errors:', errs.join(' | ') || 'none');
};
