module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  console.log('LV5', JSON.stringify(await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__lv5())));
  console.log(await page.evaluate(() => [...document.querySelectorAll('.ivm-orbs .ivm-orb')].map(b => b.className).join(' | ')));
  const r = await page.evaluate(() => { const b = document.querySelector('.ivm-orbs').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
  await page.screenshot({ path: process.env.SHOTS + '/orbs.png', clip: { x: r[0] - 20, y: r[1] - 10, width: r[2] + 40, height: r[3] + 20 } });
};
