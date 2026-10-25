module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gograph').click(); }); await sleep(8000);
  await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote('Home.md')); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #dfocus').click()); await sleep(1000);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm #focusbar button')].find(b => b.textContent.trim() === '2'); b && b.click(); }); await sleep(6000);
  await page.mouse.move(1599, 300); await shot('ff-before');
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(500);
  const set = (k, v) => page.evaluate(([k, v]) => { const r = document.querySelectorAll('.ivm #gfctl input')[k]; r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); }, [k, v]);
  await set(0, 0.02); await sleep(300); await set(1, 150); await sleep(5000);
  await page.evaluate(() => { const r = document.querySelectorAll('.ivm #gfctl input')[1]; r.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(3000);
  await page.mouse.click(1000, 950); await sleep(300); await page.mouse.move(1599, 300); await shot('ff-after');
  console.log('errors:', errs.join(' | ') || 'none');
};
