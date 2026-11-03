module.exports = async ({ page, sleep, shot }) => {
  await page.setViewportSize({ width: +(process.env.VW||430), height: +(process.env.VHH||900) }); await page.evaluate(() => app.emulateMobile(true)); await sleep(3000);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; const i = [...Array(1)].map(() => 0); });
  await page.evaluate(() => { const q = document.querySelector('.ivm #q'); q.value = 'Pace Layers'; q.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(800); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await sleep(1500);
  await page.evaluate(() => { const d = document.querySelector('.ivm #drawer'); if (d) d.hidden = true; document.activeElement && document.activeElement.blur(); window.dispatchEvent(new Event('resize')); }); await sleep(2000); await shot('phone');
};
