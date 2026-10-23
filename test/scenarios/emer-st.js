// Emergence ▾ → Landscape / Planetarium / Space-Time; ⋯ → Experimental lists Chord, Corona, Tesla, Bookshelf before Sketches
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const view = () => page.evaluate(() => document.querySelector('.ivm').dataset.view);
  await q('#vseg button[data-v="emergence"]').click(); await sleep(300); await shot('emerpop');
  await page.locator('.ivm label.srow', { has: page.locator('input[name="emd"][value="spacetime"]') }).first().click(); await sleep(2000);
  console.log('view:', await view(), '| Emergence pressed:', await q('#vseg button[data-v="emergence"]').getAttribute('aria-pressed'));
  await shot('spacetime');
  await q('#vseg button[data-v="emergence"]').click(); await sleep(300);
  console.log('checked:', await page.evaluate(() => [...document.querySelectorAll('.ivm input[name="emd"]')].filter(r => r.checked).map(r => r.value)));
  await page.locator('.ivm label.srow', { has: page.locator('input[name="emd"][value="flat"]') }).first().click(); await sleep(2000); console.log('back to:', await view(), 'dome:', await page.evaluate(() => document.querySelector('.ivm').dataset.dome));
  await q('#vmore').click(); await sleep(300); await q('#mexp > summary').click(); await sleep(300); await shot('menu');
  console.log('experimental:', await page.evaluate(() => [...document.querySelector('.ivm #mexp').children].map(e => e.tagName === 'SUMMARY' ? '' : e.tagName === 'DETAILS' ? '[' + e.querySelector('summary').textContent + ']' : e.textContent).filter(Boolean).join(', ')));
  await q('#goshelf').click(); await sleep(2000); console.log('shelf view:', await view());
};
