module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #goshelf').click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #shelfsort button[data-ss="tag"]').click()); await sleep(2500);
  await page.mouse.move(1599, 300); await shot('tag-shelf');
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gochord').click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #chordby button[data-cb="tags"]').click()); await sleep(2500);
  await page.mouse.move(1599, 300); await shot('tag-chord');
  console.log('buttons:', await page.evaluate(() => [...document.querySelectorAll('.ivm #shelfsort button, .ivm #chordby button')].map(b => b.textContent + (b.hidden ? '(hidden)' : '')).join(' ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
