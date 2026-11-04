module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000);
  const st = () => page.evaluate(() => ({ sw: !document.querySelector('.ivm-sfsw').hidden, ck: !document.querySelector('.ivm .ivm-cockpit')?.hidden, lbl: document.querySelector('.ivm #vmore')?.textContent.trim(), ckw: app.plugins.plugins['ideaverse-maps'].data.state['iv-ckw'] }));
  console.log('chart', JSON.stringify(await st())); await shot('chart');
  await page.evaluate(() => [...document.querySelectorAll('.ivm-sfsw button')][1].click()); await sleep(4500);
  console.log('ship', JSON.stringify(await st())); await shot('ship');
  await page.mouse.click(1000, 500); await sleep(300); await page.keyboard.press('c'); await sleep(3000);
  console.log('back', JSON.stringify(await st()), 'sel', await page.evaluate(() => document.querySelector('.ivm-card-left .cardt')?.textContent)); await shot('back');
  console.log('errors:', errs.join(' | ') || 'none');
};
