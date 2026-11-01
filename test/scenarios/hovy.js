module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  const p = await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const r = v.containerEl.querySelector('.ivm canvas').getBoundingClientRect(); const a = v.map._at('Atlas/Things/Triangulation.md'); return [r.left + a[0], r.top + a[1]]; });
  await page.mouse.move(p[0], p[1]); await sleep(1200); await page.screenshot({ path: require('path').join(process.env.SHOTS, 'hov.png'), clip: { x: p[0] - 200, y: p[1] - 100, width: 400, height: 200 } });
  await page.mouse.click(p[0], p[1]); await sleep(1500); await page.mouse.move(5, 900); await sleep(800); await page.screenshot({ path: require('path').join(process.env.SHOTS, 'sel.png'), clip: { x: p[0] - 200, y: p[1] - 100, width: 400, height: 200 } });
  console.log('errors:', errs.join(' | ') || 'none');
};
