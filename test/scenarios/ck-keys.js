module.exports = async ({ page, sleep, shot }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const M = () => page.evaluate(() => { const s = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck(); return [s.c, Math.round(s.dist), s.P.map(Math.round).join(',')]; });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.mouse.move(700, 400);
  console.log('start', JSON.stringify(await M())); await shot('k0');
  for (let s = 0; s < 6; s++) { await page.keyboard.down('q'); await sleep(1500); await page.keyboard.up('q'); console.log('orbit Q', s, JSON.stringify(await M())); await shot('q' + s); }
  await page.keyboard.down('e'); await sleep(600); await page.keyboard.up('e'); await sleep(300); console.log('fwd E', JSON.stringify(await M()));
  await page.keyboard.down('d'); await sleep(600); await page.keyboard.up('d'); await sleep(300); console.log('back D', JSON.stringify(await M()));
};
