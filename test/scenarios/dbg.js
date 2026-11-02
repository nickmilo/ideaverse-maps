module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); console.log(JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._ckdbg())));
};
