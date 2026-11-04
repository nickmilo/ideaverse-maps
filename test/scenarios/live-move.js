// a note moved live (0.8.175): Efforts/Projects → Atlas, and the folder pill
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Dossier on Nick'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  await page.mouse.move(800, 990); await shot('mv-before');
  console.log('pill', await page.evaluate(() => [...document.querySelectorAll('.ivm-card .sfold')].map(e => e.textContent + ' | ' + e.getAttribute('aria-description')).join(' ; ')));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Efforts/Projects/Dossier on Nick.md'); await app.fileManager.renameFile(f, 'Atlas/Dossier on Nick.md'); });
  await sleep(450); await shot('mv-mid'); await sleep(2000); await shot('mv-after');
  console.log('pill', await page.evaluate(() => [...document.querySelectorAll('.ivm-card .sfold')].map(e => e.textContent + ' | ' + e.getAttribute('aria-description')).join(' ; ')));
  await page.evaluate(async () => { const f = app.vault.getAbstractFileByPath('Atlas/Dossier on Nick.md'); await app.fileManager.renameFile(f, 'Efforts/Projects/Dossier on Nick.md'); }); await sleep(1500);
  console.log('errors:', errs.join(' | ') || 'none');
};
