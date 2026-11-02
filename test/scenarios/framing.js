// Framing with the left editor: pick 2022-10 on Emergence, click Monthly Notes in the editor; where does it land vs the free space?
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  await page.evaluate(() => { for (const sp of [app.workspace.leftSplit, app.workspace.rightSplit]) if (sp && !sp.collapsed) sp.collapse(); });
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(6000);
  const M = () => page.evaluate(() => app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map);
  const where = async (p, tag) => { const r = await page.evaluate(p_ => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, cv = document.querySelector('.ivm #cv').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.ivm-card')].filter(c => c.offsetParent).map(c => { const b = c.getBoundingClientRect(); return [c.className.replace(/\s+/g, '.'), Math.round(b.left - cv.left), Math.round(b.right - cv.left)]; });
      const dr = document.querySelector('.ivm #drawer'); const db = dr && !dr.hidden ? dr.getBoundingClientRect() : null;
      return { at: m._at(p_), cvw: Math.round(cv.width), cards, drawerL: db ? Math.round(db.left - cv.left) : null }; }, p);
    console.log(tag, JSON.stringify(r)); };
  for (const p of ['Calendar/Days/x/2022/2022-10.md']) { await page.locator('.ivm #q').fill('2022-10'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3500); }
  await where('Calendar/Days/x/2022/2022-10.md', 'picked 2022-10'); await shot('fr-1');
  const ok = await page.evaluate(() => { const a = [...document.querySelectorAll('.ivm-card .internal-link, .ivm-card .cm-hmd-internal-link')].find(e => e.textContent.trim() === 'Monthly Notes'); if (!a) return false; a.scrollIntoView(); return true; });
  console.log('link found', ok);
  const box = await page.evaluate(() => { const a = [...document.querySelectorAll('.ivm-card .internal-link, .ivm-card .cm-hmd-internal-link')].find(e => e.textContent.trim() === 'Monthly Notes'); const b = a.getBoundingClientRect(); return [b.left + 6, b.top + b.height / 2]; });
  await page.mouse.click(box[0], box[1]); await sleep(3000);
  await where('Atlas/Collections/Monthly Notes.md', 'after link'); await shot('fr-2');
  // a click on a note on the map, and a search, with the left editor open
  const pt = await page.evaluate(() => { const m = app.workspace.getLeavesOfType('ideaverse-maps')[0].view.map, cv = document.querySelector('.ivm #cv').getBoundingClientRect(), a = m._at('Calendar/Days/x/2022/2022-10.md'); return a ? [a[0] + cv.left, a[1] + cv.top] : null; });
  console.log('2022-10 on screen', JSON.stringify(pt));
  if (pt && pt[0] > 560) { await page.mouse.click(pt[0], pt[1]); await sleep(2500); await where('Calendar/Days/x/2022/2022-10.md', 'map click'); await shot('fr-3'); }
  await page.locator('.ivm #q').fill('Pace Layers'); await sleep(700); await page.keyboard.press('Enter'); await sleep(3000);
  await where('Atlas/Things/Pace Layers.md', 'search'); await shot('fr-4');
  console.log('errors:', errs.join(' | ') || 'none');
};
