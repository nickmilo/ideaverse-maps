// every map's gear, after the tighter look
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000);
  for (const [k, nm] of [['1', 'emergence'], ['4', 'sense'], ['5', 'gravity'], ['6', 'graph'], ['7', 'treemap'], ['8', 'mosaic'], ['9', 'shelf'], ['0', 'lincal'], ['[', 'chord'], ['-', 'tesla']]) {
    await page.keyboard.press('Escape'); await page.keyboard.press(k); await sleep(2500);
    const g = page.locator('.ivm #mapsetbtn'); if (!(await g.isVisible())) { console.log(nm, 'no gear'); continue; }
    await g.click(); await sleep(600);
    const box = await page.locator('.ivm #mapopts').boundingBox(); await page.screenshot({ path: require('path').join(process.env.SHOTS, 'g-' + nm + '.png'), clip: { x: box.x - 4, y: box.y - 4, width: Math.min(box.width + 8, 700), height: Math.min(box.height + 8, 800) } }); console.log(nm, 'ok');
    await page.keyboard.press('Escape'); await sleep(300); }
  await page.evaluate(() => document.querySelector('.ivm #scorebtn').click()); await sleep(800); await shot('g-scoring');
  console.log('errors:', errs.join(' | ') || 'none');
};
