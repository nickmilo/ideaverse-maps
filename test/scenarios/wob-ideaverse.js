module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  for (const [name, go] of [['ideaverse', () => document.querySelector('.ivm #vseg button[data-v="ideaverse"]').click()], ['stars3d', () => document.querySelector('.ivm #vseg button[data-v="stars"]').click()]]) {
    await page.evaluate(go); await sleep(5000);
    await page.evaluate(() => { const t = document.querySelector('.ivm #anitab'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); }); await sleep(400);
    for (const d of ['earth', 'spin', 'lyt', 'slow']) { await page.evaluate(d => { const b = document.querySelector(`.ivm #driftseg button[data-d="${d}"]`); b && b.click(); }, d); await sleep(200);
      console.log(name, d, await page.evaluate(() => { const l = document.querySelector('.ivm .dwob'); const r = l.getBoundingClientRect(); return [getComputedStyle(l).display, l.hidden, r.width | 0, r.height | 0, l.parentElement.id, getComputedStyle(l.parentElement).display].join(','); })); }
    await page.evaluate(() => document.querySelector('.ivm #driftseg button[data-d="spin"]').click()); await sleep(200); await page.mouse.move(1599, 300); await shot('wob-' + name);
  }
  console.log('errors:', errs.join(' | ') || 'none');
};
