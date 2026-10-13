module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  for (const w of [700, 820, 960, 1150, 1500]) {
    await page.evaluate(w => { try { require('@electron/remote').getCurrentWindow().setSize(w, 900); } catch (e) { require('electron').remote.getCurrentWindow().setSize(w, 900); } }, w); await sleep(900);
    const out = [];
    for (const [b, p] of [['#viewbtn', '#viewpop'], ['#foldbtn', '#foldpop'], ['#collbtn', '#collpop'], ['#lcolbtn', '#lcolpop'], ['#startbtn', '#startpop']]) {
      const res = await page.evaluate(async ([b, p]) => { const r = document.querySelector('.ivm'), btn = r.querySelector(b);
        if (!btn || !btn.offsetParent) { const yc = r.querySelector('#yearschip'); if (yc && yc.offsetParent && !r.querySelector('header').classList.contains('rangeopen')) yc.click(); }
        if (!btn.offsetParent) return b + ' hidden';
        btn.click(); await new Promise(r => setTimeout(r, 50)); const e = r.querySelector(p); if (e.hidden) return b + ' did not open';
        const R = r.getBoundingClientRect(), x = e.getBoundingClientRect(); const s = `${b} ${Math.round(x.left - R.left)}..${Math.round(R.right - x.right)}`;
        document.body.click(); return s; }, [b, p]);
      out.push(res); await sleep(150);
    }
    console.log(w, out.join(' | '));
    if (w === 820) { await page.evaluate(() => document.querySelector('.ivm #viewbtn').click()); await sleep(300); await shot('pop820'); await page.evaluate(() => document.body.click()); }
  }
};
