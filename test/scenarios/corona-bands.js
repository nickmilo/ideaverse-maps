module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #gocso').click()); await sleep(3000); await shot('cb-none');
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall()); const t = lh.find(l => l[1] > 300) || lh[0];
  await page.mouse.click(t[0] + 4, t[1] + 6); await sleep(1500); await shot('cb-sel');
};
