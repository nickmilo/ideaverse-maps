// 0.8.24: adding a link while writing must not move the camera (Nick saw a zoom stutter on Emergence)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('1'); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 900); await shot('cam-before');
  const P = 'Atlas/Things/Pace Layers.md', orig = await page.evaluate(p => app.vault.read(app.vault.getAbstractFileByPath(p)), P);
  await page.evaluate(() => { window.__cam = []; const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; const t0 = performance.now(); const f = () => { window.__cam.push([Math.round(performance.now() - t0)].concat(m._cam().map(v => +v.toFixed(3)))); if (performance.now() - t0 < 3500) requestAnimationFrame(f); }; f(); });
  await page.evaluate(p => app.vault.process(app.vault.getAbstractFileByPath(p), t => t + '\n\nLIVETEST [[Aikido]] [[Affordances]]\n'), P);
  await sleep(1000); await page.mouse.move(5, 900); await shot('cam-flare'); await sleep(2800);
  const cam = await page.evaluate(() => window.__cam); const ks = new Set(cam.map(c => c[1])), txs = cam.map(c => c[2]);
  console.log('frames', cam.length, 'distinct k', ks.size, 'tx range', Math.min(...txs), Math.max(...txs), 'pace', JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at('Atlas/Things/Pace Layers.md'))));
  await page.evaluate(([p, o]) => app.vault.process(app.vault.getAbstractFileByPath(p), () => o), [P, orig]); await sleep(3000);
  console.log('errors:', errs.join(' | ') || 'none');
};
