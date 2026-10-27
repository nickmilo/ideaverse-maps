module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => { app.plugins.plugins['ideaverse-maps'].settings.viewsFolder = 'Notes'; });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #viewbtn').click(); await sleep(400);
  for (const nm of ['Annual Review 2026', 'Base', 'Recently Modified (Week)', 'Movies only']) { await page.locator('.ivm #vname').fill(nm); await page.keyboard.press('Enter'); await sleep(250); }
  await page.locator('.ivm .vgadd').click(); await sleep(200); await page.keyboard.type('Calendar Reviews'); await page.keyboard.press('Enter'); await sleep(300);
  await page.locator('.ivm .vgadd').click(); await sleep(200); await page.keyboard.type('Daily Drivers'); await page.keyboard.press('Enter'); await sleep(300);
  const order = () => page.evaluate(() => [...document.querySelectorAll('.ivm #vlist > *')].map(e => e.tagName === 'DETAILS' ? '[' + e.querySelector('summary .t').textContent + '] ' + [...e.querySelectorAll('.vr b')].map(b => b.textContent).join(', ') : e.textContent).join(' | '));
  const drag = async (from, to) => { const a = await page.locator(from).first().boundingBox(), b = await page.locator(to).first().boundingBox(); console.log('drag', from.slice(-40), Math.round(a.y), '->', to.slice(-40), Math.round(b.y));
    await page.mouse.move(a.x + 40, a.y + a.height/2); await page.mouse.down(); await page.mouse.move(a.x + 45, a.y + a.height/2 + 5, { steps: 3 }); await page.mouse.move(b.x + 40, b.y + b.height/2, { steps: 12 }); await sleep(100); await page.mouse.up(); await sleep(400); };
  await drag('.ivm #vlist .vr:has-text("Annual Review 2026")', '.ivm #vlist details.vgrp > summary:has-text("Calendar Reviews")');
  await drag('.ivm #vlist .vr:has-text("Recently Modified")', '.ivm #vlist details.vgrp > summary:has-text("Daily Drivers")');
  await drag('.ivm #vlist .vr:has-text("Movies only")', '.ivm #vlist .vr:has-text("Recently Modified")');
  console.log('after views', await order());
  await drag('.ivm #vlist details.vgrp > summary:has-text("Daily Drivers")', '.ivm #vlist details.vgrp > summary:has-text("Calendar Reviews")');
  console.log('after group', await order());
  await page.locator('.ivm #vlist .vr:has-text("Base")').hover(); await sleep(1200); await shot('vd-hover');
  console.log('tooltip', await page.evaluate(() => (document.querySelector('.tooltip') || {}).textContent || 'none'));
  console.log('errors:', errs.join(' | ') || 'none');
};
