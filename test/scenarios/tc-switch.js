module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Journaling MOC'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  await page.mouse.move(1000, 950); await shot('c-corona');
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tclook button')][0].click()); await sleep(2500); await page.mouse.move(1000, 950); await sleep(300); await shot('c-tesla');
  await page.mouse.move(1000, 500); await page.mouse.down(); await page.mouse.move(1010, 505); await page.mouse.move(1020, 510); await page.mouse.up(); await sleep(1000); await shot('c-tesla-dragged');
  await page.locator('.ivm #vmore').first().click(); await sleep(400); console.log('menu', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].filter(c => !c.hidden).map(c => c.textContent.replace(/\s+/g, '')).join(' ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
