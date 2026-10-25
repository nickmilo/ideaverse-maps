module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('.ivm #disppop label.drow')].find(l => /way home/.test(l.textContent)).click()); await sleep(300);
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300);
  const m = () => 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.map';
  // a note far from Home: a level-1 note
  const p = await page.evaluate(() => { const fs = app.vault.getMarkdownFiles(); const c = fs.filter(f => /Calendar|Efforts/.test(f.path)); return (c[Math.floor(c.length / 3)] || fs[5]).path; });
  await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(p), p); await sleep(2500);
  await page.mouse.move(1599, 300); await shot('bacon-emergence');
  await page.evaluate(() => document.querySelector('.ivm #vseg button[data-v="ideaverse"]').click()); await sleep(8000);
  await page.evaluate(p => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map.openNote(p), p); await sleep(2500); await page.mouse.move(1599, 300); await shot('bacon-ideaverse');
  await page.evaluate(() => document.querySelector('.ivm #dispbtn').click()); await sleep(300);
  console.log('to row:', await page.evaluate(() => document.querySelector('.ivm .bacto').textContent));
  await page.evaluate(() => document.querySelector('.ivm .bacto .pchip').click()); await sleep(300);
  console.log('after use:', await page.evaluate(() => document.querySelector('.ivm .bacto').textContent));
  await page.evaluate(() => document.querySelector('.ivm .bcname').click()); await sleep(200); await page.keyboard.type('craft'); await sleep(300);
  console.log('hits:', await page.evaluate(() => [...document.querySelectorAll('.ivm .bchit')].map(b => b.textContent).join(' | ')));
  await page.locator('.ivm #disppop').screenshot({ path: process.env.SHOTS + '/bacon-find.png' });
  await page.keyboard.press('Enter'); await sleep(300);
  console.log('after pick:', await page.evaluate(() => document.querySelector('.ivm .bacto').textContent), 'open:', await page.evaluate(() => !document.querySelector('.ivm #disppop').hidden));
  await page.locator('.ivm #disppop').screenshot({ path: process.env.SHOTS + '/bacon-disp.png' });
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
