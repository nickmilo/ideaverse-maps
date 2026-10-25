module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  const names = ['Ada Venn','Kai Moreau','Rui Okafor','June Halvorsen','Theo Lindqvist','Sol Arden','Nadia Sorel','Ines Tamura','Otto Brandt','Lea Fontaine'];
  await page.evaluate(async () => { const fs = app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/')).slice(0, 40); let k = 0;
    for (const f of fs) { const b = k < 6 ? -600 + k * 180 : k < 14 ? 1200 + k * 40 : 1880 + k * 3, e = k % 5 ? ` ${b + 40 + (k % 7) * 6}` : '', bs = b < 0 ? `${-b} BCE` : String(b), es = !e ? '' : (+e < 0 ? ` ${-e} BCE` : e); await app.fileManager.processFrontMatter(f, fm => { fm.lifespan = `${bs} -${es}`; }); k++; }
    const base = `filters:\n  and:\n    - file.inFolder("Atlas/Films")\nviews:\n  - type: ideaverse-map\n    name: P\n    order:\n      - file.name\n      - lifespan\n      - genre\n`; const bf = app.vault.getAbstractFileByPath('People.base'); if (bf) await app.vault.modify(bf, base); else await app.vault.create('People.base', base); });
  await sleep(1500);
  await page.evaluate(async () => { await app.workspace.getLeaf('tab').openFile(app.vault.getAbstractFileByPath('People.base')); }); await sleep(6000);
  console.log(JSON.stringify(await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const p = v.map._posters(); return { cur: p.cur, across: p.across }; })));
  await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; v.hostEl.querySelector('#vcur').click(); }); await sleep(500);
  await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; v.hostEl.querySelector('#pmode button[data-pm="timeline"]').click(); }); await sleep(2500);
  console.log('hint:', await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; return v.hostEl.querySelector('#bhint').textContent; }));
  console.log('slider shown:', await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const b = v.hostEl.querySelector('#rng-across'); return b && !b.hidden && b.offsetParent !== null ? b.querySelector('.srange').textContent : 'no'; }));
  await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const [a] = v.hostEl.querySelectorAll('#rng-across input'); a.value = '1800'; a.dispatchEvent(new Event('input', { bubbles: true })); a.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(2000);
  console.log('after 1800:', await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; return v.hostEl.querySelector('#bhint').textContent + ' | ' + v.hostEl.querySelector('#rng-across .srange').textContent; }));
  await page.mouse.move(1599, 300); await shot('timeline-menu'); await page.mouse.click(1200, 950); await sleep(500); await page.mouse.move(1599, 300); await shot('timeline');
  console.log('errors:', errs.join(' | ') || 'none');
};
