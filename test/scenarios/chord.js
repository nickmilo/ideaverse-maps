// Chord (experimental, under ⋯ → Experimental → Sketches → Unfinished): every note on a ring by kind, links across the middle
module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  const q = s => page.locator('.ivm ' + s).first();
  const D = 'app.workspace.getLeavesOfType("ideaverse-maps")[0].view.debug';
  await q('#vmore').click(); await sleep(300);
  for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); }
  await q('#gochord').click(); await sleep(2500); await shot('chord');
  console.log('view', await page.evaluate(() => document.querySelector('.ivm').dataset.view), '| chord tab hidden', !(await q('#vseg button[data-v="chord"]').isVisible()));
  const lh = await page.evaluate(new Function(`return ${D}.__ivLHall()`)); console.log('labels', lh.length);
  if (lh.length) { await page.mouse.click(lh[0][0] + 5, lh[0][1] + 6); await sleep(1500); await shot('chord-note'); }
  await page.evaluate(new Function(D + '.__ivSense.set(Math.round(' + D + '.__ivSense.steps() * .6))')); await sleep(1800); await shot('chord-lapse');
  // Chord Sphere: outside arcs, then inside arcs
  const open = async id => { await q('#vmore').click(); await sleep(300); for (const d of await page.locator('.ivm #vmorepop details').all()) if (!(await d.evaluate(e => e.open))) { await d.locator(':scope > summary').click(); await sleep(150); } await q(id).click(); await sleep(2500); };
  await page.evaluate(() => document.querySelector('.ivm #tlall').click()); await sleep(500);
  await open('#gocso'); await shot('csph-out');
  const b = await q('canvas').boundingBox(); await page.mouse.move(b.x + b.width*.5, b.y + b.height*.5); await page.mouse.down(); await page.mouse.move(b.x + b.width*.5 + 250, b.y + b.height*.5 + 80, { steps: 10 }); await page.mouse.up(); await sleep(600); await shot('csph-out-turned');
  const lh2 = await page.evaluate(new Function(`return ${D}.__ivLHall()`)); console.log('sphere labels', lh2.length);
  if (lh2.length) { await page.mouse.click(lh2[0][0] + 5, lh2[0][1] + 6); await sleep(1500); await shot('csph-out-note'); }
  await open('#gocsi'); await shot('csph-in');
  console.log('dome attr', await page.evaluate(() => document.querySelector('.ivm').dataset.dome));
  // Drift on the sphere, and on 3D Starfield
  await open('#gocso'); await sleep(500);
  console.log('drift bar on sphere:', await q('#driftbar').isVisible());
  const yaw = () => page.evaluate(() => { const r = document.querySelector('.ivm'); return JSON.parse(app.plugins.plugins['ideaverse-maps'].data.state['iv-cscam'] ? JSON.stringify(app.plugins.plugins['ideaverse-maps'].data.state['iv-cscam']) : 'null'); });
  await q('#dplay').click(); await sleep(3000); await shot('csph-drift'); await q('#dplay').click(); await sleep(400);
  console.log('after drift, saved angle:', JSON.stringify(await yaw()));
  await q('#vseg button[data-v="stars"]').click(); await sleep(2000);
  console.log('drift bar on 2D Starfield:', await q('#driftbar').isVisible());
  await page.evaluate(() => document.querySelector('.ivm input[name="s3d"][value="3d"]').click()); await sleep(2500);
  console.log('drift bar on 3D Starfield:', await q('#driftbar').isVisible());
};