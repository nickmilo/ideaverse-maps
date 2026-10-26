// A base on Linear Calendar with many names: tilted and moved names
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(6000);
  await page.evaluate(() => document.querySelector('.ivm-bases #vmore').click()); await sleep(300);
  await page.evaluate(() => { document.querySelectorAll('.ivm-bases #vmorepop details').forEach(d => d.open = true); document.querySelector('.ivm-bases #golincal').click(); }); await sleep(2500);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm-bases canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  for (const z of [1, 2]) { await page.mouse.move(box[0] + box[2] * .5, box[1] + box[3] * .85); await page.mouse.wheel(0, -250); await sleep(300); } await sleep(1000);
  await shot('dense');
  console.log('errors:', errs.join(' | ') || 'none');
};
