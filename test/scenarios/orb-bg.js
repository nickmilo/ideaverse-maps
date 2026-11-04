module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500);
  const cr = await page.evaluate(() => document.querySelector('.ivm canvas').getBoundingClientRect().toJSON());
  const xy = t => page.evaluate(t => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.debug.__xy(t), t);
  const st = () => page.evaluate(() => [...document.querySelectorAll('.ivm-orbs .ivm-orb')].map(b => (b.classList.contains('cur') ? '*' : '') + b.querySelector('.orbsr').textContent).join(' | ') + ' · editor: ' + (document.querySelector('.ivm-card-left:not([hidden]) .cardt') || {}).textContent);
  console.log('start', await st());
  for (const t of ['Brian Eno', 'The Long Now']) { const a = await xy(t); await page.keyboard.down('Control'); await page.mouse.click(cr.x + a[0], cr.y + a[1]); await page.keyboard.up('Control'); await sleep(250); if (t === 'Brian Eno') await shot('bg-flash'); await sleep(1200); console.log('ctrl-click', t, '→', await st()); }
  await page.evaluate(() => document.querySelector('.ivm .vcur, .ivm #vmore') && document.querySelector('.ivm #vmore').click()); await sleep(500);
  console.log('keys', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].map(c => c.textContent.replace(/\s+/g, '')).join(' ')));
  console.log('errors:', errs.join(' | ') || 'none');
};
