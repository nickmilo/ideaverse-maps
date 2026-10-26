// A click on a note on Emergence: the note drifts a little toward the middle, no zoom
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const m = () => page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._scr(p), 'Home.md');
  const a = await m(); await shot('nudge-before');
  await page.mouse.click(box[0] + a[0], box[1] + a[1]); await sleep(1500);
  const b = await m(); console.log('Home before', a.slice(0, 2).map(Math.round), 'after', b.slice(0, 2).map(Math.round), 'canvas', box.map(Math.round));
  await shot('nudge-after');
  console.log('errors:', errs.join(' | ') || 'none');
};
