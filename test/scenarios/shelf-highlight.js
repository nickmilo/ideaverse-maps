// Bookshelf: Efforts panel lights up areas and projects; Shelve by Subfolder; leaning books hover
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#goshelf').click(); await sleep(2500);
  await q('#effbtn').click(); await sleep(400);
  const btns = page.locator('.ivm #efflist [data-ef]'); console.log('efforts listed:', await btns.count());
  await btns.nth(0).click(); await sleep(300); await btns.nth(1).click(); await sleep(300); await btns.nth(2).click(); await sleep(500);
  console.log('panel says:', await page.evaluate(() => document.querySelector('.ivm #effpanel .pn').textContent.slice(0, 40)));
  await shot('hi-panel'); await page.evaluate(() => document.querySelector('.ivm #efx').click()); await sleep(600); await shot('hi-shelf');
  await q('#shelfsort button[data-ss="folder"]').click(); await sleep(1800);
  for (let i = 0; i < 5; i++) { await page.mouse.move(700, 560); await page.mouse.wheel(0, -250); await sleep(120); } await sleep(700); await shot('hi-folder');
};
