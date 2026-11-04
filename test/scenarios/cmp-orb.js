module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(4000); await page.mouse.move(800, 990); await sleep(500);
  const orbs = () => page.evaluate(() => [...document.querySelectorAll('.ivm-orbs .ivm-orb, .ivm-orbs button')].map(b => b.textContent.trim()).join(' | '));
  console.log('orbs before', await orbs());
  const b = await page.evaluate(() => { const e = document.querySelector('.ivm-pvl .ivm-pv.pved'); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, e.querySelector('.pvt').textContent]; });
  await page.mouse.move(b[0], b[1]); await page.keyboard.down('Shift'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Shift'); await sleep(2500);
  console.log('shift-clicked', b[2]); console.log('orbs after', await orbs()); await shot('orb');
  console.log('errors:', errs.join(' | ') || 'none');
};
