module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const q = s => page.evaluate(s => { const e = document.querySelector('.ivm ' + s); return e ? (e.getAttribute('aria-pressed') || e.getAttribute('aria-expanded') || e.textContent.trim().slice(0, 4)) + (e.hidden ? ' (hidden)' : '') : 'none'; }, s);
  const st = async () => ['dplay ' + await q('#dplay'), 'dock ' + (await page.evaluate(() => document.querySelector('.ivm #animdock').hidden ? 'tucked' : 'open')), 'pplay ' + await q('#pplay'), 'tl ' + await q('#tlplay'), 'sync ' + await q('#follownote'), 'filt ' + await q('#filtbtn'), 'focus ' + await q('#focusmode'), 'speed ' + await page.evaluate(() => (document.querySelector('.ivm #driftseg button[aria-pressed="true"]') || {}).textContent)].join(' | ');
  console.log('start', await st());
  for (const k of ['o', 'o', 'a', 'a', 'w', 'w', 't', 't', 's', 's', 'f', 'Escape', 'n', 'n', 'l', 'j']) { await page.keyboard.press(k); await sleep(500); console.log(k, await st()); }
  await page.keyboard.press('2'); await sleep(1500); await page.keyboard.press('k'); await sleep(500); console.log('ideaverse k', await st());
  await page.keyboard.press('o'); await page.keyboard.press('w'); await page.keyboard.press('t');
  console.log('errors:', errs.join(' | ') || 'none');
};
