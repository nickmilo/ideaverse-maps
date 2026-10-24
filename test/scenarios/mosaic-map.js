module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  for (const th of [process.env.TH || 'dark']) await page.evaluate(t => document.querySelector(`.ivm #themeseg [data-th="${t}"]`).click(), th);
  const t0 = Date.now(); await page.evaluate(() => { window.__ivReveal('#gomosaic'); document.querySelector('#gomosaic').click(); }); await sleep(200); console.log('switch ms', Date.now() - t0);
  await sleep(2500); await page.mouse.move(1599, 300); await shot('mosaic-em');
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(500); await shot('mosaic-menu');
  await page.evaluate(() => document.querySelector('.ivm #mosseg [data-ms="scatter"]').click()); await sleep(2000); await page.evaluate(() => document.body.click()); await sleep(1500); await page.mouse.move(1599, 300); await shot('mosaic-sc');
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(300); await page.evaluate(() => document.querySelector('.ivm #mosseg [data-ms="emergence"]').click()); await sleep(1800); await page.evaluate(() => document.body.click());
  const b = await page.locator('.ivm canvas').first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); for (let q = 0; q < 5; q++) { await page.mouse.wheel(0, -120); await sleep(200); } await sleep(1200);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(1500); await page.mouse.move(1599, 300); await shot('mosaic-zoom');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
