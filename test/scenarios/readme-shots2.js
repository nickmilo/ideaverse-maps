// README screenshots (made-up vault "films": the 2,500-note synth vault plus 160 made-up films with generated posters)
const path = require('path');
module.exports = async ({ page, sleep }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const ev = (f, a) => page.evaluate(f, a);
  const theme = async t => { await ev(t => document.querySelector(`.ivm #themeseg button[data-th="${t}"]`).click(), t); await sleep(700); };
  const core = async v => { await ev(v => { const b = document.querySelector(`.ivm #vseg button[data-v="${v}"]`); if (b.getAttribute('aria-pressed') !== 'true') b.click(); }, v); await sleep(2500); await close(); };
  const more = async id => { await ev(id => { window.__ivReveal(id); document.querySelector('.ivm ' + id).click(); }, id); await sleep(3000); };
  const close = async () => { await page.mouse.click(1590, 990); await ev(() => document.body.click()); await sleep(400); };
  const find = async t => { const ok = await ev(t => { const f = app.vault.getMarkdownFiles().find(f => f.basename === t); if (!f) return false; app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(f.path); return true; }, t); console.log('find', t, ok); await sleep(2500); };
  const tuck = async () => { await ev(() => { const b = document.querySelector('.ivm aside #dcol'); b && b.click(); }); await sleep(900); };
  const clear = async () => { await ev(() => { const b = document.querySelector('.ivm aside #dx'); b && b.click(); }); await sleep(600); };
  const legend = async open => { await ev(o => { const L = document.querySelector('.ivm #legend'); const isOpen = !L.classList.contains('collapsed'); if (isOpen !== o) (o ? document.querySelector('.ivm #legtab') : L).click(); }, open); await sleep(400); };
  const wheel = async (n, fx = .5, fy = .5) => { const b = await page.locator('.ivm canvas').first().boundingBox(); await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy); for (let i = 0; i < n; i++) { await page.mouse.wheel(0, -120); await sleep(200); } await sleep(1500); };
  const snap = async name => { await page.mouse.move(1599, 300); await sleep(700); await page.locator('.ivm').first().screenshot({ path: path.join(process.env.SHOTS, name + '.png') }); console.log('snap', name); };
  const zfit = async () => { await ev(() => document.querySelector('.ivm #zfit').click()); await sleep(1500); };

  await theme('lyt'); await core('emergence'); await find('Story cosmos garden'); await tuck(); await zfit(); await snap('emergence'); await clear();
  await theme('paper'); await core('gravity'); await ev(() => { const b = document.querySelector('.ivm #xseg button[data-x="ace"]'); b && b.click(); }); await sleep(1500); await find('Seed orbit idea'); await tuck(); await legend(false); await snap('gravity'); await legend(true); await clear();
  await ev(() => { const b = document.querySelector('.ivm #xseg button[data-x="time"]'); b && b.click(); }); await sleep(1000);
  await theme('dark'); await core('stars'); await ev(() => { const r = document.querySelector('.ivm input[name="s3d"][value="3d"]'); r && r.click(); }); await sleep(3000); await close(); await legend(false); await wheel(4, .55, .5); await snap('starfield'); await legend(true);
  await ev(() => { const r = document.querySelector('.ivm input[name="s3d"][value="2d"]'); r && r.click(); }); await sleep(800);
  await theme('softpaper'); await core('sense'); await find('Spark river craft'); await snap('sensemaking'); await clear();
  await theme('dark'); await more('#gocso'); await legend(false); await find('Garden cosmos river tide'); await tuck(); await snap('corona'); await clear(); await legend(true);
  await theme('lyt'); await more('#gochord'); await legend(false); await snap('chord'); await legend(true);
  await theme('softpaper'); await more('#gotreemap'); await legend(false); await snap('treemap'); await legend(true);
  await theme('paper'); await more('#goshelf'); await legend(false); await wheel(3, .3, .45); await snap('bookshelf'); await legend(true);
  await theme('dark'); await more('#gograph'); await sleep(12000); await legend(false); await find('Garden cosmos river tide'); await tuck(); await wheel(2, .5, .5); await snap('graph'); await clear(); await legend(true);
  // Posters on the film set
  await theme('dark'); await more('#goposters');
  await ev(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; v.map.setScope(app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/') && f.basename !== 'Films').map(f => f.path)); }); await sleep(2500);
  const pick = async (id, v) => { await ev(([id, v]) => { window.__ivReveal(id); const s = document.querySelector('.ivm ' + id); s.value = v; s.dispatchEvent(new Event('change')); }, [id, v]); await sleep(1500); };
  const mode = async m => { await ev(m => { window.__ivReveal('#pmode'); document.querySelector(`.ivm #pmode [data-pm="${m}"]`).click(); }, m); await sleep(1800); };
  await mode('rows'); await pick('#pacross', 'year'); await pick('#planes', 'genre'); await pick('#psize', 'rank'); await close(); await legend(false); await sleep(3000); await wheel(3, .55, .45); await sleep(3000); await snap('posters');
  await zfit(); await mode('scatter'); await pick('#pacross', 'imdbRating'); await pick('#pheight', 'rank'); await close(); await sleep(4000); await snap('tastegap');
  await mode('mosaic'); await close(); await sleep(5000); await snap('mosaic');
  await ev(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.setScope(null)); await sleep(1500); await legend(true);
  // Focus mode on Emergence
  await theme('dark'); await core('emergence'); await ev(() => document.querySelector('.ivm #focusmode').click()); await find('Wonder ember root'); await tuck(); await sleep(800); await snap('focus');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
