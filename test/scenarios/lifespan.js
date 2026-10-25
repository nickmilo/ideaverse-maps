module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(2000);
  const names = ['Ada Venn','Kai Moreau','Rui Okafor','June Halvorsen','Theo Lindqvist','Sol Arden','Nadia Sorel','Ines Tamura','Otto Brandt','Lea Fontaine'];
  await page.evaluate(async () => { const fs = app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Atlas/Films/')).slice(0, 40); let k = 0;
    for (const f of fs) { const b = 1900 + k * 2, e = k % 3 ? ` ${b + 50 + k}` : ''; await app.fileManager.processFrontMatter(f, fm => { fm.lifespan = `${b} -${e}`; }); k++; }
    const base = `filters:\n  and:\n    - file.inFolder("Atlas/Films")\nviews:\n  - type: ideaverse-map\n    name: P\n    order:\n      - file.name\n      - lifespan\n      - genre\n`; const bf = app.vault.getAbstractFileByPath('People.base'); if (bf) await app.vault.modify(bf, base); else await app.vault.create('People.base', base); });
  await sleep(1500);
  await page.evaluate(async () => { await app.workspace.getLeaf('tab').openFile(app.vault.getAbstractFileByPath('People.base')); }); await sleep(6000);
  console.log(JSON.stringify(await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; const p = v.map._posters(); return { cur: p.cur, across: p.across }; })));
  await page.evaluate(() => { const v = [...app.plugins.plugins['ideaverse-maps'].basesViews][0]; v.hostEl.querySelector('#vcur').click(); }); await sleep(500); await page.mouse.move(1599, 300); await shot('lifespan');
  console.log('errors:', errs.join(' | ') || 'none');
};
