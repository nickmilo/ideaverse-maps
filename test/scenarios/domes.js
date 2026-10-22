// the two domes (experimental, under ⋯ → Experimental): stand inside Space-Time and Gravity, look around, pick a note, play the time-lapse
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const run = js => page.evaluate(new Function(js));
  const menu = async id => { await q('#vmore').click(); await sleep(300); if (!(await q(id).isVisible())) await q('#mexp summary').click(); await sleep(200); await q(id).click(); await sleep(2200); };
  const drag = async (dx, dy) => { const b = await q('canvas').boundingBox(); const x = b.x + b.width*.5, y = b.y + b.height*.6; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 10 }); await page.mouse.up(); await sleep(600); };
  await menu('#gostd'); await shot('dome-st');
  console.log('dome attr', await page.evaluate(() => document.querySelector('.ivm').dataset.dome), 'labels', (await run(`return ${D}.__ivLHall()`)).length);
  await drag(500, 0); await shot('dome-st-turned');
  const lh = await run(`return ${D}.__ivLHall()`); if (lh.length) { await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1500); }
  await shot('dome-st-note');
  await q('#q').click(); await q('#q').fill('Garden cosmos river tide'); await sleep(300); await page.keyboard.press('Enter'); await sleep(2000); await shot('dome-st-search'); await page.evaluate(() => document.querySelector('.ivm aside #dx')?.click()); await sleep(500);
  await run(D + '.__ivSense.set(Math.round(' + D + '.__ivSense.steps() * .6))'); await sleep(1800); await shot('dome-st-lapse');
  await run(D + '.__ivSense.set(' + D + '.__ivSense.steps() - 1)'); await sleep(500);
  await menu('#gogrd'); await shot('dome-gr');
  await drag(0, 250); await shot('dome-gr-up');
  await page.mouse.wheel(0, -400); await sleep(800); await shot('dome-gr-zoom');
  await q('#vseg button[data-v="gravity"]').click(); await sleep(2000);
  console.log('after Gravity tab, dome attr:', JSON.stringify(await page.evaluate(() => document.querySelector('.ivm').dataset.dome))); await shot('gr-flat');
};
