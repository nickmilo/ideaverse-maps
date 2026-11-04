// one scheme for opening notes (0.8.189)
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000);
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const xy = t => page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__xy(t), t);
  const orbs = () => page.evaluate(() => [...document.querySelectorAll('.ivm-orbs .ivm-orb, .ivm-orbs button')].map(b => b.textContent.trim()).filter(Boolean).join(' | '));
  const right = () => page.evaluate(() => { const c = document.querySelector('.ivm-card-right'); return c && !c.hidden ? c.querySelector('.cardt').textContent : 'closed'; });
  const clickWith = async (t, mods) => { const a = await xy(t); for (const m of mods) await page.keyboard.down(m); await page.mouse.click(cr.x + a[0], cr.y + a[1]); for (const m of mods) await page.keyboard.up(m); await sleep(1500); };
  console.log('start orbs', await orbs(), '· right', await right());
  await clickWith('Brian Eno', ['Control']); console.log('ctrl-click Brian Eno → orbs', await orbs());
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000);
  await clickWith('The Long Now', ['Control', 'Alt']); console.log('ctrl+alt-click The Long Now → right', await right());
  await clickWith('E-shaped Understanding', ['Shift']); console.log('shift-click → orbs', await orbs());
  await page.keyboard.press('Escape'); await page.mouse.click(cr.x + 700, cr.y + 300); await sleep(300); await page.keyboard.press('?'); await sleep(600); await shot('keycard');
  console.log('errors:', errs.join(' | ') || 'none');
};
