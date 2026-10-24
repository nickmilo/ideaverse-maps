module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(async () => { const p = app.plugins.plugins['ideaverse-maps']; p.settings.viewsFolder = ''; await p.saveSettings(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.locator('.ivm #viewbtn').click(); await sleep(300); await page.locator('.ivm #vname').fill('First view'); await page.locator('.ivm #vsave').click(); await sleep(800);
  console.log('note:', await page.evaluate(() => (document.querySelector('.ivm-pick-note') || {}).textContent));
  await shot('pick-note');
};
