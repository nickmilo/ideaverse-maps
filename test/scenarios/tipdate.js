module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(3000);
  const cvr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const pt = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at('Atlas/Things/Pace Layers.md'));
  await page.mouse.move(cvr.x + pt[0] - 3, cvr.y + pt[1]); await sleep(300); await page.mouse.move(cvr.x + pt[0], cvr.y + pt[1]); await sleep(900);
  console.log('tip', await page.evaluate(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.innerText.replace(/\n/g, ' ⏎ ') : 'hidden'; }));
  await page.screenshot({ path: process.env.SHOTS + '/Hover-month-year.png', clip: { x: cvr.x + pt[0] - 60, y: cvr.y + pt[1] - 30, width: 560, height: 90 } });
};
