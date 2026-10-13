module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1000);
  await q('#dcol').click(); await sleep(800); await shot('collapsed');
  const lh2 = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  await page.mouse.click(lh2[2][0] + 5, lh2[2][1] + 6); await sleep(1000);
  console.log('tab:', await page.evaluate(() => document.querySelector('.ivm .dtab').textContent), 'aside hidden:', await page.evaluate(() => document.querySelector('.ivm aside').hidden));
  await q('.dtab').click(); await sleep(800); await shot('expanded');
  console.log('aside hidden after:', await page.evaluate(() => document.querySelector('.ivm aside').hidden));
};
