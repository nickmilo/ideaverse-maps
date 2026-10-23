// Chord (experimental, under ⋯ → Experimental → Sketches → Unfinished): every note on a ring by kind, links across the middle
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  await q('#vmore').click(); await sleep(300);
  for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gochord').click(); await sleep(2500); await shot('chord');
  console.log('view', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| chord tab hidden', !(await q('#vseg button[data-v="chord"]').isVisible()));
  const lh = await page.evaluate(new Function(`return ${D}.__ivLHall()`)); console.log('labels', lh.length);
  if (lh.length) { await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1500); await shot('chord-note'); }
  await page.evaluate(new Function(D + '.__ivSense.set(Math.round(' + D + '.__ivSense.steps() * .6))')); await sleep(1800); await shot('chord-lapse');
};
