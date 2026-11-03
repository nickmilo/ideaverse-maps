module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/tab group|AppWorker/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500); if (process.env.EMOT) await page.evaluate(() => { window.__EMO = {'Atlas/People':'🧑','Calendar':'📅','Atlas/Things':'💡','Efforts':'🛠️'}; });
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lg = document.querySelector('.ivm #legend'); if (lg && !lg.classList.contains('collapsed') && !process.env.KEEPLEG) lg.click(); });
  await page.locator('.ivm #q').fill(process.env.NOTE || 'Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; if (m._setEmo && window.__EMO) m._setEmo(window.__EMO); });
  await page.mouse.move(560, 300); await sleep(500); await shot('sf-start');
  await page.keyboard.down('s'); await sleep(1500); await page.keyboard.up('s'); await sleep(1500); await shot('sf-back');
  await page.keyboard.down('s'); await sleep(3000); await page.keyboard.up('s'); await sleep(2500); await shot('sf-far');
  await page.keyboard.press(' '); for (let q = 0; q < 6; q++) { await sleep(700); await shot('sf-auto' + q); }
  await sleep(3000); await shot('sf-end');
  console.log('errors:', errs.join(' | ') || 'none');
};
