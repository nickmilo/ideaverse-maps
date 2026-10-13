module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 60000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  // click a level-5 label: Home
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  console.log('labels', lh.length, lh.slice(0, 3).map(x => x[4]).join(' | '));
  const t = lh.find(x => x[4] !== 'Home') || lh[0]; await page.mouse.click(t[0] + 5, t[1] + 6); await sleep(1200); await shot('selected');
  await q('#dopen').click(); await sleep(1200); await shot('opened');
  console.log('leaves', await page.evaluate(() => app.workspace.getLeavesOfType('markdown').map(l => l.view.file && l.view.file.path)));
  await page.evaluate(() => app.workspace.revealLeaf(app.workspace.getLeavesOfType('ideaverse-maps')[0]));
  await q('#vseg button[data-v="gravity"]').click(); await sleep(1500); await shot('gravity');
  await q('#vseg button[data-v="stars"]').click(); await sleep(2000); await shot('stars');
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); }); await sleep(800); await q('#vseg button[data-v="stars"]').click(); await sleep(300); await q('input[name="s3d"][value="3d"]').check(); await sleep(2000); await shot('stars3d');
  await q('#tlplay').click(); await sleep(6000); await shot('stars-timelapse');
  await q('#tlall').click(); await sleep(500);
  await q('#vseg button[data-v="emergence"]').click(); await sleep(1200);
  await q('#themeseg button[data-th="dark"]').click(); await sleep(600); await q('#tlplay').click(); await sleep(5000); await shot('emergence-dark-tl');
  await q('#tlplay').click(); await q('#foldbtn').click(); await sleep(400); await shot('folders');
};
