module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await sleep(6000); await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#gopeople'); document.querySelector('#gopeople').click(); }); await sleep(2500);
  // a person with a note: make one for the busiest cast member
  await page.evaluate(async () => { await app.vault.create('Atlas/Mae Corrigan.md', '---\nup: []\n---\nAn actor.\n').catch(() => {}); }); await sleep(3000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:rescan')); await sleep(3000);
  await page.evaluate(() => document.querySelector('.ivm #focusmode').click()); await sleep(300);
  await page.evaluate(() => { const f = app.vault.getAbstractFileByPath('Atlas/Mae Corrigan.md'); app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(f.path); }); await sleep(3000);
  await page.evaluate(() => { const b = document.querySelector('.ivm aside #dcol'); b && b.click(); }); await sleep(1500);
  await page.mouse.move(1599, 300); await shot('ppl-focus-person');
  console.log(await page.evaluate(() => document.querySelector('.ivm #focusbar').textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
