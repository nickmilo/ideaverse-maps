// Animations dock: Timelapse, Wander Mode, Orbit
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const st = () => page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); return d ? `a=${d.dataset.a} tabs=${[...d.querySelectorAll('.anitabs button')].map(b => (b.hidden ? '-' : '') + b.textContent + (b.classList.contains('run') ? '•' : '')).join('/')} running=${d.classList.contains('running')}` : 'no dock'; });
  console.log('collapsed at start:', await page.evaluate(() => document.querySelector('.ivm #animdock').classList.contains('collapsed')));
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.classList.contains('collapsed')) d.querySelector('.acol').click(); }); await sleep(300);
  console.log('emergence:', await st()); await shot('ad-time');
  await page.locator('.ivm #animdock .anitabs button[data-a=wander]').click(); await sleep(400); await shot('ad-wander');
  await page.locator('.ivm #pplay').click(); await sleep(1500); console.log('wander playing:', await st());
  await page.locator('.ivm #animdock .anitabs button[data-a=time]').click(); await sleep(400); await shot('ad-time-while-wander');
  await page.locator('.ivm #animdock .anitabs button[data-a=wander]').click(); await page.locator('.ivm #pplay').click(); await sleep(800);
  await page.locator('.ivm #animdock .acol').click(); await sleep(400); await shot('ad-collapsed'); await page.locator('.ivm #animdock .acol').click(); await sleep(300);
  await page.evaluate(() => { const s = document.querySelector('.ivm #vsegms button, .ivm [data-v=stars]'); }); 
  await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug && 0);
  await page.locator('.ivm #animdock .anitabs button[data-a=orbit]').isHidden().then(h => console.log('orbit hidden on 2D:', h));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm button')].find(b => b.textContent.trim() === 'Sensemaking'); b && b.click(); }); await sleep(2500); console.log('sense:', await st()); await shot('ad-sense');
  await page.locator('.ivm #vmore').click(); await sleep(300); await page.evaluate(() => { const b = document.querySelector('.ivm #gocso'); b && b.click(); }); await sleep(3000); console.log('corona:', await st());
  await page.locator('.ivm #animdock .anitabs button[data-a=orbit]').click().catch(() => {}); await sleep(500); await shot('ad-orbit');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
