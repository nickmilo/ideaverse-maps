// a saved view remembers where the time-lapse stands (and all time when it's cleared)
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const run = js => page.evaluate(new Function(js));
  const state = async () => (await q('#tldate').textContent()) + ' | t=' + (await run('return ' + D + '.__ivSense.t()'));
  await q('#vseg button[data-v="gravity"]').click(); await sleep(1500);
  await q('#tlstep button[data-s="week"]').click(); await sleep(300);
  await run(D + '.__ivSense.set(200)'); await sleep(1200);
  console.log('set to:', await state());
  await run(`const v = ${D}.__ivViews; const s = v.snap(); s.name = 'Mid'; v.list().push(s);`);
  await q('#tlall').click(); await sleep(800);
  await run(`const v = ${D}.__ivViews; const s = v.snap(); s.name = 'All'; v.list().push(s);`);
  await q('#tlstep button[data-s="month"]').click(); await q('#vseg button[data-v="emergence"]').click(); await sleep(1500);
  console.log('before apply:', await state());
  await run(`const v = ${D}.__ivViews; v.apply(v.list().find(x => x.name === 'Mid'));`); await sleep(2000);
  console.log('applied Mid:', await state(), '| view:', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| step week:', await q('#tlstep button[data-s="week"]').getAttribute('aria-pressed'));
  await shot('view-mid');
  await run(`const v = ${D}.__ivViews; v.apply(v.list().find(x => x.name === 'All'));`); await sleep(1500);
  console.log('applied All:', await state());
  await q('#viewbtn').click(); await sleep(300);
  console.log('list:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vlist .vgo span')].map(e => e.textContent).join(' || ')));
};
