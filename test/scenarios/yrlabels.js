module.exports = async ({ page, sleep }) => {
  if (process.env.DESK) { await page.evaluate(() => app.emulateMobile(false)); await sleep(3000); }
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await page.locator('.ivm #filtbtn').click(); await sleep(600);
  for (const v of [2020, 2023]) { await page.evaluate(v => { const r = document.querySelector('.ivm #ycol .dual input'); r.value = String(v); r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }, v); await sleep(700);
    const c = await page.evaluate(() => { const box = document.querySelector('.ivm #ycol .fhd'); return box.getBoundingClientRect(); });
    await page.screenshot({ path: process.env.SHOTS + '/yr-' + v + '.png', clip: { x: c.x, y: c.y - 4, width: c.width, height: c.height + 30 } });
    console.log(v, await page.evaluate(() => [...document.querySelectorAll('.ivm #ycol .srange > span')].map(s => s.textContent + '@' + Math.round(s.getBoundingClientRect().left) + (s.hidden ? '(h)' : '')).join(' '))); }
};
