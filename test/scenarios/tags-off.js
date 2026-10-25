module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #themeseg [data-th="dark"]').click());
  const stats = () => page.evaluate(() => document.querySelector('.ivm #stats').textContent);
  const chips = () => page.evaluate(() => { const t = document.querySelector('.ivm #tmtags'); return t && !t.hidden ? [...t.querySelectorAll('.pchip')].map(c => c.textContent + (c.classList.contains('off') ? '(off)' : '')).join(' ') : '(no chips)'; });
  // Bookshelf by Tag, garden only
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #goshelf').click(); }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #shelfsort button[data-ss="tag"]').click()); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  console.log('shelf chips:', await chips());
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tmtags .pchip')].find(c => c.textContent === 'None').click()); await sleep(600);
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tmtags .pchip')].find(c => c.textContent.startsWith('#garden')).click()); await sleep(2500);
  console.log('shelf garden:', await stats()); await page.mouse.move(1599, 300); await shot('shelf-garden');
  // Chord by Tags, garden + idea
  await page.mouse.click(1200, 950); await sleep(300);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gochord').click(); }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #chordby button[data-cb="tags"]').click()); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(400);
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tmtags .pchip')].find(c => c.textContent.startsWith('#idea')).click()); await sleep(2500);
  console.log('chord chips:', await chips(), '|', await stats()); await page.mouse.move(1599, 300); await shot('chord-garden');
  // Emergence: everything back
  await page.mouse.click(1200, 950); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="emergence"]').click()); await sleep(2500);
  console.log('emergence:', await stats(), await chips());
  console.log('errors:', errs.join(' | ') || 'none');
};
