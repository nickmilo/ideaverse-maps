// Starfield's link colors match the note panel and the legend, in two themes
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  await page.evaluate(() => { const ad = document.querySelector('.ivm #animdock'); if (ad && !ad.classList.contains('collapsed')) ad.click(); const lt = document.querySelector('.ivm #legtab'); if (lt && !lt.hidden) lt.click(); }); await sleep(600);
  await page.locator('.ivm #q').fill('Jinba Ittai'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (const th of ['lyt', 'paper']) { await page.evaluate(t => document.querySelector(`.ivm #themeseg button[data-th="${t}"]`).click(), th); await sleep(1500); await page.mouse.move(5, 900); await sleep(500); await shot('colors-' + th); }
  console.log('errors:', errs.join(' | ') || 'none');
};
