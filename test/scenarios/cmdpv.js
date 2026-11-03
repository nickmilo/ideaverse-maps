module.exports = async ({ page, sleep, shot }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const p = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, c = document.querySelector('.ivm #cv').getBoundingClientRect(), a = m._at('Atlas/Things/Pace Layers.md'); return [a[0] + c.left, a[1] + c.top]; });
  await page.mouse.move(p[0], p[1]); await sleep(400); await page.keyboard.down('Meta'); await sleep(200); await page.mouse.move(p[0] + 1, p[1]); await sleep(800); await shot('cmd');
  console.log('pv', await page.evaluate(() => { const e = document.querySelector('.ivm .hudpv'); return e ? [e.hidden, e.querySelector('.pvt').textContent] : null; }));
  await page.keyboard.up('Meta'); await sleep(300); console.log('after', await page.evaluate(() => { const e = document.querySelector('.ivm .hudpv'); return e ? e.hidden : null; }));
};
