// Starfield Focus framing: the note centred, its galaxy's hub just inside the edge
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('3'); await sleep(3000);
  for (const [nm, f] of [['Pace Layers', 'sfocus-pace'], ['Affordances', 'sfocus-aff']]) {
    await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(2000); await page.evaluate(() => document.activeElement && document.activeElement.blur());
    if (f === 'sfocus-pace') await page.keyboard.press('n'); else { await page.keyboard.press('n'); await sleep(500); await page.keyboard.press('n'); }
    await sleep(3000); await page.mouse.move(5, 900); await shot(f); }
  console.log('errors:', errs.join(' | ') || 'none');
};
