module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm #filtpop button, .ivm #filtpop summary, .ivm #filtpop .fchip')].find(x => /^\s*•?\s*YEARS/i.test(x.textContent)); b && b.click(); }); await sleep(500);
  const cnt = () => page.evaluate(() => { const e = [...document.querySelectorAll('.ivm *')].find(x => x.children.length === 0 && / notes$/.test(x.textContent.trim())); return e ? e.parentElement.textContent.replace(/\s+/g, ' ').trim() : '?'; });
  for (const w of ['Week', 'Month', 'Year']) { await page.evaluate(w => { const b = [...document.querySelectorAll('.ivm .mtwin button')].find(x => x.textContent === w); b.click(); }, w); await sleep(1800); console.log(w, await cnt()); if (w === 'Week') await shot('ct-menu'); await page.keyboard.press('Escape'); await page.mouse.move(800, 990); await sleep(800); await shot('ct-' + w); await page.evaluate(() => document.querySelector('.ivm #filtbtn').click()); await sleep(400); }
  await page.evaluate(() => [...document.querySelectorAll('.ivm .mtwin button')].find(x => x.textContent === 'All').click()); await sleep(1500); console.log('All', await cnt());
  console.log('errors:', errs.join(' | ') || 'none');
};
