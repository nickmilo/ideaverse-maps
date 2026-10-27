module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewportSize({ width: 430, height: 900 }); await sleep(1500);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  for (const k of ['7', '0', '\\']) { await page.evaluate(k => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }, k); await sleep(1500);
    const info = await page.evaluate(() => { const h = document.querySelector('.ivm header'), hr = h.getBoundingClientRect(); return [...h.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().width).map(b => { const r = b.getBoundingClientRect(); return (b.id || b.className.split(' ')[0]) + (r.right > hr.right + 1 ? '!OUT' : ''); }).join(' '); });
    console.log(k, info); await page.screenshot({ path: process.env.SHOTS + '/pb-' + (k === '\\' ? 'bs' : k) + '.png', clip: { x: 0, y: 0, width: 430, height: 260 } }); }
  console.log('errors:', errs.join(' | ') || 'none');
};
