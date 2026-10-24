// Spiral / Lifeline → Layout → Years from – to
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#golifeline').click(); await sleep(2500);
  console.log('range visible:', await q('#lrctl').isVisible(), await q('#lr0').inputValue(), '–', await q('#lr1').inputValue());
  await page.evaluate(s => __ivReveal(s), '#lr0'); await sleep(250); await q('#lr0').selectOption('2022'); await sleep(1800); await shot('ll-range');
  for (let i = 0; i < 12; i++) { await page.mouse.move(900, 600); await page.mouse.wheel(0, 300); await sleep(60); } await sleep(500); await shot('ll-zoomout');
  await q('#vmore').click(); await sleep(300); await q('#gospiral').click(); await sleep(2500); await shot('sp-range');
  console.log('spiral range:', await q('#lr0').inputValue(), '–', await q('#lr1').inputValue());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
