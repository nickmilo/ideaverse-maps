// Space-Time: time left to right, top folders as rows; By is fixed to Time there and comes back after
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const run = js => page.evaluate(new Function(js));
  await q('#xseg button[data-x="ace"]').click(); await sleep(1200);
  await q('#vseg button[data-v="spacetime"]').click(); await sleep(2200); await shot('st');
  console.log('view', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| time pressed', await q('#xseg button[data-x="time"]').getAttribute('aria-pressed'));
  await q('#xseg button[data-x="ace"]').click({ force: true }); await sleep(600);
  console.log('ace click ignored:', await q('#xseg button[data-x="time"]').getAttribute('aria-pressed'));
  const lh = await run(`return ${D}.__ivLHall()`); await page.mouse.click(lh[1][0] + 5, lh[1][1] + 6); await sleep(1500); await shot('st-note');
  await run(D + '.__ivSense.set(Math.round(' + D + '.__ivSense.steps() * .6))'); await sleep(1800); await shot('st-lapse');
  await run(D + '.__ivSense.set(' + D + '.__ivSense.steps() - 1)'); await sleep(500);
  await q('#vseg button[data-v="emergence"]').click(); await sleep(1500);
  console.log('back on Emergence, ace pressed:', await q('#xseg button[data-x="ace"]').getAttribute('aria-pressed'));
  await q('#vseg button[data-v="spacetime"]').click(); await sleep(1500);
  await page.evaluate(() => require('@electron/remote').getCurrentWindow().setSize(700, 1000)); await sleep(1500); await shot('st-narrow');
};
