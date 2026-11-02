// 0.8.44: back/forward in the main editor; Arena's ring button
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.keyboard.press('3'); await sleep(2500);
  await page.locator('.ivm #dispbtn').click(); await sleep(300); await page.locator('.ivm .editm').click(); await sleep(300);
  await page.locator('.ivm .editopts .eosw', { hasText: 'left side' }).click(); await sleep(300); await page.locator('.ivm #dispbtn').click(); await sleep(800);
  const pick = async nm => { await page.locator('.ivm #q').fill(nm); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  const left = () => page.evaluate(() => (document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent);
  await pick('Pace Layers'); await pick('Triangulation'); await pick('Affordances'); console.log('now', await left());
  await page.locator('.ivm-card-left .cardnav').first().click(); await sleep(2500); console.log('back', await left());
  await page.locator('.ivm-card-left .cardnav').first().click(); await sleep(2500); console.log('back', await left());
  await page.locator('.ivm-card-left .cardnav').nth(1).click(); await sleep(2500); console.log('forward', await left());
  await page.mouse.move(5, 900); await shot('nav');
  await page.evaluate(() => document.querySelector('.ivm #goarena').click()); await sleep(3000);
  await pick('Sensemaking MOC'); await sleep(1500);
  console.log('arbtn', await page.evaluate(() => { const b = document.querySelector('.ivm #arbtn'); return b ? (b.hidden ? 'hidden' : b.disabled ? 'disabled' : 'ready') : 'none'; }));
  await page.evaluate(() => document.querySelector('.ivm #arbtn').click()); await sleep(2500);
  console.log('ring', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._arenaList()));
  await page.mouse.move(5, 900); await shot('ring-after');
  console.log('errors:', errs.join(' | ') || 'none');
};
