// The toolbar holds still at every width (Starfield, focus on): sample its layout for a second at each width
module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="stars"]').click()); await sleep(2000);
  await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map; m.openNote('Home.md'); }); await sleep(800);
  await page.evaluate(() => document.querySelector('.ivm #focusmode').click()); await sleep(1500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(700); };
  let bad = [];
  for (let w = 520; w <= 900; w += 8) { await split(w);
    const n = await page.evaluate(async () => { const r = document.querySelector('.ivm'), h = document.querySelector('.ivm header'); const seen = new Set(); for (let k = 0; k < 20; k++) { seen.add([r.dataset.tbwrap, r.dataset.findmini, Math.round(h.getBoundingClientRect().height), [...document.querySelectorAll('.ivm #vseg > button[data-v]')].filter(b => !b.hidden).length].join(',')); await new Promise(res => setTimeout(res, 60)); } return [...seen]; });
    if (n.length > 1) bad.push(w + ': ' + n.join(' / ')); }
  console.log('unstable widths:', bad.length ? bad.join(' | ') : 'none');
  console.log('errors:', errs.join(' | ') || 'none');
};
