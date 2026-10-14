// Screenshots for the README (made-up vault). Writes to $SHOTS as readme-*.png
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => require('@electron/remote').getCurrentWindow().setSize(1600, 1000)); await sleep(800);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const q = s => page.locator('.ivm ' + s).first();
  const V = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  const labels = () => page.evaluate(new Function('return ' + V + '.__ivLHall()'));
  const theme = async t => { await q(`#themeseg button[data-th="${t}"]`).click(); await sleep(700); };
  const map = async v => { await q(`#vseg button[data-v="${v}"]`).click(); await sleep(2200); };
  const pick = async k => { const lh = await labels(); const t = lh[k] || lh[0]; await page.mouse.click(t[0] + 5, t[1] + 6); await sleep(1600); return t[4]; };
  const clear = async () => { await page.keyboard.press('Escape'); await sleep(300); const x = q('aside .x'); if (await x.isVisible().catch(() => false)) await x.click(); await sleep(500); };
  const snap = async name => { await page.mouse.move(1, 500); await sleep(500); await page.locator('.ivm').screenshot({ path: require('path').join(process.env.SHOTS, name + '.png') }); console.log('snap', name); };
  const bars = async collapsed => { for (const s of ['#timebar', '#playbar']) { const on = await page.evaluate(s => document.querySelector('.ivm ' + s).classList.contains('collapsed'), s); if (on !== collapsed) await q(s + ' ' + (s === '#timebar' ? '.tcol' : '.pcol')).click(); } await sleep(400); };
  const panel = async collapsed => { await page.evaluate(c => { const d = document.querySelector('.ivm aside'), tab = document.querySelector('.ivm .dtab'); if (c && d && !d.hidden) d.querySelector('.dcol, [data-col], button[aria-label*="ollapse"]')?.click(); if (!c && tab && !tab.hidden) tab.click(); }, collapsed); await sleep(900); };
  // 1 Emergence, LYT Mode, a hub picked, panel tucked away
  await bars(true); await theme('lyt'); console.log('picked', await pick(1)); await panel(true); await snap('readme-emergence'); await panel(false);
  // 2 Gravity, Paper
  await clear(); await theme('paper'); await map('gravity'); await pick(0); await page.evaluate(() => document.querySelector('.ivm #legend').click()); await snap('readme-gravity'); await page.evaluate(() => document.querySelector('.ivm #legtab').click());
  // 3 Starfield 3D, Dark
  await clear(); await theme('dark'); await map('stars');
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(3000); await page.evaluate(() => document.body.click()); await snap('readme-starfield');
  // 4 Sensemaking, Soft Paper
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="2d"]').click()); await sleep(800);
  await theme('softpaper'); await map('sense'); await pick(2); await snap('readme-sensemaking');
  // 5 time-lapse mid-play, Gravity, Cybertron
  await clear(); await theme('cybertron'); await map('gravity'); await bars(false);
  await page.evaluate(new Function(V + '.__ivSense.set(Math.round(' + V + '.__ivSense.steps() * .7))')); await sleep(800);
  await q('#tlplay').click(); await sleep(2600); await page.locator('.ivm').screenshot({ path: require('path').join(process.env.SHOTS, 'readme-timelapse.png') }); console.log('snap readme-timelapse');
  await q('#tlplay').click(); await page.evaluate(new Function(V + '.__ivSense.set(' + V + '.__ivSense.steps() - 1)')); await sleep(800); await bars(true); await map('emergence');
  // 6 Follow note: map beside the editor, Dark
  await theme('dark'); await q('#follownote').click(); await sleep(300);
  await pick(3); await sleep(1200);
  await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0], e = app.workspace.getLeavesOfType('markdown')[0]; m.parent.setDimension(64); e.parent.setDimension(36); }); await sleep(1500);
  await pick(3); await sleep(1500);
  await page.mouse.move(1, 500); await sleep(400);
  await page.screenshot({ path: require('path').join(process.env.SHOTS, 'readme-follow.png') }); console.log('snap readme-follow');
};
