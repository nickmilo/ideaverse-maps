module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const mv = () => page.mouse.move(1599, 300);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="stars"]').click()); await sleep(3000);
  await page.evaluate(() => { const t = document.querySelector('.ivm #anitab'); if (t.getAttribute('aria-expanded') !== 'true') t.click(); }); await sleep(600); await mv(); await shot('ca-dock');
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gobuilder').click(); }); await sleep(3000);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(600); await mv(); await shot('ca-menu');
  await page.mouse.click(900, 900); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="emergence"]').click()); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="emergence"]').click()); await sleep(600); await mv(); await shot('ca-emmenu');
  await page.mouse.click(900, 900); await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header button')].find(b => /tuck|Hide the toolbar|collapse/i.test(b.getAttribute('aria-label') || '')); if (b) b.click(); }); await sleep(800); await mv(); await shot('ca-tucked');
  console.log('errors:', errs.join(' | ') || 'none');
};
