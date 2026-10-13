// Sensemaking: switch to it, pick a note (panel explains its placement), year range, time-lapse, narrow width
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vseg button[data-v="sense"]').click(); await sleep(2000); await shot('sense');
  console.log('view:', await page.evaluate(() => document.querySelector('.ivm').dataset.view));
  const lh = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivLHall());
  console.log('labels:', lh.length);
  if (lh.length) { await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1200); }
  console.log('panel:', (await page.evaluate(() => { const a = document.querySelector('.ivm aside'); return a && !a.hidden ? a.innerText.replace(/\s+/g, ' ').slice(0, 300) : 'closed'; })));
  await shot('sense-note');
  await q('#vseg button[data-v="sense"]').click(); await sleep(300);
  console.log('second click opened AI popover:', await page.evaluate(() => !document.querySelector('.ivm #sensepop').hidden));
  await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivSense.set(40)); await sleep(1500);
  console.log('time-lapse at step 40 of', await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivSense.steps()), 'date:', await q('#tldate').textContent());
  await shot('sense-lapse');
  await page.evaluate(() => require('@electron/remote').getCurrentWindow().setSize(700, 1000)); await sleep(1500); await shot('sense-narrow');
};
