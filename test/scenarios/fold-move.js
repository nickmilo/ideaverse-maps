module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Dossier on Nick'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  await page.evaluate(() => [...document.querySelectorAll('.ivm-card .sfold')].find(x => x.offsetParent).click()); await sleep(800); await shot('fm-modal');
  await page.keyboard.type('Atlas/Things'); await sleep(600); await page.keyboard.press('Enter'); await sleep(2500);
  console.log('moved', await page.evaluate(() => !!app.vault.getAbstractFileByPath('Atlas/Things/Dossier on Nick.md')));
  console.log('pill', await page.evaluate(() => [...document.querySelectorAll('.ivm-card .sfold')].find(x => x.offsetParent).textContent)); await shot('fm-after');
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Atlas/Things/Dossier on Nick.md'); if (f) await app.fileManager.renameFile(f, 'Efforts/Projects/Dossier on Nick.md'); }); await sleep(1000);
  console.log('errors:', errs.join(' | ') || 'none');
};
