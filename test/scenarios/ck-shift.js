module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const orbs = () => page.evaluate(() => document.querySelector('.ivm .ivm-orbs').children.length);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  console.log('orbs before', await orbs());
  const M = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck());
  const cvr = await page.evaluate(() => { const r = document.querySelector('.ivm .ivm-cockpit canvas').getBoundingClientRect(); return [r.left, r.top]; });
  const s = await M(); const dot = s.dots.find(q => q[2] !== s.lock);
  await page.mouse.move(cvr[0] + dot[0], cvr[1] + dot[1]); await sleep(300); await page.keyboard.down('Shift'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Shift'); await sleep(2500);
  console.log('orbs after', await orbs(), 'cockpit now', (await M()).c, 'wanted', dot[2]);
};
