// Tucking the top bar away keeps the zoom and the notes where they were on screen
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top]; });
  for (let z = 0; z < 3; z++) { await page.mouse.move(box[0] + 400, box[1] + 300); await page.mouse.wheel(0, -300); await sleep(300); } await sleep(800);
  const at = () => page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(), a = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._scr('Home.md'); return [Math.round(r.left + a[0]), Math.round(r.top + a[1])]; });
  const a = await at(); await page.evaluate(() => document.querySelector('.ivm .hcol').click()); await sleep(800); const b = await at();
  await page.evaluate(() => document.querySelector('.ivm .htab').click()); await sleep(800); const c = await at();
  console.log('Home on screen: before', a, 'bar tucked', b, 'bar back', c);
  console.log('errors:', errs.join(' | ') || 'none');
};
