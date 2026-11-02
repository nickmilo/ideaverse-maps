module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  await pick('Pace Layers'); await page.locator('.ivm-card-left .cardpin').click(); await sleep(800);
  await pick('Triangulation');
  console.log('arbtn', await page.evaluate(() => { const b = document.querySelector('.ivm #arbtn'); return b.hidden ? 'hidden' : b.disabled ? 'disabled' : 'ready'; }));
  await page.mouse.move(5, 950); await shot('arpin-before');
  await page.evaluate(() => document.querySelector('.ivm #arbtn').click()); await sleep(2500);
  console.log('ring', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._arenaList()));
  await shot('arpin-after'); console.log('errors:', errs.join(' | ') || 'none');
};
