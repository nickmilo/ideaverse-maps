module.exports = async ({ page, sleep }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('3'); await sleep(1500);
  console.log(await page.evaluate(() => { document.querySelector('.ivm #mapsetbtn').click(); return [...document.querySelector('.ivm #laygrp').children].filter(e => !e.hidden).map(e => e.className + '#' + e.id).join(' || '); }));
};
