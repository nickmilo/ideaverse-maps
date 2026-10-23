// ⋯ → Experimental → Sketches → Linear → Linear Calendar / Spiral / Lifeline
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const open = async () => { await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); } };
  await open(); await shot('lin-menu'); await q('#golincal').click(); await sleep(2500); await shot('lin-cal');
  console.log('lcctl visible:', await q('#lcctl').isVisible(), '| year:', await q('#lcyear').textContent());
  await q('#lcprev').click(); await sleep(1800); console.log('after ‹:', await q('#lcyear').textContent()); await shot('lin-cal-prev');
  await q('#lcseg button[data-ly="all"]').click(); await sleep(2000); await shot('lin-cal-all');
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  await page.mouse.move(box[0] + box[2]*.6, box[1] + box[3]*.5); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -300); await sleep(80); } await sleep(500); await shot('lin-cal-scrolled');
  await q('#lcseg button[data-ly="one"]').click(); await sleep(1000);
  await open(); await q('#gospiral').click(); await sleep(2500); await shot('lin-spiral');
  await open(); await q('#golifeline').click(); await sleep(2500); await shot('lin-lifeline');
  for (let i = 0; i < 4; i++) { await page.mouse.move(box[0] + box[2]*.7, box[1] + box[3]*.55); await page.mouse.wheel(0, -250); await sleep(100); } await sleep(600); await shot('lin-lifeline-zoom');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
