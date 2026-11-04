module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(6000);
  await page.evaluate(() => { window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false }); });
  const go = async (q, lbl) => { await page.evaluate(() => { window.__lt = []; }); await page.locator('.ivm #q').fill(q); await sleep(900); await page.keyboard.press('Enter'); await sleep(5000);
    const r = await page.evaluate(() => [window.__lt.length, window.__lt.reduce((s, x) => s + x, 0), Math.max(0, ...window.__lt), document.querySelectorAll('.ivm-pvl .ivm-pv').length, document.querySelectorAll('.ivm-pvl .bases-view, .ivm-pvl .block-language-base, .ivm-pvl .internal-embed').length]);
    console.log(lbl, 'longtasks n/total/max ms, previews, embeds', JSON.stringify(r)); };
  await go('2023-03 - Trip to England', 'A');
  await go('Pace Layers', 'B');
  await go('2023-03 - Trip to England', 'C');
};
