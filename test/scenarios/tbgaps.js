module.exports = async ({ page, sleep }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const split = async w => { await page.evaluate(w => { const el = document.querySelector('.workspace-split.mod-root'); el.style.width = w + 'px'; el.style.flex = 'none'; window.dispatchEvent(new Event('resize')); }, w); await sleep(1000); };
  const m = () => page.evaluate(() => ['#follownote', '#focusmode', '#viewbtn', '#dispbtn', '#tourbtn', '#capbtn'].map(s => { const e = document.querySelector('.ivm ' + s); if (!e) return s + ' none'; const r = e.getBoundingClientRect(); return s.slice(1,5) + ' ' + Math.round(r.left) + '+' + Math.round(r.width); }).join(' | '));
  await page.evaluate(() => { document.querySelector('.ivm #dispbtn').click(); }); await sleep(300); await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm label')].find(x => /more maps in the header/.test(x.textContent)); if (l) l.click(); }); await page.keyboard.press('Escape'); await sleep(500);
  for (const w of [1250, 1000, 800]) { await split(w); console.log(w, await m()); }
  console.log(await page.evaluate(() => ['#follownote', '#focusmode', '#viewbtn', '#dispbtn', '#tourbtn', '#capbtn'].map(s => { const e = document.querySelector('.ivm ' + s); if (!e) return s + ' none'; const r = e.getBoundingClientRect(); return s + ' ' + Math.round(r.left) + '-' + Math.round(r.right); }).join(' | ')));
};
