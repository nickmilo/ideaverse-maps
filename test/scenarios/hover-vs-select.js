// hovering fades the other notes gently; clicking fades them fully. Tooltip says "in the ideaverse" and lets the map show through.
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  const t = lh[1]; await page.mouse.move(t[0] + 5, t[1] + 6); await sleep(800); await shot('hover');
  console.log('tip:', await page.evaluate(() => document.querySelector('.ivm-tip').innerText));
  await page.mouse.click(t[0] + 5, t[1] + 6); await sleep(1500); await page.mouse.move(t[0] + 5, t[1] + 6); await sleep(600); await shot('selected');
};
