module.exports = async ({ page, sleep, shot }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm label')].find(x => /more maps in the header/.test(x.textContent)); l.click(); }); await sleep(800);
  await page.keyboard.press('-'); await sleep(1500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1000); };
  const st = () => page.evaluate(() => { const r = document.querySelector('.ivm'), h = document.querySelector('.ivm header'), tl = h.querySelector('.tbl'), tr = h.querySelector('.tbr'), sm = document.querySelector('#vsegms');
    return [r.dataset.vgoff, r.dataset.findmini, r.dataset.tbwrap, 'hdr', h.clientWidth, 'tl', tl.clientWidth, tl.scrollWidth, 'sm', sm.clientWidth, sm.scrollWidth, 'tr', tr.clientWidth, tr.scrollWidth].join(' '); });
  for (const w of [1300, 1100, 1000, 950, 900, 850, 800]) { await split(w); console.log(w, await st()); }
  await split(950); await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0] || app.workspace.activeLeaf; });
  const pt = await page.evaluate(() => { const ms = [...document.querySelectorAll('.ivm canvas')][0].getBoundingClientRect(); return [ms.left + ms.width * .3, ms.top + ms.height * .5]; });
  for (let i = 0; i < 12; i++) { await page.mouse.click(pt[0] + i * 15, pt[1] + i * 10); await sleep(300); }
  await sleep(1500); console.log('after clicks', await st()); await shot('vg-sel');
};
