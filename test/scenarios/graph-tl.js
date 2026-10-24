module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); }); await sleep(9000);
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  await page.evaluate(new Function(D + '.__ivSense.set(Math.round(' + D + '.__ivSense.steps() * .6))')); await sleep(800);
  await page.evaluate(() => document.querySelector('.ivm #tlplay').click()); await sleep(1700); await page.mouse.move(1599, 300); await shot('graph-tl');
  await page.evaluate(() => document.querySelector('.ivm #tlplay').click());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
