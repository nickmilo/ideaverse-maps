module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(4000);
  const list = () => page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].filter(c => !c.hidden).map(c => c.textContent.replace(/\s+/g, '')).join(' '));
  await page.locator('.ivm #vmore').first().click(); await sleep(400); console.log('menu', await list());
  await page.evaluate(() => document.querySelector('.ivm #gocsi').click()); await sleep(3000);
  await page.evaluate(() => document.querySelector('.ivm #mapoptsbtn, .ivm .mobtn') ? 0 : 0);
  const gear = await page.evaluate(() => { const b = [...document.querySelectorAll('.ivm header button')].find(x => x.querySelector('svg.lucide-settings') || /settings|Map settings/i.test(x.getAttribute('aria-label') || x.dataset.tip || '')); if (b) { b.click(); return true; } return false; }); await sleep(600);
  console.log('gear', gear, await page.evaluate(() => { const t = document.querySelector('.ivm #tclook'); return t ? (t.hidden ? 'hidden' : [...t.querySelectorAll('button')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' ')) : 'none'; }));
  await shot('tc-gear');
  await page.evaluate(() => [...document.querySelectorAll('.ivm #tclook button')][1].click()); await sleep(2500); await shot('tc-corona');
  console.log('after corona', await page.evaluate(() => [...document.querySelectorAll('.ivm #tclook button')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' ')), 'tclook visible', await page.evaluate(() => !document.querySelector('.ivm #tclook').hidden));
  // experimental drag
  await page.locator('.ivm #vmore').first().click(); await sleep(400);
  await page.evaluate(() => document.querySelectorAll('.ivm #vmorepop details').forEach(d => d.open = true)); await sleep(300);
  const grp = () => page.evaluate(() => { const d = [...document.querySelectorAll('.ivm #vmorepop details')].find(x => x.querySelectorAll(':scope > .chip').length > 2); return d ? [...d.querySelectorAll(':scope > .chip')].map(c => c.id).join(' ') : 'none'; });
  console.log('group before', await grp());
  const pos = await page.evaluate(() => { const d = [...document.querySelectorAll('.ivm #vmorepop details')].find(x => x.querySelectorAll(':scope > .chip').length > 2); const cs = d.querySelectorAll(':scope > .chip'); const a = cs[cs.length - 1].getBoundingClientRect(), b = cs[0].getBoundingClientRect(); return [a.x + 40, a.y + a.height / 2, b.y + 3]; });
  await page.mouse.move(pos[0], pos[1]); await page.mouse.down(); for (let q = 1; q <= 10; q++) { await page.mouse.move(pos[0], pos[1] + (pos[2] - pos[1]) * q / 10); await sleep(40); } await sleep(200); await page.mouse.up(); await sleep(500);
  console.log('group after', await grp());
  console.log('errors:', errs.join(' | ') || 'none');
};
