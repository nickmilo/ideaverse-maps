module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); });
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v=gravity]').click()); await sleep(2000);
  await page.evaluate(() => document.querySelector('.ivm #xseg button[data-x=ace]').click()); await sleep(1500);
  await page.locator('.ivm #filtbtn').click(); await page.locator('.ivm #collbtn').click(); await sleep(400); console.log('list:', await page.evaluate(() => document.querySelector('.ivm #colllist').innerText.replace(/\s+/g, ' ').slice(0, 300))); await page.locator('.ivm #collq').fill('movie'); await sleep(400);
  await page.evaluate(() => { const c = document.querySelector('.ivm #colllist input[type=checkbox]'); c.click(); }); await sleep(1500);
  console.log('stats:', await page.evaluate(() => document.querySelector('.ivm #stats').textContent), '| vis count:', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall().length));
  await page.keyboard.press('Escape'); await sleep(800); await shot('coll-movies');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
