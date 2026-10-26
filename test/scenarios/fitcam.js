module.exports = async ({ page, sleep }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  const cam = () => page.evaluate(() => { const l = app.workspace.getLeavesOfType('ideaverse-maps')[0]; const m = l.view.map || l.view.app_ || l.view.mapApp; return m ? JSON.stringify(m._cam()) : Object.keys(l.view).join(','); });
  for (const k of ['7', '2', '6']) { await page.keyboard.press('Escape'); await page.keyboard.press(k); await sleep(2500); console.log('open', await cam());
    await page.locator('.ivm #zout').click(); await sleep(500); console.log('out ', await cam()); await page.locator('.ivm #zfit').click(); await sleep(1200); console.log('fit ', await cam()); }
};
