module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.locator('.ivm #q').fill('Idea Emergence'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const [cl, ct] = await page.evaluate(() => { const c = document.querySelector('.ivm #cv').getBoundingClientRect(); return [c.left, c.top]; });
  const T = () => page.evaluate(() => { const b = document.querySelector('.ivm .hudtab'); if (!b) return 'none'; const r = b.getBoundingClientRect(); return JSON.stringify([b.hidden, b.textContent, Math.round(r.left), Math.round(r.top), Math.round(r.width), getComputedStyle(b).display]); });
  await page.mouse.move(cl + 950, ct + 400); for (let q = 0; q < 4; q++) { await page.mouse.wheel(0, 120); await sleep(80); }
  await page.mouse.move(cl + 960, ct + 300); await sleep(700); await shot('hud-hover');
  await page.mouse.click(cl + 1000, ct + 65); await sleep(600); await shot('hud-col'); console.log('tab', await T());
};
