module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  // tuck the legend and dock so the timeline shows
  await page.evaluate(() => { const lc = document.querySelector('.ivm #legclose'); if (lc) lc.click(); const d = document.querySelector('.ivm #animdock'); const b = d && d.querySelector('button[aria-label="Tuck animations away"]'); if (b) b.click(); }); await sleep(300);
  const cnt = () => page.evaluate(() => document.querySelector('.ivm .wm-count, .ivm #stats')?.textContent || '') ;
  await page.locator('.ivm #filtbtn').click(); await sleep(600);
  if (await page.evaluate(() => document.querySelector('.ivm #yrall').checked)) { await page.locator('.ivm #yrall').click({ force: true }); await sleep(500); }
  await page.locator('.ivm #bymt').click({ force: true }); await sleep(1200); await shot('mw-filter');
  for (const w of ['Day', 'Week', 'Month', 'Year', 'All']) { await page.locator('.ivm .mtwin button', { hasText: w }).click(); await sleep(1400);
    const info = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; const c = m._cam(); return document.querySelector('.ivm #yrv0').textContent + ' | box ' + c.box.join(','); });
    console.log(w, info); await page.keyboard.press('Escape'); await sleep(900); await shot('mw-' + w); await page.locator('.ivm #filtbtn').click(); await sleep(500); }
  await page.locator('.ivm .mtwin button', { hasText: 'Week' }).click(); await sleep(800); await page.keyboard.press('Escape'); await page.keyboard.press('9'); await sleep(1500); await shot('mw-shelf-week');
  console.log('dots', await page.evaluate(() => [...document.querySelectorAll('.ivm .fhb.live')].map(b => b.textContent).join(',')));
  console.log('errors:', errs.join(' | ') || 'none');
};
