module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await sleep(2000);
  const base = `filters:\n  and:\n    - file.inFolder("Atlas/Films")\nviews:\n  - type: ideaverse-map\n    name: Builder\n    order:\n      - file.name\n      - status\n      - year\n      - imdbRating\n      - rank\n`;
  await page.evaluate(async b => { const f = app.vault.getAbstractFileByPath('Films Builder.base'); if (f) await app.vault.modify(f, b); else await app.vault.create('Films Builder.base', b); }, base); await sleep(800);
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Films Builder.base'); await app.workspace.getLeaf('tab').openFile(f); });
  await sleep(7000); await page.mouse.move(1599, 300); await shot('builder-base');
  console.log(JSON.stringify(await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const bi = v.baseInfo(); const r = v.hostEl.querySelector('.ivm'); const p = v.map._posters(); return { view: r && r.dataset.view, cols: bi.cols, cur: p.cur, across: p.across, lanes: p.lanes, fm: p.fm }; })));
  await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; v.hostEl.querySelector('#vcur').click(); }); await sleep(600);
  console.log('hint:', await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const h = v.hostEl.querySelector('#bhint'); return h && !h.hidden ? h.textContent : '(hidden)'; }));
  await shot('builder-menu');
  // whole vault, no pictures: dots
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await sleep(4000);
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('ideaverse-maps')[0]; const r = l.view.containerEl; r.querySelector('#vmore').click(); r.querySelector('#gobuilder').click(); }); await sleep(4000);
  await page.mouse.move(1599, 300); await shot('builder-vault');
  console.log('vault:', await page.evaluate(() => { const l = app.workspace.getLeavesOfType('ideaverse-maps')[0]; const r = l.view.containerEl.querySelector('.ivm'); return r.dataset.view + ' ' + JSON.stringify(l.view.map._posters().cur); }));
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
