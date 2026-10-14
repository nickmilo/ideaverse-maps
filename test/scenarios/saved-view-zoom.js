// a saved view brings back its zoom and position: across maps, with the time-lapse mid-way, and Starfield's 3D angle
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const run = js => page.evaluate(new Function(js));
  const cam = () => run(`const s = ${D}.__ivViews.snap(); return JSON.stringify(s.cam) + ' view ' + s.view;`);
  const zoom = async () => { const box = await q('canvas').boundingBox(); await page.mouse.move(box.x + box.width * .3, box.y + box.height * .4); for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -300); await sleep(200); } await sleep(1200); };
  const savev = async n => run(`const v = ${D}.__ivViews; const s = v.snap(); s.name = '${n}'; v.list().push(s);`);
  const apply = async n => { await run(`const v = ${D}.__ivViews; v.apply(v.list().find(x => x.name === '${n}'));`); await sleep(3000); };
  // A: gravity zoomed, applied from emergence
  await q('#vseg button[data-v="gravity"]').click(); await sleep(2000); await zoom(); console.log('A saved', await cam()); await savev('A');
  await q('#vseg button[data-v="emergence"]').click(); await sleep(2000); await apply('A'); console.log('A applied', await cam());
  // B: emergence zoomed with time-lapse mid
  await q('#vseg button[data-v="emergence"]').click(); await sleep(2000); await run(D + '.__ivSense.set(60)'); await sleep(1500); await zoom(); console.log('B saved', await cam()); await savev('B');
  await page.evaluate(() => document.querySelector('.ivm #tlall').click()); await page.evaluate(() => document.querySelector('.ivm #zfit').click()); await sleep(1500); await apply('B'); console.log('B applied', await cam());
  // C: sense zoomed
  await q('#vseg button[data-v="sense"]').click(); await sleep(2000); await zoom(); console.log('C saved', await cam()); await savev('C');
  await q('#vseg button[data-v="stars"]').click(); await sleep(2000); await apply('C'); console.log('C applied', await cam());
  // D: starfield 3D orbited + zoomed, applied from 2D
  await q('#vseg button[data-v="stars"]').click(); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(2500); await page.evaluate(() => document.body.click());
  const box = await q('canvas').boundingBox(); await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .6, box.y + box.height * .55, { steps: 8 }); await page.mouse.up(); await sleep(500);
  await zoom(); const s3 = await run(`return JSON.stringify(${D}.__ivViews.snap().s3d)`); console.log('D saved', await cam(), s3); await savev('D');
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="2d"]').click()); await sleep(2000); await page.evaluate(() => document.body.click());
  await q('#vseg button[data-v="emergence"]').click(); await sleep(2000);
  await apply('D'); console.log('D applied', await cam(), await run(`return JSON.stringify(${D}.__ivViews.snap().s3d)`));
  await shot('d-applied');
};