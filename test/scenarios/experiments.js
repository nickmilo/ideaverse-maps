// the experimental maps under ⋯ → Experimental → Sketches → Unfinished: open each, pick a note, take a picture
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const only = (process.env.ONLY || 'quincunx,shelf,tree,treemap,skyline').split(',');
  for (const v of only) {
    await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
    await q('#go' + v).click(); await sleep(2500); await page.mouse.move(5, 500); await sleep(300); await shot('x-' + v);
    const lh = await page.evaluate(new Function(`return ${D}.__ivLHall()`));
    if (lh.length) { await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1500); await shot('x-' + v + '-note'); }
    console.log(v, '| view', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| labels', lh.length, '| selected', await page.evaluate(() => { const a = document.querySelector('.ivm aside'); return a && !a.hidden ? a.querySelector('h2')?.textContent : '-'; }));
    await page.evaluate(() => document.querySelector('.ivm aside #dx')?.click()); await sleep(400);
  }
};
