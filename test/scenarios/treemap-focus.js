// Treemap: select a note, then focus it; link lines and end nodes draw above the boxes
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); await q('#mexp > summary').click(); await sleep(200);
  await q('#gotreemap').click(); await sleep(2500);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top]; });
  const m = (await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivShelfMaps())).sort((a, b) => b[2] - a[2])[0];
  await page.mouse.click(box[0] + m[0], box[1] + m[1]); await sleep(900); await shot('tm-sel');
  await q('#focusmode').click(); await sleep(400); await page.mouse.click(box[0] + m[0], box[1] + m[1]); await sleep(2200); await shot('tm-focus');
};
