// ⋯ → Experimental → Sketches → Planet → Flat / Tabletop / Globe; Layout seg follows; drag right turns the globe right
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  await q('#vseg button[data-v="emergence"]').click(); await sleep(300); await shot('pm-emer');
  console.log('emergence order:', await page.evaluate(() => [...document.querySelectorAll('.ivm #emerpop .srow b')].map(b => b.textContent).join(' / ')));
  await page.keyboard.press('Escape');
  for (const m of ['flat', 'table', 'globe']) {
    await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
    if (m === 'flat') await shot('pm-menu');
    await q('#gopl' + m).click(); await sleep(2500); await shot('pm-' + m);
    console.log(m, '| view:', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| seg:', await page.evaluate(() => document.querySelector('.ivm #planetseg button[aria-pressed="true"]')?.textContent), '| legend:', (await q('#legend').textContent()).match(/Planet · \w+/)?.[0]);
  }
  const yaw0 = await page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__ivGlobe && 0);
  const box = await page.evaluate(() => { const r = document.querySelector('.ivm canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const cx = box[0] + 400 + (box[2] - 400)/2, cy = box[1] + box[3]/2;
  await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(cx + i*12, cy); await sleep(16); } await page.mouse.up(); await sleep(500); await shot('pm-dragright');
};
