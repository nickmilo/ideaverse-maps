module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); });
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v=stars]').click()); await sleep(3000);
  // twinkle: wait and catch one
  let seen = 0; for (let t = 0; t < 30; t++) { await sleep(400); const px = await page.evaluate(() => { const c = document.querySelector('.ivm canvas.twinkle'); if (!c || !c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 20) s++; return s; }); if (px > 0) { seen++; if (seen === 1) await shot('sf-twinkle'); } }
  console.log('twinkle frames seen:', seen, 'of 30 samples');
  // fly to a galaxy by its name
  const lab = await page.evaluate(() => { const L = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall(); return L.find(l => /stars|nebula/i.test(l[4]) || true); });
  const gal = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return null; });
  // turning: on, measure frame pace
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(300);
  await page.evaluate(() => { const r = [...document.querySelectorAll('.ivm .sglow')].find(x => /Turning/.test(x.textContent)); r.querySelectorAll('button')[1].click(); }); await page.keyboard.press('Escape'); await sleep(500);
  const fr = await page.evaluate(() => new Promise(res => { let c = 0; const t0 = performance.now(); const f = () => { c++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(c/2); }; requestAnimationFrame(f); }));
  console.log('rAF fps while turning:', fr); await shot('sf-turn-a'); await sleep(6000); await shot('sf-turn-b');
  await page.evaluate(() => { const r = [...document.querySelectorAll('.ivm .sglow')].find(x => /Turning/.test(x.textContent)); r.querySelectorAll('button')[0].click(); }); await sleep(1500);
  // timelapse flares
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #tlplay').click()); await sleep(4200); await shot('sf-tl-1'); await sleep(1500); await shot('sf-tl-2');
  await page.evaluate(() => document.querySelector('.ivm #tlplay').click());
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
