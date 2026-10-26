module.exports = async ({ page, sleep }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.keyboard.press('8'); await sleep(1500); await page.keyboard.press('3'); await sleep(1500);
  await page.locator('.ivm #mapsetbtn').click(); await sleep(600); await page.screenshot({ path: '/tmp/claude-0/-home-claude/05224be7-a0ce-513e-be4a-53131a61e984/scratchpad/mm/dbg.png' });
  console.log(await page.evaluate(() => { const m = document.querySelector('.ivm #mapopts .mol'); return m.hidden + ' ' + getComputedStyle(m).display + ' ' + m.className + ' parent:' + m.parentElement.id; }));
  console.log(await page.evaluate(() => [...document.querySelector('.ivm #laygrp').children].filter(e => !e.hidden).map(e => e.className + '#' + e.id + ':' + e.textContent.slice(0, 30)).join(' || ')));
};
