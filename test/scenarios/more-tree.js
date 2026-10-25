module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(300);
  await page.evaluate(() => document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = !/Geometric|Unfinished/.test(d.querySelector('summary').textContent))); await sleep(300);
  console.log(await page.evaluate(() => { const out = []; const walk = (el, d) => { for (const c of el.children) { if (c.tagName === 'SUMMARY') continue; if (c.tagName === 'DETAILS') { out.push('  '.repeat(d) + '[' + c.querySelector(':scope>summary').textContent + '] open=' + c.open + ' x=' + (c.querySelector(':scope>summary').getBoundingClientRect().left|0)); walk(c, d + 1); } else if (c.offsetParent) out.push('  '.repeat(d) + c.textContent + ' x=' + (c.getBoundingClientRect().left|0)); else out.push('  '.repeat(d) + '(hidden) ' + c.textContent); } }; walk(document.querySelector('.ivm #vmorepop'), 0); return out.join('\n'); }));
  await page.locator('.ivm #vmorepop').screenshot({ path: process.env.SHOTS + '/more.png' });
  console.log('errors:', errs.join(' | ') || 'none');
};
