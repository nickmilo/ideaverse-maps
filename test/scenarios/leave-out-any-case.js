// Leave out matches folders whatever their capitals, and the setting flags folders that don't exist
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const count = () => page.evaluate(() => document.querySelector('.ivm #stats').textContent);
  console.log('before:', await count());
  const err = await page.evaluate(() => { const t = app.setting.pluginTabs.find(t => t.id === 'ideaverse-maps'); try { t.display(); } catch (e) { return 'ERR ' + e.message; }
    document.body.appendChild(t.containerEl); t.containerEl.addClass('ivm-test-settings'); t.containerEl.setCssStyles({ position: 'fixed', inset: '40px 200px', background: 'var(--background-primary)', zIndex: 999, overflow: 'auto', padding: '20px' }); return ''; });
  if (err) console.log(err); await sleep(500);
  const ta = page.locator('.ivm-test-settings textarea').first();
  await ta.fill('atlas/dots\nNo Such Folder'); await sleep(500);
  console.log('warning:', await page.locator('.ivm-test-settings .ivm-miss').first().textContent());
  await shot('leave-out-setting');
  await page.locator('.ivm-test-settings button', { hasText: 'Rescan now' }).click(); await page.evaluate(() => document.querySelector('.ivm-test-settings').remove()); await sleep(4000);
  console.log('after:', await count());
  console.log('Atlas/Dots notes in scan:', await page.evaluate(() => app.plugins.plugins['ideaverse-maps'].graph.nodes.filter(n => n.path.startsWith('Atlas/Dots/')).length));
  await shot('leave-out-after');
};
