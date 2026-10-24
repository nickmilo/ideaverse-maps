module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="paper"]').click());
  await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(300); await page.evaluate(() => { document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true); }); await sleep(300);
  await page.locator('.ivm #vmorepop').screenshot({ path: process.env.SHOTS + '/more-spec.png' });
  await page.evaluate(() => document.querySelector('#gopeople').click()); await sleep(1500);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/') && f.basename !== 'Films').map(f => f.path)); }); await sleep(2500);
  // click the biggest star (a person with no note)
  const pos = await page.evaluate(() => { const c = document.querySelector('.ivm canvas').getBoundingClientRect(); return null; });
  const b = await page.locator('.ivm canvas').first().boundingBox();
  // find a hub by scanning for the hot cursor along a grid
  let hit = null; for (let y = b.y + 40; y < b.y + b.height - 40 && !hit; y += 12) for (let x = b.x + 200; x < b.x + b.width - 100; x += 12) { await page.mouse.move(x, y); if (await page.evaluate(() => document.querySelector('.ivm canvas').classList.contains('hot'))) { hit = [x, y]; break; } }
  console.log('hub at', hit); if (hit) { await page.mouse.click(hit[0], hit[1]); await sleep(1200); await page.mouse.move(1599, 300); await shot('ppl-pick'); await page.mouse.click(hit[0], hit[1]); await sleep(600); }
  // focus mode on a film, one step then two
  await page.evaluate(() => document.querySelector('.ivm #focusmode').click()); await sleep(300);
  await page.evaluate(() => { const f = app.vault.getMarkdownFiles().find(f => f.path.startsWith('Atlas/Films/') && f.basename !== 'Films'); app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(f.path); }); await sleep(2500);
  await page.evaluate(() => { const b = document.querySelector('.ivm aside #dcol'); b && b.click(); }); await sleep(800); await page.evaluate(() => document.querySelector('.ivm #zfit').click()); await sleep(1500);
  await page.mouse.move(1599, 300); await shot('ppl-focus1');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm .focusbar button, .ivm #focusbar button')].find(b => b.textContent.trim() === '2'); b && b.click(); }); await sleep(1500); await page.mouse.move(1599, 300); await shot('ppl-focus2');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
