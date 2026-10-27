module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => { app.plugins.plugins['ideaverse-maps'].settings.viewsFolder = '/'; });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #tourbtn').click(); await sleep(400); await shot('to-open');
  console.log('viewpop has tours?', await page.evaluate(() => !!document.querySelector('.ivm #viewpop #tlist')), 'tourpop', await page.evaluate(() => !!document.querySelector('.ivm #tourpop #tlist')));
  await page.locator('.ivm #recbtn').click(); await sleep(500);
  for (const [x, y] of [[700, 400], [900, 450], [1100, 300]]) { await page.mouse.click(x, y); await sleep(500); }
  console.log('rec label', await page.evaluate(() => document.querySelector('.ivm #tourbtn').getAttribute('aria-label')));
  await page.evaluate(() => document.querySelector('.ivm #recx').click()); await sleep(600); await shot('to-save');
  console.log('tourpop open', await page.evaluate(() => !document.querySelector('.ivm #tourpop').hidden), 'tsave', await page.evaluate(() => !document.querySelector('.ivm #tsave').hidden));
  await page.locator('.ivm #tname').fill('Test tour'); await page.keyboard.press('Enter'); await sleep(400);
  console.log('tours', await page.evaluate(() => [...document.querySelectorAll('.ivm #tlist .vgo b')].map(b => b.textContent).join(',')), 'telescope icon intact', await page.evaluate(() => !!document.querySelector('.ivm #viewbtn svg')));
  console.log('errors:', errs.join(' | ') || 'none');
};
