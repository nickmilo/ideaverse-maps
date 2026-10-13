module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await page.evaluate(async () => { const leaf = app.workspace.getLeaf('split', 'vertical'); await leaf.openFile(app.vault.getMarkdownFiles()[5]); }); await sleep(800);
  await page.evaluate(() => app.workspace.revealLeaf(app.workspace.getLeavesOfType('ideaverse-maps')[0]));
  if (!(await q('#follownote').isVisible())) await q('#yearschip').click();
  if ((await q('#follownote').getAttribute('aria-pressed')) !== 'true') await q('#follownote').click(); await sleep(800);
  for (const k of [0, 2, 4]) { const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
    const t = lh[k] || lh[0]; await page.mouse.click(t[0] + 5, t[1] + 6); await sleep(900);
    console.log('clicked', t[4], '| editor:', await page.evaluate(() => app.workspace.getLeavesOfType('markdown')[0].view.file.basename), '| active is map:', await page.evaluate(() => app.workspace.activeLeaf.view.getViewType())); }
  console.log('trail:', await page.evaluate(() => [...document.querySelectorAll('.ivm .trail .cr span:last-child')].map(e => e.textContent).join(' | ')));
  await shot('twoway');
};
