module.exports = async ({ page, sleep, shot }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const cam = () => page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._cam().box));
  // tuck the legend and the dock away
  await page.evaluate(() => { const lc = document.querySelector('.ivm #legclose'); if (lc) lc.click(); }); await sleep(300);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); const b = d && d.querySelector('.lc, .acol, button[aria-label="Tuck animations away"]'); if (b) b.click(); }); await sleep(300);
  for (const k of ['3', '4', '2']) { await page.keyboard.press('Escape'); await page.keyboard.press(k); await sleep(2500);
    await page.locator('.ivm #zout').click(); await sleep(500); await page.locator('.ivm #zfit').click(); await sleep(1500);
    const nm = await page.evaluate(() => document.querySelector('.ivm #vmore').textContent.trim()); console.log(nm, await cam()); await shot('fc-' + nm.replace(/\W+/g, '')); }
};
