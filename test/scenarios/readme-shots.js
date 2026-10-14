// Screenshots for the README (made-up vault). Writes to $SHOTS as readme-*.png
const path = require('path');
module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => require('@electron/remote').getCurrentWindow().setSize(1600, 1000)); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const q = s => page.locator('.ivm ' + s).first();
  const V = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const run = js => page.evaluate(new Function(js));
  const theme = async t => { await q(`#themeseg button[data-th="${t}"]`).click(); await sleep(700); };
  const map = async v => { await q(`#vseg button[data-v="${v}"]`).click(); await sleep(2200); };
  const axis = async x => { await q(`#xseg button[data-x="${x}"]`).click(); await sleep(1500); };
  const find = async title => { await q('#q').click(); await q('#q').fill(title); await sleep(400); await page.keyboard.press('Enter'); await sleep(1800); await q('#q').fill(''); await page.evaluate(() => document.activeElement.blur()); await sleep(300); };
  const clear = async () => { const x = q('aside #dx'); if (await x.isVisible().catch(() => false)) await x.click(); await sleep(600); };
  const tuck = async () => { const b = q('aside #dcol'); if (await b.isVisible().catch(() => false)) await b.click(); await sleep(900); };
  const untuck = async () => { const t = q('.dtab'); if (await t.isVisible().catch(() => false)) await t.click(); await sleep(600); };
  const bars = async collapsed => { for (const [s, c] of [['#timebar', '.tcol'], ['#playbar', '.pcol']]) { const on = await page.evaluate(s => document.querySelector('.ivm ' + s).classList.contains('collapsed'), s); if (on !== collapsed) await q(s + ' ' + c).click(); } await sleep(400); };
  const legend = async open => { const o = await page.evaluate(() => !document.querySelector('.ivm #legend').classList.contains('collapsed')); if (o !== open) await page.evaluate(o => o ? document.querySelector('.ivm #legend').click() : document.querySelector('.ivm #legtab').click(), o); await sleep(400); };
  const header = async hidden => { const h = await page.evaluate(() => document.querySelector('.ivm header').hidden); if (h !== hidden) { if (hidden) await q('.hcol').click(); else await q('.htab').click(); } await sleep(900); };
  const trailClear = async () => { await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm .trail button')].find(b => /clear/i.test(b.textContent)); if (b) b.click(); }); await sleep(300); };
  const snap = async name => { await page.mouse.move(1, 500); await sleep(500); await page.locator('.ivm').screenshot({ path: path.join(process.env.SHOTS, name + '.png') }); console.log('snap', name); };

  // 1 Emergence by Time, LYT Mode: a map with links above and below and an uplink; panel tucked away
  await bars(true); await theme('lyt'); await find('Story cosmos garden'); await tuck(); await q('#zfit').click(); await sleep(1500); await snap('readme-emergence'); await untuck(); await clear();
  // 2 Gravity by ACE, Play theme: a Level 3 map
  await theme('paper'); await map('gravity'); await axis('ace'); await find('Seed orbit idea'); await tuck(); await legend(false); await snap('readme-gravity'); await legend(true); await untuck(); await clear(); await axis('time');
  // 3 Starfield 3D, Dark: everything tucked away, zoomed in
  await theme('dark'); await map('stars'); await trailClear();
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(3000); await page.evaluate(() => document.body.click());
  await legend(false); await header(true); await sleep(800);
  const box = await q('canvas').boundingBox(); await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -120); await sleep(250); } await sleep(1500);
  await snap('readme-starfield'); await header(false); await legend(true);
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="2d"]').click()); await sleep(800);
  // 4 Sensemaking, Soft Paper: a note's reasons in the panel
  await theme('softpaper'); await map('sense'); await find('Spark river craft'); await snap('readme-sensemaking'); await clear(); await trailClear();
  // (the Sensemaking swirl is an animation: see readme-swirl-gif.js)
  // 6 Gravity time-lapse, LYT Mode
  await theme('lyt'); await map('gravity'); await run(V + '.__ivSense.set(Math.round(' + V + '.__ivSense.steps() * .7))'); await sleep(800);
  await q('#tlplay').click(); await sleep(2600); await page.locator('.ivm').screenshot({ path: path.join(process.env.SHOTS, 'readme-timelapse.png') }); console.log('snap readme-timelapse');
  await q('#tlplay').click(); await run(V + '.__ivSense.set(' + V + '.__ivSense.steps() - 1)'); await sleep(800); await bars(true);
  // 7 Focus mode on Emergence, Dark, panel tucked (for "Using it")
  await theme('dark'); await map('emergence'); await q('#focusmode').click(); await find('Wonder ember root'); await tuck(); await sleep(800); await snap('readme-focus');
};
