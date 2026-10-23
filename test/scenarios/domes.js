// Emergence ▾ → Planetarium: stand inside Emergence (Level 5 overhead), look around, back to Flat
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vseg button[data-v="emergence"]').click(); await sleep(300); await shot('emer-pop');
  await page.locator('.ivm input[name="emd"][value="dome"]').check(); await sleep(2500); await shot('planetarium');
  console.log('dome', await page.evaluate(() => document.querySelector('.ivm').dataset.dome), '| menu:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop .chip')].map(b => b.textContent).join(' | ')));
  const b = await q('canvas').boundingBox(); await page.mouse.move(b.x + b.width*.5, b.y + b.height*.6); await page.mouse.down(); await page.mouse.move(b.x + b.width*.5 + 300, b.y + b.height*.6 + 300, { steps: 10 }); await page.mouse.up(); await sleep(600); await shot('planetarium-up');
  await q('#vseg button[data-v="gravity"]').click(); await sleep(1500); await q('#vseg button[data-v="emergence"]').click(); await sleep(2000);
  console.log('back on Emergence, still planetarium:', await page.evaluate(() => document.querySelector('.ivm').dataset.dome));
  await q('#vseg button[data-v="emergence"]').click(); await sleep(300); await page.locator('.ivm input[name="emd"][value="flat"]').check(); await sleep(1500);
  console.log('flat again:', JSON.stringify(await page.evaluate(() => document.querySelector('.ivm').dataset.dome)));
};
