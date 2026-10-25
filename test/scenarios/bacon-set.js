module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { app.setting.open(); app.setting.openTabById('ideaverse-maps'); }); await sleep(800);
  console.log('setting value:', await page.evaluate(() => { const s = [...document.querySelectorAll('.setting-item')].find(e => /Default note/.test(e.textContent)); return s && s.querySelector('input').value; }));
  await page.evaluate(() => { const s = [...document.querySelectorAll('.setting-item')].find(e => /Default note/.test(e.textContent)); const i = s.querySelector('input'); i.value = 'Craft root'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(500);
  await page.evaluate(() => app.setting.close()); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300);
  await page.evaluate(() => { const l = [...document.querySelectorAll('.ivm #disppop label.drow')].find(l => /way home/.test(l.textContent)); if (!l.querySelector('input').checked) l.click(); }); await sleep(300);
  console.log('to:', await page.evaluate(() => document.querySelector('.ivm .bacto').textContent));
  console.log('errors:', errs.join(' | ') || 'none');
};
