module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(6000);
  const st = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__lc30());
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  await page.mouse.move(800, 600); await sleep(300); await shot('b0'); let s = await st(); console.log('start', JSON.stringify(s));
  const click = async act => { const b = (await st())[1].find(q => q[2] === act); if (!b) return console.log('no', act); await page.mouse.click(cr.x + b[0], cr.y + b[1]); await sleep(1300); };
  await click(1); await click(1); console.log('after 2x Earlier', (await st())[0]); await shot('b2');
  await page.keyboard.press('ArrowUp'); await sleep(1200); console.log('after ↑', (await st())[0]);
  await page.mouse.move(800, 600); await page.mouse.wheel(0, -40); await sleep(50); await page.mouse.wheel(0, -40); await sleep(50); await page.mouse.wheel(0, -400); await sleep(1300); console.log('after one scroll gesture', (await st())[0]);
  await page.keyboard.press('ArrowDown'); await sleep(1200); console.log('after ↓', (await st())[0]);
  await click('today'); console.log('after Today', (await st())[0]); await shot('b-today');
  console.log('errors:', errs.join(' | ') || 'none');
};
