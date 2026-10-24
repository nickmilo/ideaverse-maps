module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  await page.mouse.click(lh[1][0] + 5, lh[1][1] + 6); await sleep(1000);
  if (await q('.dtab').isVisible()) { await q('.dtab').click(); await sleep(500); }
  await q('#dfocus').click(); await sleep(1500); console.log('btn:', await q('#dfocus').textContent());
  await q('#dfocus').click(); await sleep(1500); console.log('btn after exit:', await q('#dfocus').textContent());
  
  await page.evaluate(async () => { const leaf = app.workspace.getLeaf('split', 'vertical'); await leaf.openFile(app.vault.getMarkdownFiles()[0]); }); await sleep(1200); await shot('narrow');
};
