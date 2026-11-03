module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const M = () => page.evaluate(() => { const s = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck(); return [+s.yaw.toFixed(3), +s.pitch.toFixed(3)]; });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const a = await M(); await page.mouse.move(200, 750); await page.mouse.down(); for (let i = 0; i < 10; i++) { await page.mouse.move(200 + i * 10, 750); await sleep(16); } await page.mouse.up(); await sleep(200); const b = await M();
  console.log('drag right: dyaw', (b[0] - a[0]).toFixed(3));
};
