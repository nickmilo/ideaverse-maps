// the search list is wide enough to read: full titles (wrapping if long), folder and level underneath
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  for (const w of [1600, 1000, 700]) {
    await page.evaluate(w => require('@electron/remote').getCurrentWindow().setSize(w, 1000), w); await sleep(1000);
    await q('#q').click(); await q('#q').fill('garden'); await sleep(500);
    const r = await page.evaluate(() => { const e = document.querySelector('.ivm #results'), R = document.querySelector('.ivm').getBoundingClientRect(), b = e.getBoundingClientRect();
      const t = [...e.querySelectorAll('.t')].slice(0, 3).map(x => x.scrollWidth <= x.clientWidth + 1); return `${Math.round(b.width)}px, ${Math.round(b.left - R.left)}..${Math.round(R.right - b.right)} in view, titles fit: ${t.join(',')}`; });
    console.log(w, r); await shot('search-' + w); await page.keyboard.press('Escape'); await sleep(300);
  }
};
