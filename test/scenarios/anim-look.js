module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  await page.evaluate(() => { const d = document.querySelector('.ivm #animdock'); if (d.hidden) document.querySelector('.ivm #anitab').click(); }); await sleep(400);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm #animdock').getBoundingClientRect(); return { x: r.left - 4, y: r.top - 4, width: r.width + 8, height: r.height + 8 }; });
  await page.screenshot({ path: '/tmp/claude-0/shots-t/anim-look.png', clip: box });
  await page.evaluate(() => { const r = document.querySelector('.ivm #tlrange'); r.value = 30; r.dispatchEvent(new Event('input')); }); await sleep(500);
  await page.screenshot({ path: '/tmp/claude-0/shots-t/anim-look2.png', clip: box });
};
