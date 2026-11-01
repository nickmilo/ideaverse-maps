module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  for (const [k, th, f] of [['3', 'lyt', 'sel-stars'], ['1', 'paper', 'sel-emer']]) { await page.keyboard.press(k); await sleep(2500); await page.evaluate(t => document.querySelector(`.ivm #themeseg button[data-th="${t}"]`).click(), th);
    await page.locator('.ivm #q').fill('Triangulation'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const dc = page.locator('.ivm #dcol'); if (await dc.isVisible()) await dc.click(); await sleep(1200); await page.mouse.move(5, 900); await shot(f); }
  console.log('errors:', errs.join(' | ') || 'none');
};
