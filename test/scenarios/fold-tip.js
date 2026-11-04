module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  const r = await page.evaluate(() => { const e = [...document.querySelectorAll('.ivm-card .sfold')].find(x => x.offsetParent); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  await page.mouse.move(r[0], r[1]); await sleep(400);
  console.log('tip', await page.evaluate(() => { const t = document.querySelector('.sfold-tip'); return t ? t.textContent + ' ' + JSON.stringify(t.getBoundingClientRect()) : 'none'; }));
  await shot('tip');
};
