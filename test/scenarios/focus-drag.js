module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack||'').split('\n').slice(1,4).join(' < '))); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gograph').click(); }); await sleep(8000);
  const M = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.map';
  const target = process.env.TARGET || 'Atlas/Maps/Craft note path.md';
  await page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(t), target); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #dfocus').click()); await sleep(1000);
  if (process.env.FIND) { await page.locator('.ivm #q').first().click(); await page.keyboard.type(process.env.FIND); await sleep(800); await page.mouse.click(1590, 990); await sleep(300); }
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm #focusbar button')].find(b => b.textContent.trim() === '2'); b && b.click(); }); await sleep(8000);
  // find a linked neighbor in focus
  for (let q = 0; q < 4; q++) { console.log('probe', await page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph()))); await sleep(1500); }
  if (process.env.NOFOCUS) { await page.evaluate(() => document.querySelector('.ivm #focusbar button:last-child').click()); await sleep(5000); }
  const nb = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; const fs = app.vault.getMarkdownFiles().map(f => f.path); for (const p of fs) { const r = m._scr(p); if (r && r[2] && r[4] > 0 && r[0] > 100 && r[0] < 1000 && r[1] > 250 && r[1] < 900) return [p, r]; } return null; });
  console.log('neighbor', JSON.stringify(nb), 'graph', await page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph())));
  if (nb) { const [p, [x, y]] = nb; const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top]; });
    await page.mouse.move(box[0] + x, box[1] + y); await page.mouse.down(); for (let k = 1; k <= 15; k++) { await page.mouse.move(box[0] + x + k * 12, box[1] + y + k * 6); await sleep(30); } await sleep(500); console.log('mid drag (want', Math.round(x + 180), Math.round(y + 90), ')', JSON.stringify(await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._scr(p), p))); await page.mouse.up(); await sleep(1500);
    console.log('after drag', JSON.stringify(await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._scr(p), p)), 'focus still:', await page.evaluate(() => !document.querySelector('.ivm #focusbar').hidden)); }
  const rmsA = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph().rms);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  await page.evaluate(() => { const r = document.querySelectorAll('.ivm #gfctl input')[1]; r.value = '250'; r.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(4000);
  const sb = await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._scr(p), nb && nb[0]);
  console.log('slider: rms', rmsA, '->', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph().rms), 'note now', JSON.stringify(sb));
  await shot('fd');
  console.log('graph end', await page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph()))); console.log('errors:', errs.join(' | ') || 'none');
};
