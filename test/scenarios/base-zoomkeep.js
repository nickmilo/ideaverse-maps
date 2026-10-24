module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Movies.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(6000);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm-bases canvas').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.move(box[0], box[1]); for (let q = 0; q < 6; q++) { await page.mouse.wheel(0, -200); await sleep(80); } await sleep(1200);
  await shot('zk-in');
  // edit a note in the base (Bases re-queries), and one outside it
  await page.evaluate(async () => { for (const p of ['Atlas/Things/Movie 3.md', 'Home.md']) { const f = app.vault.getAbstractFileByPath(p); const t = await app.vault.read(f); await app.vault.modify(f, t + '\n'); } }); await sleep(4000);
  await shot('zk-after');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
