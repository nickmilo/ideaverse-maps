module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.evaluate(() => document.querySelector('.ivm #gocompass').click()); await sleep(2500);
  const g = await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header button')].find(x => /settings$/.test(x.getAttribute('aria-label') || '')); if (!b) return 'no gear'; const w = b.closest('[hidden]'); if (w) return 'gear hidden'; b.click(); return 'clicked'; });
  await sleep(800); console.log('gear', g, 'relevance row visible', await page.evaluate(() => { const r = document.querySelector('.ivm .cmpany'); return !!r && !r.hidden && r.getBoundingClientRect().height > 0; }));
  await shot('cmp-gear'); console.log('errors:', errs.join(' | ') || 'none');
};
