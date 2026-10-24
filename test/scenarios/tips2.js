module.exports = async ({ page, sleep }) => {
  await sleep(2000);
  const el = await page.evaluate(() => { const e = [...document.querySelectorAll('[aria-label]')].find(x => x.closest('.workspace-tab-header-container, .view-header, .side-dock-ribbon') && x.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2, e.getAttribute('aria-label')]; });
  console.log('native el:', JSON.stringify(el));
  if (el) { await page.mouse.move(el[0] - 30, el[1]); await page.mouse.move(el[0], el[1], { steps: 4 }); for (let i = 0; i < 40; i++) { await sleep(50); const t = await page.evaluate(() => { const x = document.querySelector('.tooltip'); return x ? x.textContent : null; }); if (t) { console.log('native tooltip after', (i+1)*50, 'ms:', t); break; } } }
};
