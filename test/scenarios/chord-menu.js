module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #xseg button[data-x=ace]').click()); await sleep(1200);
  await page.locator('.ivm #vseg button[data-v=emergence]').click(); await sleep(400); await shot('menu-emer-ace');
  await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('.ivm #gochord').click()); await sleep(2500);
  await page.locator('.ivm #vcur').click(); await sleep(400);
  console.log('chord menu: subctl shown?', await page.evaluate(() => { const e = document.querySelector('.ivm #subctl'); return e.getBoundingClientRect().width > 0; }), '| text:', await page.evaluate(() => document.querySelector('.ivm #mapopts').innerText.replace(/\s+/g, ' ')));
  await shot('menu-chord');
};
