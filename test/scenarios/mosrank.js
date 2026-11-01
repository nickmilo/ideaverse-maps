// 0.8.25: Mosaic → Ranked
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.evaluate(() => document.querySelector('.ivm #gomosaic').click()); await sleep(3000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed')) lg.click(); });
  await page.evaluate(() => document.querySelector('.ivm #mosseg button[data-ms="rank"]').click()); await sleep(3000); await page.mouse.move(5, 900); await shot('mos-rank');
  const m = () => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map;
  console.log('LYT Book Home at', JSON.stringify(await page.evaluate(() => { const f = app.vault.getFiles().find(f => f.basename === 'LYT Book Home'); return f ? app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._at(f.path) : null; })));
  await page.mouse.wheel(0, -600); await sleep(800); await page.mouse.move(1200, 200); await page.mouse.wheel(0, -900); await sleep(1500); await page.mouse.move(5, 900); await shot('mos-rank-top');
  console.log('errors:', errs.join(' | ') || 'none');
};
