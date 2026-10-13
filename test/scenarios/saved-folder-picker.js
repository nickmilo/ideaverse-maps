module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const files = () => page.evaluate(() => app.vault.getFiles().filter(f => f.name.startsWith('Maps of the Ideaverse - saved')).map(f => f.path));
  await q('#viewbtn').click(); await sleep(300);
  console.log('folder btn:', await q('#vexport').textContent());
  await q('#recbtn').click(); await sleep(600);
  await page.keyboard.type('Atlas/Map Views'); await sleep(400); await shot('picker-new');
  await page.keyboard.press('ArrowDown'); await sleep(100);
  const sel = await page.locator('.suggestion-item.is-selected').textContent(); console.log('selected:', sel);
  await page.keyboard.press('Enter');
  await sleep(800);
  console.log('recording:', await q('#viewbtn').textContent());
  for (const k of [0, 1]) { const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall()); await page.mouse.click(lh[k][0] + 5, lh[k][1] + 6); await sleep(600); }
  await q('#recx').click(); await sleep(500); await q('#tname').fill('Two hubs'); await q('#tsavebtn').click(); await sleep(900);
  console.log('files:', JSON.stringify(await files()), 'folder btn:', await q('#vexport').textContent());
  await q('#vname').fill('A view'); await q('#vsave').click(); await sleep(900);
  console.log('file:', await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Atlas/Map Views/Maps of the Ideaverse - saved views.json'); const o = JSON.parse(await app.vault.read(f)); return o.views.map(v => v.name) + ' / ' + o.tours.map(t => t.name); }));
  // file wins on load: edit file, reopen map
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Atlas/Map Views/Maps of the Ideaverse - saved views.json'); const o = JSON.parse(await app.vault.read(f)); o.views[0].name = 'Edited in file'; await app.vault.modify(f, JSON.stringify(o)); });
  await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].detach()); await sleep(500);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas'); await sleep(1500);
  console.log('after reload:', JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivViews.list().map(v => v.name))));
  await q('#viewbtn').click(); await sleep(300); await shot('saved-folder');
};
