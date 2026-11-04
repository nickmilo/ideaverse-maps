module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  const list = () => page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip, .ivm #vmorepop > .vfold')].filter(c => !c.hidden).map(c => c.classList.contains('vfold') ? '|' : c.textContent.replace(/\s+/g, ' ').trim()).join(' · '));
  await page.locator('.ivm #vmore').first().click(); await sleep(400); console.log('before', await list());
  const box = async id => page.evaluate(id => { const r = document.querySelector('.ivm #vmorepop > #' + id).getBoundingClientRect(); return [r.x + 60, r.y + r.height / 2]; }, id);
  const a = await box('golincal'), b = await box('gogravity');
  await page.mouse.move(a[0], a[1]); await page.mouse.down(); for (let q = 1; q <= 10; q++) { await page.mouse.move(a[0], a[1] + (b[1] - 6 - a[1]) * q / 10); await sleep(40); } await sleep(200); await shot('mo-drag'); await page.mouse.up(); await sleep(500);
  console.log('after', await list()); await shot('mo-after');
  await page.evaluate(() => document.querySelector('.ivm #vmorepop .vresetb').click()); await sleep(300); await shot('mo-confirm');
  await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop .vresetc button')][0].click()); await sleep(300); console.log('reset', await list());
  console.log('errors:', errs.join(' | ') || 'none');
};
