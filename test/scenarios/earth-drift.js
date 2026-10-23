// Corona and Tesla: Drift → Earth spins the globe at a fixed 20° tilt; Earth only shows on those maps
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  console.log('themes:', await page.evaluate(() => [...document.querySelectorAll('.ivm #themeseg button')].map(b => b.dataset.th).join(',')));
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gocso').click(); await sleep(2500);
  await q('#driftseg button[data-d="earth"]').click(); await q('#dplay').click();
  const cam = () => page.evaluate(() => JSON.stringify(app.plugins.plugins['ideaverse-maps'].data.state['iv-cscam']));
  await sleep(2500); await shot('earth-1'); await sleep(2500); await shot('earth-2'); await q('#dplay').click(); await sleep(400);
  console.log('after Earth drift [yaw, pitch]:', await cam(), '(20° = 0.349)');
  await q('#vseg button[data-v="stars"]').click(); await sleep(1500); await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(2000);
  console.log('Earth button on Starfield visible:', await q('#driftseg button[data-d="earth"]').isVisible());
};
