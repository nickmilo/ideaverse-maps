module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => { app.plugins.plugins['ideaverse-maps'].settings.viewsFolder = '/'; });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #viewbtn').click(); await sleep(400);
  for (const nm of ['Emergence all', 'Gravity view', 'Calendar 2026', 'Recent week']) { await page.locator('.ivm #vname').fill(nm); await page.keyboard.press('Enter'); await sleep(300); }
  await page.locator('.ivm .vgadd').click(); await sleep(200); await page.keyboard.type('Daily Drivers'); await page.keyboard.press('Enter'); await sleep(300);
  await page.locator('.ivm .vgadd').click(); await sleep(200); await page.keyboard.type('Annual Review'); await page.keyboard.press('Enter'); await sleep(300);
  const sel = async (name, g) => { const r = page.locator('.ivm #vlist .vr', { hasText: name }); await r.hover(); await r.locator('select').selectOption(g); await sleep(300); };
  await sel('Recent week', 'Daily Drivers'); await sel('Calendar 2026', 'Daily Drivers'); await sel('Gravity view', 'Annual Review');
  { const r = page.locator('.ivm #vlist .vr', { hasText: 'Recent week' }); await r.hover(); await r.locator('.vdn').click(); } await sleep(300);
  await page.mouse.move(10, 900); await page.locator('.ivm #vname').blur(); await sleep(300); await shot('vg'); await page.locator('.ivm #vlist .vr', { hasText: 'Gravity view' }).hover(); await sleep(400); await shot('vg-hover');
  console.log(await page.evaluate(() => [...document.querySelectorAll('.ivm #vlist > *')].map(e => e.tagName === 'DETAILS' ? '[' + e.querySelector('summary .t').textContent + '] ' + [...e.querySelectorAll('.vr b')].map(b => b.textContent).join(', ') : e.textContent).join(' | ')));
  console.log('icon', await page.evaluate(() => !!document.querySelector('.ivm #viewbtn svg.lucide-telescope, .ivm #viewbtn svg')));
  console.log('errors:', errs.join(' | ') || 'none');
};
