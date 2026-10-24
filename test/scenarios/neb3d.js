module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); });
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v=stars]').click()); await sleep(2500);
  await page.locator('.ivm #vseg button[data-v=stars]').click(); await sleep(300); await page.evaluate(() => document.querySelector('.ivm input[name=s3d][value="3d"]').click()); await page.keyboard.press('Escape'); await sleep(2500);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; });
  for (const [i, dx] of [[1, 0], [2, 260], [3, 260]]) { if (dx) { await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[0] + dx, box[1] + 40, { steps: 8 }); await page.mouse.up(); await sleep(800); } await shot('neb3d-' + i); }
};
