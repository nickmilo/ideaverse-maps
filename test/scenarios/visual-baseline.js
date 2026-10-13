// visual + geometry baseline across many UI states; writes $BASE/<tag>/* (default: <tmp>/ivm-base)
const fs = require('fs');
module.exports = async ({ page, sleep }) => {
  const tag = process.env.TAG || 'a', dir = require('path').join(process.env.BASE || require('os').tmpdir() + '/ivm-base', tag); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const q = s => page.locator('.ivm ' + s).first();
  const dbg = () => 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const geo = {};
  const snap = async name => {
    await page.mouse.move(790, 990); await sleep(1300);
    await page.screenshot({ path: `${dir}/${name}.png` });
    geo[name] = await page.evaluate(() => { const r = document.querySelector('.ivm'), R = r.getBoundingClientRect(), o = {};
      for (const s of ['header', '.range', '.search', '#viewms', '#yearschip', 'main', 'canvas', '.legend', '.legtab', '.zoom', 'aside', '.dgrip', '#timebar', '#playbar', '#driftbar', '.trail', '.focusbar', '.spacer', '#foldms .chip', '#tourctl', '.dtab', '.htab']) {
        const e = r.querySelector(s); if (!e) continue; const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
        o[s] = cs.display === 'none' ? 'none' : [b.x - R.x, b.y - R.y, b.width, b.height].map(Math.round).join(',') + ' ' + cs.paddingRight; }
      o.badHidden = [...r.querySelectorAll('[hidden]')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className);
      o.collapsedKids = [...r.querySelectorAll('.playbar.collapsed > *, .timebar.collapsed > *')].map(e => (e.id || e.className) + ':' + getComputedStyle(e).display).join(' ');
      return o; });
  };
  const size = async w => { await page.evaluate(w => require('@electron/remote').getCurrentWindow().setSize(w, 1000), w); await sleep(1200); };
  const pickNote = async () => { const lh = await page.evaluate(new Function('return ' + dbg() + '.__ivLHall()')); await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(800); };
  const closeDrawer = async () => { if (await q('aside .x').isVisible().catch(() => false)) await q('aside .x').click(); await sleep(400); };
  await size(1600);
  await snap('w-emergence');
  await page.evaluate(() => document.querySelector('.ivm #legend').click()); await snap('w-legend-collapsed');
  if (await q('#legtab').isVisible()) await q('#legtab').click(); await sleep(300);
  await pickNote(); await snap('w-drawer');
  await q('#focusmode').click(); await sleep(1200); await snap('w-focus');
  await q('#focusmode').click(); await sleep(800); await closeDrawer();
  await q('#vseg button[data-v="gravity"]').click(); await sleep(1500); await snap('w-gravity');
  await pickNote(); await snap('w-gravity-drawer'); await closeDrawer();
  await q('#vseg button[data-v="stars"]').click(); await sleep(2000); await snap('w-stars');
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(2500); await page.evaluate(() => document.body.click()); await snap('w-stars3d');
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="2d"]').click()); await sleep(1500); await page.evaluate(() => document.body.click());
  await q('#vseg button[data-v="emergence"]').click(); await sleep(1500);
  await q('#timebar .tcol').click(); await q('#playbar .pcol').click(); await snap('w-collapsed');
  await q('#timebar .tcol').click(); await q('#playbar .pcol').click(); await sleep(300);
  await q('#foldbtn').click(); await sleep(300); await page.locator('.ivm #foldlist input[type=checkbox]').first().uncheck().catch(()=>{}); await page.keyboard.press('Escape'); await page.evaluate(() => document.body.click()); await snap('w-foldfilter');
  if (await q('#foldx').isVisible()) await q('#foldx').click(); await sleep(500);
  await size(1100); await snap('m-emergence'); await pickNote(); await snap('m-drawer'); await closeDrawer();
  await size(700); await snap('n-emergence'); await pickNote(); await snap('n-drawer'); await closeDrawer();
  await q('#yearschip').click(); await sleep(400); await snap('n-options'); await q('#yearschip').click();
  await q('#vseg button[data-v="stars"]').click(); await sleep(1800); await snap('n-stars');
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(2500); await page.evaluate(() => document.body.click()); await snap('n-stars3d');
  await q('#vseg button[data-v="gravity"]').click(); await sleep(1500); await snap('n-gravity');
  fs.writeFileSync(`${dir}/geo.json`, JSON.stringify(geo, null, 1));
  console.log('badHidden:', JSON.stringify(Object.fromEntries(Object.entries(geo).map(([k, v]) => [k, v.badHidden.length]))));
};
