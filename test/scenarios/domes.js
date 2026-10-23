// the Emergence Dome (experimental, under ⋯ → Experimental → Sketches → Unfinished): stand inside Emergence, look around, back to flat
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const menu = async id => { await q('#vmore').click(); await sleep(300);
    for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
    await shot('menu-open'); await q(id).click(); await sleep(2200); };
  const drag = async (dx, dy) => { const b = await q('canvas').boundingBox(); const x = b.x + b.width*.5, y = b.y + b.height*.6; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 10 }); await page.mouse.up(); await sleep(600); };
  await menu('#goemt'); await shot('dome-em-time');
  console.log('dome attr', await page.evaluate(() => document.querySelector('.ivm').dataset.dome), '| menu items:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop .chip')].map(b => b.textContent).join(' | ')));
  await drag(400, 300); await shot('dome-em-turned');
  await q('#vseg button[data-v="emergence"]').click(); await sleep(1500);
  console.log('after Emergence tab, dome attr:', JSON.stringify(await page.evaluate(() => document.querySelector('.ivm').dataset.dome)));
};
