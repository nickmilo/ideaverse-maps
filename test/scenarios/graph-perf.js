module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => { window.__ivReveal('#gograph'); document.querySelector('#gograph').click(); });
  const m = () => page.evaluate(() => JSON.stringify(app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map._graph()));
  for (let q = 0; q < 8; q++) { const t = Date.now(); const r = await m(); console.log(((Date.now() - t)) + 'ms rtt', r); await sleep(2000); }
};
