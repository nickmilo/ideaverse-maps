module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  if (await q('.htab').isVisible()) await q('.htab').click();
  await q('#xseg button[data-x="ace"]').click(); await sleep(1200);
  await q('#viewbtn').click(); await sleep(300);
  await q('#vname').fill('Atlas by folder'); await q('#vsave').click(); await sleep(300);
  await q('#recbtn').click(); await sleep(300);
  for (const k of [0, 1, 2]) { const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall()); await page.mouse.click(lh[k][0] + 5, lh[k][1] + 6); await sleep(700); }
  console.log('chip while recording:', await q('#viewbtn').textContent());
  await q('#recx').click(); await sleep(500); await q('#tname').fill('Three hubs'); await q('#tsavebtn').click(); await sleep(400);
  await shot('saved-pop');
  console.log('folder chip:', await q('#vexport').textContent()); await page.keyboard.press('Escape'); await page.evaluate(() => document.body.click()); await sleep(300);
  await q('#xseg button[data-x="time"]').click(); await sleep(900);
  await q('#viewbtn').click(); await sleep(300); await page.locator('.ivm #vlist .vgo', { hasText: 'Atlas by folder' }).first().click(); await sleep(1200);
  console.log('after applying view, ACE pressed:', await q('#xseg button[data-x="ace"]').getAttribute('aria-pressed'));
  await q('#viewbtn').click(); await sleep(300); await q('#tlist .vgo').first().click(); await sleep(2500);
  console.log('tour bar:', await page.evaluate(() => document.querySelector('.ivm #tlabel').textContent));
  await shot('tour');
};
