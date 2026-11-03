module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const M = () => page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ck()));
  await page.locator('.ivm #q').fill('OODA Loop'); await sleep(700); await page.keyboard.press('Enter');
  for (let q = 0; q < 6; q++) { await sleep(500); console.log(q, await M()); }
};
