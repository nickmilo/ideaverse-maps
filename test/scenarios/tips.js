module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  console.log('titles left:', await page.evaluate(() => document.querySelectorAll('.ivm [title]').length), '| sync label:', await page.evaluate(() => document.querySelector('.ivm #follownote').getAttribute('aria-label')));
  const b = await page.evaluate(() => { const r = document.querySelector('.ivm #follownote').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; });
  await page.mouse.move(b[0] - 40, b[1]); await page.mouse.move(b[0], b[1], { steps: 4 }); const t0 = Date.now(); let ms = -1; for (let i = 0; i < 60; i++) { await sleep(50); if (await page.evaluate(() => !!document.querySelector('.tooltip, .tooltip-content, [class*=tooltip]'))) { ms = Date.now() - t0; break; } }
  console.log('Obsidian tooltip after ms:', ms); await shot('tip');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
