// Phone: tap Find a note, then the keyboard takes half the screen
module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.emulateMobile && app.emulateMobile(true)); await sleep(4000);
  await page.evaluate(async () => { if (!app.plugins.plugins['ideaverse-maps']) await app.plugins.enablePlugin('ideaverse-maps'); }); await sleep(1000);
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open'));
  await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500); await shot('ms-1');
  const dump = () => page.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return s + ' none'; const b = e.getBoundingClientRect(); return `${s} y${Math.round(b.top)} h${Math.round(b.height)} st${e.scrollTop}`; };
    return [r('.ivm-host'), r('.ivm'), r('.ivm .app'), r('.ivm header'), r('.ivm main'), r('.ivm #q')].join(' | '); });
  console.log('before:', await dump());
  await page.locator('.ivm #q').first().tap().catch(() => page.locator('.ivm #q').first().click()); await sleep(500);
  const cdp = await page.context().newCDPSession(page); const wh = await page.evaluate(() => [innerWidth, innerHeight]); await cdp.send('Emulation.setDeviceMetricsOverride', { width: wh[0], height: Math.round(wh[1]*.55), deviceScaleFactor: 1, mobile: false }); await sleep(1200);
  console.log('after:', await dump()); await shot('ms-kb');
  await page.keyboard.type('home'); await sleep(800); await shot('ms-typed');
  console.log('q value:', await page.locator('.ivm #q').first().inputValue(), '| active is q:', await page.evaluate(() => document.activeElement && document.activeElement.id));
  await page.evaluate(() => document.querySelector('.ivm #results button[data-i]') && document.querySelector('.ivm #results button[data-i]').dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}))); await sleep(400);
  await cdp.send('Emulation.clearDeviceMetricsOverride'); await sleep(1500); console.log('end:', await dump()); await shot('ms-picked');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
