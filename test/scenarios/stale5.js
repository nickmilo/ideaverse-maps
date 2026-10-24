module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const st = () => page.evaluate(() => { const b = document.querySelector('.ivm .ivm-stale'); return b ? `hidden=${b.hidden} badge=${(b.querySelector('.tbadge') || {}).textContent} parent=${b.parentElement.className}` : 'none'; });
  const touch = async k => page.evaluate(async k => { const fs = app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Notes/')).slice(0, k); for (const f of fs) await app.vault.append(f, '\n'); }, k);
  console.log('start:', await st());
  await touch(3); await sleep(800); console.log('after 3:', await st());
  await page.evaluate(async () => { const fs = app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Notes/')).slice(3, 7); for (const f of fs) await app.vault.append(f, '\n'); }); await sleep(800);
  console.log('after 7:', await st()); await shot('stale5');
  await page.locator('.ivm .ivm-stale').click(); await sleep(4000); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  console.log('after rescan:', await st());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
