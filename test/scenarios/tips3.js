module.exports = async ({ page, sleep }) => {
  await sleep(1500);
  console.log(await page.evaluate(() => { const o = require('obsidian'); return typeof o.setTooltip; }).catch(e => 'n/a ' + e.message));
};
