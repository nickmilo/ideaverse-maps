module.exports = async ({ page, sleep, shot }) => {
  await page.setViewportSize ? null : null;
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(3000);
  await page.evaluate(() => { const c = document.querySelector('.ivm .editm input'); if (c && !c.checked) c.click(); });
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(600);
  await page.evaluate(() => { for (const l of document.querySelectorAll('.ivm #disppop label')) { if (/^(HUD links|Contrails)$/.test(l.textContent.trim())) { const c = l.querySelector('input'); if (c && !c.checked) c.click(); } } }); await sleep(500);
  const r = await page.evaluate(() => { const p = document.querySelector('.ivm #disppop'), b = p.getBoundingClientRect(); return [Math.round(b.height), p.scrollHeight, getComputedStyle(p).overflowY, [...p.children].filter(c => c.getBoundingClientRect().bottom > b.bottom + 2 && !c.hidden).length]; });
  console.log('pop', JSON.stringify(r)); await shot('disp');
  await page.mouse.move(300, 400); await page.evaluate(() => { const p = document.querySelector('.ivm #disppop'); p.scrollTop = 9999; }); await sleep(300); await shot('disp-end');
};
