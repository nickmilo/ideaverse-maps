module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000);
  const r = await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header [data-tip]')].find(x => /Saved/.test(x.dataset.tip)); if (!b) return null; const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2, b.dataset.tip]; });
  console.log('target', JSON.stringify(r)); if (r) { await page.mouse.move(r[0], r[1]); await sleep(900); }
  console.log('tip', await page.evaluate(() => { const t = document.querySelector('.ivm .ivm-htip'); return t && !t.hidden ? t.textContent : 'hidden'; }), 'obsidian tooltip', await page.evaluate(() => !!document.querySelector('.tooltip')));
  await shot('htip'); console.log('errors:', errs.join(' | ') || 'none');
};
