module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 950); await page.keyboard.press('p');
  await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; window.__ck = []; const f = () => { const s = m._ck(); window.__ck.push([performance.now(), s.P.slice(), s.c, !!s.settle, s.yaw, s.pitch, s.off]); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await sleep(45000);
  const tr = await page.evaluate(() => window.__ck); require('fs').writeFileSync(process.env.SHOTS + '/trace.json', JSON.stringify(tr));
  console.log('trail:', await page.evaluate(() => [...document.querySelectorAll('.ivm #trail .crumb, .ivm .trail button')].map(b => b.textContent.trim()).slice(0, 8).join(' | ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
