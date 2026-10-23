// Run real Obsidian (in Xvfb) on a test vault with the plugin installed, then run a scenario and take screenshots.
// usage: node obs.js <vaultDir> <scenario.js> [width height]
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const [vault, scen, Wd = "1500", Ht = "950"] = process.argv.slice(2);
const ROOT = path.resolve(__dirname, '..');                                      // the plugin repo
const OBSIDIAN = process.env.OBSIDIAN || '/tmp/claude-0/obs/obsidian-1.14.4/obsidian';   // an unpacked Obsidian (Linux tarball)
const DATA = process.env.OBS_DATA || path.join(require('os').tmpdir(), 'ivm-obs-data');
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'ivm-shots');
(async () => {
  const plug = path.join(vault, '.obsidian/plugins/ideaverse-maps'); fs.mkdirSync(plug, { recursive: true });
  for (const f of ['main.js', 'manifest.json', 'styles.css']) fs.copyFileSync(path.join(ROOT, f), path.join(plug, f));
  try { fs.unlinkSync(path.join(vault, '.obsidian/workspace.json')); } catch (e) {}
  if (process.env.FRESH) try { fs.unlinkSync(path.join(plug, 'data.json')); } catch (e) {}
  fs.writeFileSync(path.join(vault, '.obsidian/community-plugins.json'), JSON.stringify(['ideaverse-maps']));
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'obsidian.json'), JSON.stringify({ vaults: { t1: { path: vault, ts: Date.now(), open: true } } }));
  const p = spawn(OBSIDIAN, ['--no-sandbox', `--user-data-dir=${DATA}`, ...(process.env.GPU ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--disable-gpu']), '--remote-debugging-port=9333', `--window-size=${Wd},${Ht}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', d => log += d); p.stderr.on('data', d => log += d);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let b; for (let i = 0; i < 40; i++) { await sleep(500); try { b = await chromium.connectOverCDP('http://127.0.0.1:9333'); break; } catch (e) {} }
  let page; for (let i = 0; i < 40; i++) { page = b.contexts().flatMap(c => c.pages()).find(pg => pg.url().includes('index.html')); if (page) break; await sleep(500); }
  const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await sleep(1500);
  for (const t of ['Trust author and enable plugins']) { const b = page.getByText(t); if (await b.count()) await b.first().click(); }
  await page.waitForFunction(() => window.app && app.workspace && app.workspace.layoutReady, null, { timeout: 30000 });
  await page.evaluate(([w, h]) => { try { const r = require('@electron/remote'); r.getCurrentWindow().setSize(w, h); } catch (e) { try { require('electron').remote.getCurrentWindow().setSize(w, h); } catch (e2) {} } }, [+Wd, +Ht]);
  await page.evaluate(() => { const l = app.workspace.leftSplit; if (l && !l.collapsed) l.collapse(); });
  await page.evaluate(async () => { if (!app.plugins.isEnabled()) await app.plugins.setEnable(true); if (!app.plugins.plugins['ideaverse-maps']) await app.plugins.enablePluginAndSave('ideaverse-maps'); });
  await sleep(500);
  const shot = async name => { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); console.log('shot', name); };
  fs.mkdirSync(SHOTS, { recursive: true });
  try { await require(path.resolve(scen))({ page, sleep, shot, log: () => log }); }
  catch (e) { console.log('SCENARIO ERROR', e.message); await shot('error'); }
  console.log('console:', errs.slice(0, 20).join('\n'));
  p.kill('SIGKILL'); process.exit(0);
})();
