// Phone: emulate mobile at phone size; open the map, tap a note, open panels
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile && app.emulateMobile(true)); await sleep(4000);
  console.log('mobile:', await page.evaluate(() => document.body.classList.contains('is-mobile')), '| plugin loaded:', await page.evaluate(() => !!app.plugins.plugins['ideaverse-maps']));
  await page.evaluate(async () => { if (!app.plugins.plugins['ideaverse-maps']) await app.plugins.enablePlugin('ideaverse-maps'); });
  await sleep(1000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500); await shot('m-1');
  const vp = page.viewportSize() || await page.evaluate(() => ({ width: innerWidth, height: innerHeight })); console.log('viewport', JSON.stringify(vp));
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const L = lh.filter(l => l[1] > 120 && l[1] < 500); if (L.length) { lh[0] = L[0]; await page.touchscreen.tap(box[0] + lh[0][0] + 4, box[1] + lh[0][1] + 6).catch(async () => page.mouse.click(box[0] + lh[0][0] + 4, box[1] + lh[0][1] + 6)); await sleep(1500); }
  await shot('m-tap');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
