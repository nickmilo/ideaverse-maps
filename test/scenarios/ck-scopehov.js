module.exports = async ({ page, sleep, shot }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const M = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck());
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(180, 455); await sleep(700); await shot('band');
  const s = await M(); const cvr = await page.evaluate(() => { const r = document.querySelector('.ivm .ivm-cockpit canvas').getBoundingClientRect(); return [r.left, r.top]; });
  const dot = s.dots.find(q => q[2] !== s.lock); console.log('dots', s.dots.length); if (!dot) return;
  await page.mouse.move(cvr[0] + dot[0], cvr[1] + dot[1]); await sleep(400); await shot('scope');
  await page.mouse.click(cvr[0] + dot[0], cvr[1] + dot[1]); await sleep(300); const s2 = await M(); console.log('lock', s2.lock, 'want', dot[2]);
};
