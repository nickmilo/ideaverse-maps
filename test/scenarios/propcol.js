module.exports = async ({ page, sleep }) => {
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000); const st = () => page.evaluate(() => { const m = document.querySelector('.ivm-card-left .metadata-container'); return m ? m.classList.contains('is-collapsed') : null; });
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000);
  console.log('first', await st()); await page.evaluate(() => document.querySelector('.ivm-card-left .metadata-properties-heading').click()); await sleep(300); console.log('clicked', await st());
  await page.locator('.ivm #q').fill('OODA Loop'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000); console.log('next note', await st());
};
