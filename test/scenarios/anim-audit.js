// Animations, end to end: each ▶ starts and stops its own animation; modes, toggles, dots and tucking behave
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const E = s => page.evaluate(s);
  const dbg = () => 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  await E(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); });
  const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : ''));
  const vis = sel => E(`(() => { const e = document.querySelector('.ivm ${sel}'); if (!e) return false; const b = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && b.width > 0; })()`);
  const sel = () => E(() => { const t = document.querySelector('.ivm .drawer h2, .ivm #drawer h2, .ivm aside h2'); return t ? t.textContent : null; });
  const view = () => E(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivYaw()[0]);
  // toggles per mode
  for (const [m, hop, hopLocked, trail] of [['random', true, false, false], ['thread', true, false, false], ['map', false, true, true]]) {
    await E(`document.querySelector('.ivm #playseg button[data-p=${m}]').click()`); await sleep(200);
    const r = await E(() => ({ hop: document.querySelector('.ivm #pmaps').closest('label').getBoundingClientRect().width > 0, locked: document.querySelector('.ivm #pmaps').disabled, trail: document.querySelector('.ivm #ptrail').closest('label').getBoundingClientRect().width > 0, playing: document.querySelector('.ivm #pplay').textContent }));
    ok(`${m}: toggles shown right, nothing starts`, r.hop === hop && r.locked === hopLocked && r.trail === trail && r.playing === '▶', JSON.stringify(r)); }
  // wander: trails mode moves from note to note
  await E(`document.querySelector('.ivm #playseg button[data-p=thread]').click()`); await E(() => { const i = document.querySelector('.ivm #pint'); i.value = 2; i.dispatchEvent(new Event('input')); });
  await E(`document.querySelector('.ivm #pplay').click()`); await sleep(500); const s1 = await sel(); await sleep(4600); const s2 = await sel();
  ok('Wander ▶ (Trails) moves between notes', s1 && s2 && s1 !== s2, `${s1} → ${s2}`);
  ok('Wander running: dot and accent border', await E(() => document.querySelector('.ivm .aniwrap[data-a=wander]').classList.contains('run') && document.querySelector('.ivm #animdock').classList.contains('running')));
  await E(`document.querySelector('.ivm #pplay').click()`); await sleep(300); ok('Wander ■ stops', await E(() => document.querySelector('.ivm #pplay').textContent === '▶'));
  // wander: maps mode hops maps, keeps the note
  await E(`document.querySelector('.ivm #playseg button[data-p=map]').click()`); await E(`document.querySelector('.ivm #pplay').click()`); await sleep(800);
  const v1 = await view(), n1 = await sel(); await sleep(5200); const v2 = await view(), n2 = await sel();
  ok('Wander Maps: new map, same note', v1 !== v2 && n1 === n2, `${v1}→${v2}, ${n1}→${n2}`);
  await E(`document.querySelector('.ivm #pplay').click()`); await sleep(300);
  // back to emergence
  await E(() => { const b = [...document.querySelectorAll('.ivm [data-v]')].find(b => b.dataset.v === 'emergence'); b && b.click(); }); await sleep(2000);
  // timelapse
  await E(`document.querySelector('.ivm #tlplay').click()`); await sleep(400); const d1 = await E(() => document.querySelector('.ivm #tldate').textContent); await sleep(1200); console.log('  tlplay while playing:', await E(() => document.querySelector('.ivm #tlplay').textContent), '| time run:', await E(() => document.querySelector('.ivm .aniwrap[data-a=time]').className)); await sleep(300); const d2 = await E(() => document.querySelector('.ivm #tldate').textContent);
  ok('Timelapse ▶ advances the date', d1 !== d2, `${d1} → ${d2}`);
  ok('Timelapse running: dot', await E(() => document.querySelector('.ivm .aniwrap[data-a=time]').classList.contains('run')));
  await E(`document.querySelector('.ivm #tlplay').click()`); await sleep(300); ok('Timelapse ❚❚ pauses', await E(() => /▶|Resume/.test(document.querySelector('.ivm #tlplay').textContent)), await E(() => document.querySelector('.ivm #tlplay').textContent));
  await E(() => { const r = document.querySelector('.ivm #tlrange'); r.value = r.max; r.dispatchEvent(new Event('input')); }); await sleep(500);
  ok('Slider to the end shows every note (All time)', await E(() => document.querySelector('.ivm #tldate').textContent === 'All time'), await E(() => document.querySelector('.ivm #tldate').textContent));
  // orbit on a flat map
  ok('Orbit shown on flat map, Earth hidden', (await vis('.aniwrap[data-a=orbit]')) && !(await vis('#driftseg .dearth')));
  const c0 = await page.screenshot({ clip: { x: 0, y: 300, width: 1000, height: 400 } }); await E(`document.querySelector('.ivm #dplay').click()`); await sleep(3000); const c1 = await page.screenshot({ clip: { x: 0, y: 300, width: 1000, height: 400 } });
  ok('Orbit ▶ moves a flat map', Buffer.compare(c0, c1) !== 0);
  ok('Orbit running: dot', await E(() => document.querySelector('.ivm .aniwrap[data-a=orbit]').classList.contains('run')));
  // tuck while running: tab shows running
  await E(`document.querySelector('.ivm #animdock .acol').click()`); await sleep(300);
  ok('Tucked while running: tab is gold', await E(() => document.querySelector('.ivm #anitab').classList.contains('running') && !document.querySelector('.ivm #anitab').hidden));
  await E(`document.querySelector('.ivm #anitab').click()`); await sleep(300);
  await E(`document.querySelector('.ivm #dplay').click()`); await sleep(300); ok('Orbit stops', await E(() => document.querySelector('.ivm #dplay').textContent === '▶'));
  console.log('  running now:', await E(() => [...document.querySelectorAll('.ivm .aniwrap.run')].map(w => w.dataset.a).join(',') + ' | tlplay=' + document.querySelector('.ivm #tlplay').textContent + ' pplay=' + document.querySelector('.ivm #pplay').textContent));
  ok('Nothing running: no dots, plain border', await E(() => !document.querySelector('.ivm #animdock').classList.contains('running') && !document.querySelector('.ivm .aniwrap.run')));
  // orbit on a globe: Earth shows and spins
  await E(() => document.querySelector('.ivm #gocso').click()); await sleep(3000);
  ok('Globe: Earth shown', await vis('#driftseg .dearth'));
  await E(() => document.querySelector('.ivm #driftseg .dearth').click()); const y0 = await E(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivYaw()[1]);
  await E(`document.querySelector('.ivm #dplay').click()`); await sleep(2000); const y1 = await E(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivYaw()[1]);
  ok('Orbit Earth turns the globe', Math.abs(y1 - y0) > .02, (y1 - y0).toFixed(3));
  // a drag stops orbit
  const box = await E(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left + r.width*.4, r.top + r.height*.5]; });
  await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[0] + 40, box[1]); await page.mouse.up(); await sleep(300);
  ok('Dragging stops Orbit', await E(() => document.querySelector('.ivm #dplay').textContent === '▶'));
  // empty-space click tucks
  await E(() => { const d = document.querySelector('.ivm #animdock'); d.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await sleep(200);
  ok('Empty-space click tucks', await E(() => document.querySelector('.ivm #animdock').hidden));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
