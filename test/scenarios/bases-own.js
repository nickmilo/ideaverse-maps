// A base keeps its own map settings in its .base file; the main map tab is unaffected
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (/Ideaverse/.test(m.text())) errs.push(m.text()); });
  await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('bases')) l.detach(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const mainView = () => page.evaluate(() => app.plugins.plugins['ideaverse-maps'].data.state['iv-view']);
  console.log('main tab view before:', await mainView());
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(5000);
  await page.locator('.ivm-bases #vseg button[data-v="gravity"]:visible').first().click(); await sleep(5000);
  console.log('own:', await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews].find(v => v.hostEl.offsetParent); return v ? JSON.stringify({own: Object.keys(v.own || {}), cfg: !!v.config}) : 'no view'; }));
  console.log('base map view:', await page.evaluate(() => [...document.querySelectorAll('.ivm-bases .ivm')].find(e => e.offsetParent)?.dataset.view), '| main tab pref after:', await mainView());
  const file = await page.evaluate(async () => app.vault.read(app.vault.getAbstractFileByPath('Maps Probe.base'))); console.log('base file has settings:', /maps-of-the-ideaverse:[\s\S]*iv-view: gravity/.test(file));
  // close and reopen the base: it comes back on Gravity
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('bases')) l.detach(); }); await sleep(800);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); await app.workspace.getLeaf('tab').openFile(f); }); await sleep(5000);
  console.log('reopened base view:', await page.evaluate(() => [...document.querySelectorAll('.ivm-bases .ivm')].find(e => e.offsetParent)?.dataset.view)); await shot('base-own');
  const t = await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Maps Probe.base'); const t = await app.vault.read(f); await app.vault.modify(f, t.replace(/\n    maps-of-the-ideaverse:[\s\S]*$/, '\n')); return t.length; });
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
