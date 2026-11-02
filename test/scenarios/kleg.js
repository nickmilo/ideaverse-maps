module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); console.log('view', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._view()));
  await page.evaluate(() => { const lg = document.querySelector('.ivm #legend'); if (lg && lg.classList.contains('collapsed')) lg.click(); }); await sleep(800);
  await page.evaluate(() => { const d = document.querySelector('.ivm #legend .lgabout'); }); await sleep(500);
  const r = await page.evaluate(() => document.querySelector('.ivm #legend').getBoundingClientRect().toJSON()); console.log('legend', JSON.stringify(r), 'rows', await page.evaluate(() => document.querySelectorAll('.ivm .kleg .klrow').length));
  await page.screenshot({ path: process.env.SHOTS + '/kleg.png', clip: { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: Math.min(420, r.width + 8), height: r.height + 8 } });
  console.log('errors:', errs.join(' | ') || 'none');
};
