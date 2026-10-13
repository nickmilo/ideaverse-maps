module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const crumbs = () => page.evaluate(() => [...document.querySelectorAll('.ivm .trail .cr span:last-child')].map(e => e.textContent).join(' ← '));
  for (const k of [0, 1, 2]) { const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall()); await page.mouse.click(lh[k][0] + 5, lh[k][1] + 6); await sleep(900); }
  console.log('before:', await crumbs());
  await page.locator('.ivm .trail .cr').last().click(); await sleep(1000);
  console.log('after :', await crumbs());
};
