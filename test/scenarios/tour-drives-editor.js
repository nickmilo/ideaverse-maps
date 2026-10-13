module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  const q = s => page.locator('.ivm ' + s).first();
  if ((await q('#follownote').getAttribute('aria-pressed')) !== 'true') await q('#follownote').click();
  const ed = () => page.evaluate(() => app.workspace.getLeavesOfType('markdown').map(l => l.view.file && l.view.file.path).join(' | '));
  await q('#viewbtn').click(); await sleep(300); await q('#tlist .vgo').first().click(); await sleep(1800);
  const t = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivTours.run());
  console.log('stop1', JSON.stringify(await t()), '| editor:', await ed());
  await q('#tnext').click(); await sleep(800);
  console.log('stop2', JSON.stringify(await t()), '| editor:', await ed());
  console.log('map still active:', await page.evaluate(() => app.workspace.getActiveViewOfType(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.constructor) != null));
};
