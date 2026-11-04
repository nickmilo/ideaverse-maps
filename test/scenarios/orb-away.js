module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const xy = t => page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__xy(t), t);
  const orbs = () => page.evaluate(() => [...document.querySelectorAll('.ivm-orbs .ivm-orb')].map(b => (b.classList.contains('cur') ? '*' : '') + b.querySelector('.orbsr').textContent).join(' | '));
  console.log('start', await orbs());
  await page.keyboard.press('Escape'); await sleep(1200); console.log('let go', await orbs());
  const a = await xy('Pace Layers') && await page.evaluate(() => { const d = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug; for (const t of ['Concepts Map', 'Skill Map', 'LYT Home', 'Habits Map']) { const p = d.__xy(t); if (p) return p; } return null; }); console.log('target', JSON.stringify(a));
  await page.mouse.click(cr.x + a[0], cr.y + a[1]); await sleep(1500); console.log('picked another', await orbs());
  const b2 = await page.evaluate(() => { const d = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug; for (const t of ['Habits Map', 'LYT Home', 'Skill Map']) { const p = d.__xy(t); if (p) return p; } return null; }); if (b2) { await page.mouse.click(cr.x + b2[0], cr.y + b2[1]); await sleep(1500); console.log('picked The Long Now', await orbs()); }
  console.log('errors:', errs.join(' | ') || 'none');
};
