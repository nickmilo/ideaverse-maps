module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); });
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v=stars]').click()); await sleep(3000);
  const fps = () => page.evaluate(() => new Promise(res => { let c = 0; const t0 = performance.now(); const f = () => { c++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(c/2); }; requestAnimationFrame(f); }));
  console.log('idle fps:', await fps());
  // drift (Orbit) as a comparison: it redraws every frame too
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); document.querySelector('.ivm #dplay').click(); }); await sleep(800);
  console.log('orbit fps:', await fps());
  await page.evaluate(() => document.querySelector('.ivm #dplay').click()); await sleep(500);
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(300);
  await page.evaluate(() => { const r = [...document.querySelectorAll('.ivm .sglow')].find(x => /Turning/.test(x.textContent)); r.querySelectorAll('button')[1].click(); }); await page.keyboard.press('Escape'); await sleep(1500);
  console.log('turning fps:', await fps());
};
