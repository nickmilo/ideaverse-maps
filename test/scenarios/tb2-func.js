// The one-row toolbar: every control works from its new home
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { app.workspace.getLeavesOfType('ideaverse-maps').slice(1).forEach(l => l.detach()); for (const l of app.workspace.getLeavesOfType('bases')) l.detach(); }); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const E = f => page.evaluate(f); const C = async sel => { await page.locator('.ivm ' + sel).first().click(); await sleep(450); };
  const ok = (n, c, x = '') => console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : ''));
  const shown = sel => E(`(() => { const e = document.querySelector('.ivm ${sel}'); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; })()`);
  ok('header is one row', await E(() => document.querySelector('.ivm header').getBoundingClientRect().height < 60), await E(() => Math.round(document.querySelector('.ivm header').getBoundingClientRect().height)));
  // map menu, nested Starts popover
  await C('#vseg button[data-v=emergence]'); ok('Emergence ▾ opens its menu', await shown('#mapopts'));
  await C('#startbtn'); ok('Starts opens inside it, menu stays', (await shown('#startpop')) && (await shown('#mapopts')));
  await page.keyboard.press('Escape'); await sleep(200); ok('Escape closes both', !(await shown('#mapopts')) && !(await shown('#startpop')));
  // Space-Time from the menu
  await C('#vseg button[data-v=emergence]'); await E(() => { const r = [...document.querySelectorAll('.ivm #emerpop input, .ivm #emerpop label')].find(e => /Space-Time/.test(e.textContent || '') || e.value === 'spacetime'); r && r.click(); }); await sleep(1500);
  ok('Space-Time picked from the menu', await E(() => document.querySelector('.ivm').dataset.view === 'spacetime'), await E(() => document.querySelector('.ivm').dataset.view));
  ok('Arrange hidden on Space-Time', !(await shown('#arrbtn')));
  await page.keyboard.press('Escape'); await C('#vseg button[data-v=emergence]'); await E(() => { const r = [...document.querySelectorAll('.ivm #emerpop label')].find(e => /Main/.test(e.textContent)); r && r.click(); }); await sleep(1500); await page.keyboard.press('Escape');
  // Arrange
  await C('#arrbtn'); await E(() => [...document.querySelectorAll('.ivm #arrpop .orow')].find(b => /year/.test(b.textContent)).click()); await sleep(1500);
  ok('Arrange → year', await E(() => document.querySelector('.ivm #arrbtn b').textContent === 'year'), await E(() => document.querySelector('.ivm #arrbtn b').textContent));
  await C('#arrbtn'); await E(() => [...document.querySelectorAll('.ivm #arrpop .orow')].find(b => /^Time/.test(b.textContent)).click()); await sleep(1200);
  // Filter: drop a folder → badge
  await C('#filtbtn'); await C('#foldbtn'); await E(() => { const c = document.querySelector('.ivm #foldlist input[type=checkbox]'); c.click(); }); await sleep(800);
  const notes = await E(() => document.querySelector('.ivm #stats').textContent);
  await page.keyboard.press('Escape'); await sleep(300);
  ok('Filter shows a count', await E(() => document.querySelector('.ivm #filtbtn .tbadge').textContent === '1' && document.querySelector('.ivm #filtbtn').classList.contains('lit')), notes);
  await C('#filtbtn'); await C('#foldx'); await sleep(600); await page.keyboard.press('Escape'); ok('Clearing removes the count', await E(() => document.querySelector('.ivm #filtbtn .tbadge').hidden));
  // Display
  await C('#dispbtn'); await C('#alllinks'); ok('All links toggles', await E(() => document.querySelector('.ivm #alllinks').getAttribute('aria-pressed') === 'true')); await C('#alllinks');
  await E(() => document.querySelector('.ivm #themeseg button:first-child').click()); await sleep(400); ok('Theme changes', await E(() => document.querySelector('.ivm').dataset.theme), await E(() => document.querySelector('.ivm').dataset.theme));
  await E(() => document.querySelector('.ivm #themeseg button[data-th=dark]').click()); await sleep(300);
  await C('#scorebtn'); ok('Scoring panel opens, Display closes', (await shown('#scorepanel')) && !(await shown('#disppop'))); await E(() => document.querySelector('.ivm #spx').click());
  // Follow, Saved, collapse
  await C('#follownote'); ok('Follow note toggles', await E(() => document.querySelector('.ivm #follownote').getAttribute('aria-pressed') === 'true')); await C('#follownote');
  await C('#viewbtn'); ok('Saved opens', await shown('#viewpop')); await page.keyboard.press('Escape');
  // Corona: Group Folders/Time, Bands in its menu
  await C('#vmore'); await E(() => document.querySelector('.ivm #gocso').click()); await sleep(2500);
  ok('Corona tab appears', await E(() => document.querySelector('.ivm #vcur').textContent.startsWith('Corona')));
  await C('#grpbtn'); await E(() => [...document.querySelectorAll('.ivm #chordby button')].find(b => b.textContent === 'Time').click()); await sleep(1500);
  ok('Group → Time', await E(() => document.querySelector('.ivm #grpbtn b').textContent === 'Time')); await E(() => [...document.querySelectorAll('.ivm #chordby button')].find(b => b.textContent === 'Folders').click()); await page.keyboard.press('Escape');
  await C('#vcur'); ok('Corona menu has Bands', await shown('#csbands')); await C('#csbands'); ok('Bands toggles', await E(() => document.querySelector('.ivm #csbands').getAttribute('aria-pressed')), await E(() => document.querySelector('.ivm #csbands').getAttribute('aria-pressed'))); await C('#csbands'); await page.keyboard.press('Escape');
  // back to a core tab; tuck the bar
  await C('#vseg button[data-v=gravity]'); await sleep(1500); ok('Gravity: no current-map tab', !(await shown('#vcur')));
  await C('header .hcol'); await sleep(400); ok('︿ tucks the bar', await E(() => document.querySelector('.ivm header').hidden)); await C('.htab'); await sleep(300);
  // animations: ▶ leads each row
  await E(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(300);
  const firstX = sel => E(`(() => { const b = document.querySelector('.ivm ${sel}'); const row = [...b.parentElement.children].filter(c => c.getBoundingClientRect().width > 0); return Math.min(...row.map(c => c.getBoundingClientRect().left)) === b.getBoundingClientRect().left; })()`);
  ok('Wander ▶ first in its row', await firstX('#pplay')); ok('Orbit ▶ first in its row', await firstX('#dplay'));
  await shot('tb2-anim');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
