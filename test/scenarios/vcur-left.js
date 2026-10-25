module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { document.querySelector('.ivm #vmore').click(); document.querySelector('.ivm #gobuilder').click(); }); await sleep(3000);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(500); await page.mouse.move(1599, 300); await shot('vl-builder');
  console.log(await page.evaluate(() => { const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return s + ' x' + Math.round(b.left) + '-' + Math.round(b.right); }; return [r('.ivm #vcur'), r('.ivm #vseg'), r('.ivm #mapopts')].join(' | '); }));
  await page.mouse.click(1000, 900); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #disppop label.drow input').click()); await sleep(500);
  await page.evaluate(() => document.querySelector('.ivm #vcur').click()); await sleep(500); await page.mouse.move(1599, 300); await shot('vl-grid');
  console.log(await page.evaluate(() => { const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return s + ' x' + Math.round(b.left) + '-' + Math.round(b.right); }; return [r('.ivm #vcur'), r('.ivm #vseg'), r('.ivm .vgrid'), r('.ivm #mapopts')].join(' | '); }));
  console.log('errors:', errs.join(' | ') || 'none');
};
