module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.emulateMobile && app.emulateMobile(true)); await sleep(4000);
  await page.evaluate(async () => { if (!app.plugins.plugins['ideaverse-maps']) await app.plugins.enablePlugin('ideaverse-maps'); }); await sleep(1000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  console.log(await page.evaluate(() => ['header', '.tbl', '.tbr', '#vsegms', '#vseg', '.ivm'].map(s => { const e = document.querySelector(s === '.ivm' ? '.ivm' : '.ivm ' + s); const r = e.getBoundingClientRect(); return s + ' x' + Math.round(r.left) + ' w' + Math.round(r.width); }).join(' | '))); console.log(await page.evaluate(() => { const t = document.querySelector('.ivm .tbr'); return 'tbr ' + Math.round(t.getBoundingClientRect().width) + ' | ' + [...t.children].map(c => (c.id || c.className) + ':' + Math.round(c.getBoundingClientRect().width) + ' min=' + getComputedStyle(c).minWidth + ' flex=' + getComputedStyle(c).flex).join(' | '); }));
};
