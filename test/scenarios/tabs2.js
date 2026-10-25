module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  const tabs = () => page.evaluate(() => [...document.querySelectorAll('.ivm #vseg button, .ivm #vcur')].filter(b => b.offsetParent).map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' | '));
  console.log('start:', await tabs());
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="ideaverse"]').click()); await sleep(12000); console.log('ideaverse:', await tabs());
  await page.mouse.move(1599, 300); await shot('tab-ideaverse');
  console.log('orbit:', await page.evaluate(() => [...document.querySelectorAll('.ivm #driftseg button')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent).join(',')));
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="tesla"]').click()); await sleep(3000); console.log('tesla:', await tabs()); await page.mouse.move(1599, 300); await shot('tab-tesla');
  await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(400); console.log('more:', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].filter(b => !b.hidden).map(b => b.textContent).join(', ')));
  await page.evaluate(() => document.querySelector('.ivm #gogravity').click()); await sleep(2000); console.log('gravity:', await tabs());
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); }); await sleep(300); await page.evaluate(() => document.querySelector('.ivm #gograph').click()); await sleep(5000); console.log('obsidian:', await tabs());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
