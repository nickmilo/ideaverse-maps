module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gograph').click(); }); await sleep(6000);
  // a note with few links: focus on it (1 step), so the graph settles in the first stretch
  const p = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; const fs = app.vault.getMarkdownFiles().map(f => f.path); for (const q of fs) { const r = m._scr(q); if (r && r[4] >= 6 && r[4] <= 15) return q; } return fs[0]; });
  await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(p), p); await sleep(1200);
  await page.evaluate(() => document.querySelector('.ivm #dfocus').click()); await sleep(4000);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  const st = () => page.evaluate(() => document.querySelector('.ivm .gfstat').textContent);
  const pos = () => page.evaluate(p => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._scr(p).slice(0, 2).map(Math.round)), p);
  console.log('before:', await st(), await pos());
  await page.evaluate(() => { const r = document.querySelectorAll('.ivm #gfctl input')[2]; r.value = '200'; r.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(2500);
  console.log('after:', await st(), await pos());
  console.log('errors:', errs.join(' | ') || 'none');
};
