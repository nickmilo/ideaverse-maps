module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  const nest = () => page.evaluate(() => { const c = document.querySelector('.ivm #tmtags .tagnest input'); if (c && !c.checked) c.click(); return !!c; });
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #goshelf').click(); }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #shelfsort button[data-ss="tag"]').click()); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  await page.mouse.move(1599, 300); await shot('shelf-off');
  console.log('shelf toggle:', await nest()); await sleep(2500); await page.mouse.move(1599, 300); await shot('shelf-nest');
  await page.mouse.click(1200, 950); await sleep(300);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gochord').click(); }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #chordby button[data-cb="tags"]').click()); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  console.log('chord toggle checked:', await page.evaluate(() => document.querySelector('.ivm #tmtags .tagnest input').checked));
  await page.mouse.click(1200, 950); await sleep(500); await page.mouse.move(1599, 300); await shot('chord-nest');
  console.log('errors:', errs.join(' | ') || 'none');
};
