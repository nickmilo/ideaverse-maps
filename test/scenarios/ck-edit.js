module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2000);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  await page.locator('.ivm #q').fill('Triangulation'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.mouse.move(5, 950); await sleep(800);
  const box = await page.evaluate(() => { const e = [...document.querySelectorAll('.ivm .ckpv')].find(x => !x.hidden); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, e.querySelector('.pvt').textContent]; });
  console.log('preview', JSON.stringify(box)); if (!box) return;
  await page.mouse.move(box[0], box[1]); await sleep(300); await page.mouse.down(); await page.mouse.up(); await sleep(2500); await shot('editing');
  console.log('editor', await page.evaluate(() => !!document.querySelector('.ivm .ckedit .cm-content')));
  await page.keyboard.press('End'); await page.keyboard.type(' ZZEDITTEST'); await sleep(1500);
  await page.keyboard.press('Escape'); await sleep(800); console.log('closed', await page.evaluate(() => !document.querySelector('.ivm .ckedit')));
  console.log('errors:', errs.join(' | ') || 'none');
};
