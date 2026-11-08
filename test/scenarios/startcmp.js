// the map opening straight on a map (Compass, Arena), with tabs saved (the blank map on 0.8.33)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); console.log('view', await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; return v.map ? v.map._view() : 'NO MAP'; }), 'orbs', await page.evaluate(() => document.querySelectorAll('.ivm .ivm-orb').length));
  await shot('start-compass'); console.log('errors:', errs.join(' | ') || 'none');
};
