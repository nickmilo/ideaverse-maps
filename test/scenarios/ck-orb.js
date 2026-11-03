module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const M = () => page.evaluate(() => { const s = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck(); return [s.off, Math.round(s.dist)]; });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.mouse.move(700, 400);
  for (const k of ['s', 'f', 'e', 'd', 'x', 'v', 'r', 'w']) { await page.keyboard.down(k); await sleep(700); await page.keyboard.up(k); await sleep(400); console.log(k, JSON.stringify(await M())); }
};
