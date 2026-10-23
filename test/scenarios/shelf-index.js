// Bookshelf → Index: call-number panel, filter, click to find, copy as Markdown
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  console.log('Index on Emergence:', await q('#callbtn').isVisible());
  await q('#vmore').click(); await sleep(300); await q('#mexp > summary').click(); await sleep(200);
  await q('#goshelf').click(); await sleep(2500);
  await q('#callbtn').click(); await sleep(600); await shot('index');
  console.log('rows:', await page.locator('.ivm #calllist [data-cm]').count(), '| hubs:', await page.locator('.ivm #calllist h6').count());
  await page.locator('.ivm #calllist [data-cm]').nth(3).click(); await sleep(1200); await shot('index-click');
  const md = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivCallMd()); console.log('md:\n' + md.split('\n').slice(0, 8).join('\n'));
  await q('#callq').fill('2.'); await sleep(300); console.log('filtered "2.":', await page.locator('.ivm #calllist [data-cm]').count());
  await q('#shelfsort button[data-ss="az"]').click(); await sleep(1500); console.log('A–Z panel:', (await q('#calllist').textContent()).slice(0, 80));
  await q('#efbtn, #effbtn').click(); await sleep(300); console.log('index closed by Efforts:', await q('#callpanel').isHidden());
};
