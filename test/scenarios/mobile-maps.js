// Phone and tablet: each main map renders and fits
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(true)); await sleep(4000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const q = s => page.locator('.ivm ' + s).first();
  for (const v of ['gravity', 'stars', 'sense']) { await q(`#vseg button[data-v="${v}"]`).click(); await sleep(3000);
    const t0 = Date.now(); let fr = 0; await page.evaluate(() => new Promise(r => { let c = 0; const f = () => { if (++c < 30) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); })); const ms = Date.now() - t0;
    await shot('mm-' + v); console.log(v, '30 frames ms', ms); }
  await q('#vmore').click(); await sleep(400); await shot('mm-more');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
