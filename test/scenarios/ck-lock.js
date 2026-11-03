module.exports = async ({ page, sleep, shot }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const M = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck());
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  let hit = null; for (let y = 200; y < 700 && !hit; y += 23) for (let x = 300; x < 1000 && !hit; x += 23) { await page.mouse.move(x, y); await sleep(170); const s = await M(); if (s.star >= 0 && s.star !== s.lock) hit = [x, y, s.star]; }
  console.log('hover', JSON.stringify(hit)); if (!hit) return;
  await page.mouse.click(hit[0], hit[1]); await sleep(300); const s = await M(); console.log('after click lock', s.lock, 'expected', hit[2]); await shot('locked');
};
