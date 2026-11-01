// Display → Starfield link colors on Emergence; a signpost in Focus moves the focus
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); await page.keyboard.press('1'); await sleep(2500);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(2500); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.locator('.ivm #dispbtn').click(); await sleep(400); await page.locator('.ivm .sflinks').click(); await sleep(800); await page.keyboard.press('Escape'); await sleep(800);
  await page.evaluate(() => { const lt = document.querySelector('.ivm #legtab'); if (lt && !lt.hidden) lt.click(); }); await sleep(600); await page.mouse.move(5, 900); await shot('sf-emergence');
  // Star Chart in Focus: click a signpost
  await page.keyboard.press('3'); await sleep(2500); await page.locator('.ivm #mapsetbtn').click(); await sleep(400); await page.locator('.ivm input[name="s3d"][value="chart"]').click(); await sleep(1500); await page.keyboard.press('Escape'); await sleep(600);
  await page.keyboard.press('n'); await sleep(3000); await shot('sf-focus1');
  const pt = await page.evaluate(() => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view; return null; });
  console.log('errors:', errs.join(' | ') || 'none');
};
