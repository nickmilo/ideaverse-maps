module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gotreemap').click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  await page.evaluate(() => document.querySelector('.ivm #tmby button[data-tb="tags"]').click()); await sleep(2500);
  console.log('chips:', await page.evaluate(() => [...document.querySelectorAll('.ivm #tmtags .pchip')].map(c => c.textContent + (c.classList.contains('off') ? '(off)' : '')).join(' ')));
  await page.mouse.move(1599, 300); await shot('tm-tags-all');
  // garden only
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tmtags .pchip')].find(c => c.textContent === 'None').click()); await sleep(800);
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tmtags .pchip')].find(c => c.textContent.startsWith('#garden')).click()); await sleep(800);
  await page.evaluate(() => document.querySelector('.ivm #tmsubs').getAttribute('aria-pressed') !== 'true' && document.querySelector('.ivm #tmsubs').click()); await sleep(2500);
  await page.mouse.move(1599, 300); await shot('tm-tags-garden-menu');
  await page.mouse.click(1200, 950); await sleep(500); await page.mouse.move(1599, 300); await shot('tm-tags-garden');
  console.log('errors:', errs.join(' | ') || 'none');
};
