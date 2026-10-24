module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const mob = process.env.MOB === '1';
  if (mob) { await page.evaluate(() => app.emulateMobile && app.emulateMobile(true)); await sleep(4000); await page.evaluate(async () => { if (!app.plugins.plugins['ideaverse-maps']) await app.plugins.enablePlugin('ideaverse-maps'); }); await sleep(1000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const views = [['gocso', 'corona'], ['gocsi', 'tesla'], ['goplglobe', 'planet globe']];
  for (const [id, nm] of views) {
    await page.evaluate(id => { const b = document.querySelector('.ivm #' + id); b && b.click(); }, id); await sleep(3500);
    const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    const cam = () => page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; const d = v.debug || {}; return d.__ivCam ? d.__ivCam() : null; });
    const lh = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
    const yaw = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivYaw()); const a = await lh(); const y0 = await yaw(); const cx = box[0] + box[2]*.45, cy = box[1] + box[3]*.5;
    if (mob) { const cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] }); for (let s = 1; s <= 10; s++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + s*12, y: cy }] }); await sleep(20); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await page.mouse.move(cx, cy); await page.mouse.down(); for (let s = 1; s <= 10; s++) { await page.mouse.move(cx + s*12, cy); await sleep(20); } await page.mouse.up(); }
    await sleep(400); const b = await lh();
    const m = new Map(a.map(l => [l[4], l[0]])); const d = b.filter(l => m.has(l[4])).map(l => l[0] - m.get(l[4]));
    const y1 = await yaw(); console.log(nm, JSON.stringify(y0), '→ yaw', (y1[1]-y0[1]).toFixed(3)); console.log(nm, 'label dx after dragging right:', d.slice(0, 6).map(v => Math.round(v)).join(','));
    await page.locator('.ivm #vmore').click().catch(() => {}); await sleep(300);
  }
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
