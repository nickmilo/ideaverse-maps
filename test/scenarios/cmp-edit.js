// Compass previews editable (0.8.175)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000);
  await page.mouse.move(800, 990); await sleep(500); await shot('cmp-pv');
  const n = await page.evaluate(() => document.querySelectorAll('.ivm-pvl .ivm-pv.pved').length); console.log('previews', n);
  const b = await page.evaluate(() => { const e = document.querySelector('.ivm-pvl .ivm-pv.pved'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, e.querySelector('.pvt').textContent]; });
  console.log('click', JSON.stringify(b));
  if (b) { await page.mouse.move(b[0], b[1]); await sleep(400); await shot('cmp-hover'); await page.mouse.down(); await page.mouse.up(); await sleep(2500); await shot('cmp-edit');
    console.log('editor', await page.evaluate(() => !!document.querySelector('.ivm-pvl .ckedit .cm-content'))); }
  await page.keyboard.press('Escape'); await sleep(500); console.log('closed', await page.evaluate(() => !document.querySelector('.ivm-pvl .ckedit')));
  console.log('errors:', errs.join(' | ') || 'none');
};
