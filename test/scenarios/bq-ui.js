// Filter → Bases: the list, checking a view, a view that follows the picked note, and one the map can't read
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(2500);
  await page.evaluate(() => { for (const d of document.querySelectorAll('.ivm .blist details')) if (/Two views|Context/.test(d.textContent)) d.open = true; }); await sleep(300);
  await page.mouse.move(1599, 900); await shot('bq-list');
  const count = () => page.evaluate(() => document.querySelector('.ivm #ncount, .ivm .counts, .ivm .stats') ? document.querySelector('.ivm .bqn').textContent + ' | ' + (document.querySelector('.ivm #stats') || {}).textContent : '');
  await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm .blist label.bqv')].find(l => l.textContent.startsWith('Maps')); l.querySelector('input').click(); }); await sleep(2500);
  console.log('after Maps view:', await count(), '| badge', await page.evaluate(() => document.querySelector('.ivm #filtbtn .tbadge').textContent));
  await shot('bq-maps');
  console.log('odd view row:', await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm .blist label.bqv')].find(l => l.textContent.startsWith('Odd')); return l ? l.textContent + ' disabled=' + l.querySelector('input').disabled + ' title=' + l.title : 'none'; }));
  await page.evaluate(() => document.querySelector('.ivm .bcol .facts .chip').click()); await sleep(1500);
  await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm .blist label.bqv')].find(l => l.textContent.startsWith('Links here')); l.querySelector('input').click(); }); await sleep(2000);
  console.log('context, no note:', await page.evaluate(() => document.querySelector('.ivm .bqst').textContent));
  await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ivm header .search input').first().fill('Story wonder story'); await sleep(500); await page.keyboard.press('Enter'); await sleep(3000);
  console.log('context, Home picked:', await page.evaluate(() => document.querySelector('.ivm .bqn').textContent), '| Home backlinks', await page.evaluate(() => { const b = app.metadataCache.resolvedLinks; let c = 0; for (const s in b) if (b[s][Object.keys(b[s]).find(k => k.endsWith('Story wonder story.md'))]) c++; return c; }));
  await shot('bq-context');
  console.log('errors:', errs.join(' | ') || 'none');
};
